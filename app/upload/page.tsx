"use client"

import { useState, useRef } from "react"
import * as THREE from "three"
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
// @ts-ignore
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrderStore } from '@/lib/store'
import { formatTimeFull, fitsInBuildVolume, BUILD_MAX, calculate } from '@/lib/priceCalculator'
import type { Shipping, Material, InfillLevel, LayerHeight } from '@/lib/priceCalculator'
import {
  UploadCloud, X, FileText, Plus, Minus, ChevronRight, ChevronLeft,
  Check, AlertTriangle, Loader2, Truck, Store,
} from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg:        '#0d0d0f',
  surface:   '#18181c',
  surface2:  '#222228',
  border:    'rgba(255,255,255,0.08)',
  accent:    '#5b8fff',
  accentDim: '#0e1a33',
  text:      '#f0f0f0',
  muted:     'rgba(255,255,255,0.4)',
  green:     '#22c55e',
} as const

// ─── Constants ────────────────────────────────────────────────────────────────

const MATERIALS: { id: Material; label: string; hint: string; dot: string }[] = [
  { id: 'PLA',         label: 'PLA',          hint: 'Best for prototypes', dot: '#3b82f6' },
  { id: 'PETG',        label: 'PETG',         hint: 'Flexible & durable',  dot: '#8b5cf6' },
  { id: 'ABS',         label: 'ABS',          hint: 'Heat resistant',      dot: '#f59e0b' },
  { id: 'ASA',         label: 'ASA',          hint: 'UV resistant',        dot: '#10b981' },
  { id: 'TPU',         label: 'TPU',          hint: 'Rubber-like flex',    dot: '#ec4899' },
  { id: 'CarbonFiber', label: 'Carbon Fiber', hint: 'Ultra strong',        dot: '#94a3b8' },
]

const COLOR_SWATCHES = [
  { id: 'white',  hex: '#ffffff' },
  { id: 'black',  hex: '#1f1f1f' },
  { id: 'grey',   hex: '#808080' },
  { id: 'red',    hex: '#ef4444' },
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'green',  hex: '#22c55e' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'orange', hex: '#f97316' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'silver', hex: '#c0c0c0' },
]

const INFILL_OPTIONS: { v: InfillLevel; label: string; pct: string }[] = [
  { v: 10, label: 'Light',      pct: '10%' },
  { v: 25, label: 'Normal',     pct: '25%' },
  { v: 50, label: 'Strong',     pct: '50%' },
  { v: 80, label: 'Very Strong', pct: '80%' },
]

const LAYER_OPTIONS: { v: LayerHeight; label: string; desc: string }[] = [
  { v: 0.08, label: 'Fine',   desc: '0.08 mm' },
  { v: 0.16, label: 'Normal', desc: '0.16 mm' },
  { v: 0.24, label: 'Coarse', desc: '0.24 mm' },
]

const STEPS = ['ไฟล์ & จำนวน', 'วัสดุ & ตั้งค่า', 'จัดส่ง & ยืนยัน']

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelFile {
  id: string
  name: string
  url: string
  s3Key?: string
  volumeCm3: number
  dimensions: { x: number; y: number; z: number }
  originalDimensions: { x: number; y: number; z: number }
  originalVolumeCm3: number
  quantity: number
  uploading: boolean
  error?: boolean
  oversize?: boolean
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WizardPage() {
  const router = useRouter()
  const setEstimateData = useOrderStore(s => s.setEstimateData)

  const [step,       setStep]       = useState(1)
  const [maxStep,    setMaxStep]    = useState(1)
  const [models,     setModels]     = useState<ModelFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [material,    setMaterial]    = useState<Material>('PLA')
  const [colorId,     setColorId]     = useState('white')
  const [infill,      setInfill]      = useState<InfillLevel>(25)
  const [layerHeight, setLayerHeight] = useState<LayerHeight>(0.16)
  const [scale,       setScale]       = useState(100)
  const [shipping,    setShipping]    = useState<Shipping>('pickup')

  // ── Derived values ──────────────────────────────────────────────────────────

  const primary = models[0]
  const totalQty = models.reduce((a, m) => a + m.quantity, 0)

  const scaleFactor = scale / 100
  const scaledDims = primary
    ? {
        x: primary.originalDimensions.x * scaleFactor,
        y: primary.originalDimensions.y * scaleFactor,
        z: primary.originalDimensions.z * scaleFactor,
      }
    : { x: 0, y: 0, z: 0 }

  const scaledVolume = primary ? primary.originalVolumeCm3 * Math.pow(scaleFactor, 3) : 0

  const estimate = (() => {
    if (!primary || primary.uploading || primary.error || primary.oversize || primary.originalVolumeCm3 === 0) return null
    try {
      return calculate({
        volumeCm3:   scaledVolume,
        dimensions:  scaledDims,
        technology:  'FDM',
        material,
        infill,
        layerHeight,
        quantity:    totalQty,
        shipping,
      })
    } catch { return null }
  })()

  const canProceed = step === 1
    ? models.length > 0 && !models.some(m => m.uploading || m.error || m.oversize)
    : true

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToStep = (n: number) => {
    if (n <= maxStep) { setStep(n) }
  }

  const nextStep = () => {
    if (!canProceed) return
    const next = Math.min(3, step + 1)
    setStep(next)
    setMaxStep(p => Math.max(p, next))
  }

  const prevStep = () => setStep(s => Math.max(1, s - 1))

  const handleOrder = () => {
    setEstimateData({ models, technology: 'FDM', infill, layerHeight, result: estimate })
    router.push('/quote')
  }

  // ── File handling ───────────────────────────────────────────────────────────

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newModels: ModelFile[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: URL.createObjectURL(file),
      volumeCm3: 0, dimensions: { x: 0, y: 0, z: 0 },
      originalDimensions: { x: 0, y: 0, z: 0 },
      originalVolumeCm3: 0, quantity: 1, uploading: true,
    }))
    setModels(prev => [...prev, ...newModels])

    await Promise.all(fileArray.map(async (file, idx) => {
      const modelId = newModels[idx].id
      try {
        const url = URL.createObjectURL(file)
        const is3mf = file.name.toLowerCase().endsWith('.3mf')
        let volumeCm3 = 0
        let dims = { x: 0, y: 0, z: 0 }

        if (is3mf) {
          const group = await new Promise<THREE.Group>((res, rej) =>
            new (ThreeMFLoader as any)().load(url, res, undefined, rej)
          )
          const box = new THREE.Box3().setFromObject(group)
          const size = new THREE.Vector3(); box.getSize(size)
          volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000
          dims = { x: size.x, y: size.y, z: size.z }
        } else {
          const geo = await new Promise<THREE.BufferGeometry>(res =>
            new STLLoader().load(url, res)
          )
          geo.computeBoundingBox()
          const size = new THREE.Vector3(); geo.boundingBox!.getSize(size)
          volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000
          dims = { x: size.x, y: size.y, z: size.z }
        }

        const oversize = !fitsInBuildVolume(dims)
        const pRes  = await fetch('/api/upload/presigned', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, fileType: 'application/octet-stream' }),
        })
        const { url: uploadUrl, key } = await pRes.json()
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } })

        setModels(prev => prev.map(m => m.id === modelId ? {
          ...m, volumeCm3, dimensions: dims,
          originalDimensions: dims, originalVolumeCm3: volumeCm3,
          s3Key: key, uploading: false, oversize,
        } : m))
      } catch {
        setModels(prev => prev.map(m => m.id === modelId ? { ...m, uploading: false, error: true } : m))
      }
    }))
  }

  const removeModel = (id: string) => setModels(prev => prev.filter(m => m.id !== id))
  const updateQty   = (id: string, qty: number) =>
    setModels(prev => prev.map(m => m.id === id ? { ...m, quantity: Math.max(1, qty) } : m))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen"
      style={{ background: T.bg, color: T.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}
      onDragOver={e  => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
      onDrop={e      => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files) }}
    >

      {/* Range + number input polish */}
      <style>{`
        .wb-range { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; background: ${T.surface2}; }
        .wb-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.accent}; border: 2px solid ${T.surface}; box-shadow: 0 0 0 3px ${T.accent}33; cursor: pointer; }
        .wb-range::-moz-range-thumb     { width: 16px; height: 16px; border-radius: 50%; background: ${T.accent}; border: 2px solid ${T.surface}; cursor: pointer; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        .wb-card-btn { transition: border-color .15s, background .15s; }
        .wb-card-btn:hover { opacity: .9; }
      `}</style>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4"
        style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <Link href="/" className="text-[18px] font-semibold tracking-tight select-none">
          PB3D<span style={{ color: T.accent }}>HUB</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-60"
          style={{ color: T.muted }}>
          <X size={14} /> ออก
        </Link>
      </header>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="px-6 py-5" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center max-w-[720px] mx-auto">
          {STEPS.map((label, i) => {
            const n    = i + 1
            const done = n < step
            const curr = n === step
            const reachable = n <= maxStep
            return (
              <div key={n} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1' : 'none' }}>
                <button
                  onClick={() => goToStep(n)}
                  className="flex items-center gap-2.5"
                  style={{ cursor: reachable ? 'pointer' : 'default', opacity: reachable ? 1 : 0.38 }}
                >
                  {/* Circle */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                    style={{
                      background: done ? T.green : curr ? T.accent : T.surface2,
                      color:      '#fff',
                      border:     curr ? `1.5px solid ${T.accent}` : 'none',
                    }}>
                    {done ? <Check size={13} strokeWidth={2.5} /> : n}
                  </div>
                  {/* Label */}
                  <span className="text-[13px] hidden sm:block"
                    style={{ color: curr ? T.text : T.muted, fontWeight: curr ? 500 : 400 }}>
                    {label}
                  </span>
                </button>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-4" style={{ background: T.border }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex gap-5 p-6 max-w-[1160px] mx-auto items-start">

        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ────────────────── STEP 1: Files ────────────────── */}
          {step === 1 && (
            <>
              <h2 className="text-[20px] font-medium">อัปโหลดไฟล์</h2>

              {/* Drop zone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed text-left transition-all"
                style={{
                  borderColor: isDragging ? T.accent : T.border,
                  background:  isDragging ? T.accentDim : T.surface,
                }}>
                <div className="flex flex-col items-center gap-4 py-10 px-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                    <UploadCloud size={22} style={{ color: isDragging ? T.accent : T.muted }} />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-medium" style={{ color: isDragging ? T.accent : T.text }}>
                      {isDragging ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['STL', '3MF'].map(f => (
                      <span key={f} className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider"
                        style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                        {f}
                      </span>
                    ))}
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                      MAX 100MB
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                      MAX {BUILD_MAX.x}×{BUILD_MAX.y}×{BUILD_MAX.z}MM
                    </span>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".stl,.3mf"
                  onChange={e => e.target.files && handleFileUpload(e.target.files)} className="hidden" />
              </button>

              {/* File cards */}
              <div className="space-y-3">
                {models.map(model => (
                  <div key={model.id} className="rounded-xl p-4 flex items-center gap-4"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                      {model.uploading   ? <Loader2 size={18} className="animate-spin" style={{ color: T.accent }} />
                       : model.error    ? <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                       : model.oversize ? <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                       : <FileText size={18} style={{ color: T.muted }} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] truncate">{model.name}</p>
                      <div className="mt-0.5">
                        {model.error
                          ? <p className="text-[12px]" style={{ color: '#ef4444' }}>อัปโหลดล้มเหลว</p>
                          : model.oversize
                          ? <p className="text-[12px]" style={{ color: '#f59e0b' }}>เกินขนาด Build Volume ({BUILD_MAX.x}×{BUILD_MAX.y}×{BUILD_MAX.z}mm)</p>
                          : model.uploading
                          ? <p className="text-[12px]" style={{ color: T.muted }}>กำลังวิเคราะห์…</p>
                          : (
                            <div className="flex items-center gap-2">
                              <p className="text-[12px]" style={{ color: T.muted }}>
                                {model.dimensions.x.toFixed(0)}×{model.dimensions.y.toFixed(0)}×{model.dimensions.z.toFixed(0)} mm
                                <span className="mx-1.5" style={{ color: T.border }}>·</span>
                                {model.volumeCm3.toFixed(1)} cm³
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ background: 'rgba(34,197,94,0.12)', color: T.green, border: '1px solid rgba(34,197,94,0.2)' }}>
                                พร้อมพิมพ์
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Qty stepper */}
                    {!model.uploading && !model.error && !model.oversize && (
                      <div className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                        style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                        <button onClick={() => updateQty(model.id, model.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center transition-opacity hover:opacity-100"
                          style={{ color: T.muted }}>
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-[14px] font-semibold">{model.quantity}</span>
                        <button onClick={() => updateQty(model.id, model.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center transition-opacity hover:opacity-100"
                          style={{ color: T.muted }}>
                          <Plus size={12} />
                        </button>
                      </div>
                    )}

                    {/* Remove */}
                    <button onClick={() => removeModel(model.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                      style={{ color: T.muted }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add more */}
              {models.length > 0 && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 rounded-xl border-2 border-dashed text-[13px] font-medium flex items-center justify-center gap-2 transition-all hover:opacity-70"
                  style={{ borderColor: T.border, color: T.muted }}>
                  <Plus size={14} /> เพิ่มไฟล์อีก
                </button>
              )}
            </>
          )}

          {/* ─────────────── STEP 2: Material & Settings ─────────── */}
          {step === 2 && (
            <>
              <h2 className="text-[20px] font-medium">วัสดุ & ตั้งค่า</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left: Material + Color */}
                <div className="space-y-5">

                  {/* Material grid 3×2 */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>วัสดุ</p>
                    <div className="grid grid-cols-3 gap-2">
                      {MATERIALS.map(m => {
                        const sel = material === m.id
                        return (
                          <button key={m.id} onClick={() => setMaterial(m.id)}
                            className="wb-card-btn p-3 rounded-xl text-left"
                            style={{
                              background: sel ? T.accentDim : T.surface,
                              border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                            }}>
                            <div className="w-3 h-3 rounded-full mb-2" style={{ background: m.dot }} />
                            <p className="text-[13px] font-medium leading-tight">{m.label}</p>
                            <p className="text-[11px] mt-0.5 leading-tight" style={{ color: T.muted }}>{m.hint}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Color swatches */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>สี</p>
                    <div className="flex flex-wrap gap-2.5">
                      {COLOR_SWATCHES.map(c => (
                        <button key={c.id} onClick={() => setColorId(c.id)}
                          title={c.id}
                          className="w-7 h-7 rounded-full transition-transform"
                          style={{
                            background:  c.hex,
                            border:      colorId === c.id ? `2.5px solid ${T.accent}` : `1.5px solid ${T.border}`,
                            boxShadow:   colorId === c.id ? `0 0 0 2px ${T.surface}, 0 0 0 4px ${T.accent}` : 'none',
                            transform:   colorId === c.id ? 'scale(1.18)' : 'scale(1)',
                          }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Infill + Layer + Scale */}
                <div className="space-y-5">

                  {/* Infill 2×2 */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Infill</p>
                    <div className="grid grid-cols-2 gap-2">
                      {INFILL_OPTIONS.map(opt => {
                        const sel = infill === opt.v
                        return (
                          <button key={opt.v} onClick={() => setInfill(opt.v)}
                            className="wb-card-btn p-3 rounded-xl text-left"
                            style={{
                              background: sel ? T.accentDim : T.surface,
                              border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                            }}>
                            <p className="text-[13px] font-medium">{opt.label}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{opt.pct}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Layer height 3-col */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Layer Height</p>
                    <div className="grid grid-cols-3 gap-2">
                      {LAYER_OPTIONS.map(opt => {
                        const sel = layerHeight === opt.v
                        return (
                          <button key={opt.v} onClick={() => setLayerHeight(opt.v)}
                            className="wb-card-btn p-3 rounded-xl text-center"
                            style={{
                              background: sel ? T.accentDim : T.surface,
                              border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                            }}>
                            <p className="text-[13px] font-medium">{opt.label}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{opt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scale slider */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>ขนาดโมเดล</p>
                    <div className="rounded-xl p-4 space-y-3.5"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                      {/* Input row */}
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px]" style={{ color: T.muted }}>
                          {primary && scaledDims.x > 0
                            ? `${scaledDims.x.toFixed(0)}×${scaledDims.y.toFixed(0)}×${scaledDims.z.toFixed(0)} mm`
                            : '— × — × — mm'}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min={50} max={200} step={1} value={scale}
                            onChange={e => setScale(Math.min(200, Math.max(50, Number(e.target.value))))}
                            className="w-16 text-center text-[14px] font-semibold rounded-lg py-1.5 focus:outline-none"
                            style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text }}
                          />
                          <span className="text-[13px]" style={{ color: T.muted }}>%</span>
                        </div>
                      </div>
                      {/* Slider */}
                      <input type="range" min={50} max={200} step={1} value={scale}
                        onChange={e => setScale(Number(e.target.value))}
                        className="wb-range" />
                      {/* Labels */}
                      <div className="flex justify-between text-[10px]" style={{ color: T.muted }}>
                        <span>50%</span><span>100%</span><span>150%</span><span>200%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ──────────── STEP 3: Delivery & Confirm ────────────── */}
          {step === 3 && (
            <>
              <h2 className="text-[20px] font-medium">จัดส่ง & ยืนยัน</h2>

              {/* Delivery 2-col */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>วิธีรับสินค้า</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'pickup' as Shipping, icon: Store,  label: 'รับเอง',        sub: 'ฟรี',   subColor: T.green },
                    { id: 'postal' as Shipping, icon: Truck,  label: 'ส่งไปรษณีย์',  sub: '+฿45',  subColor: T.muted },
                  ] as const).map(opt => {
                    const sel = shipping === opt.id
                    const Icon = opt.icon
                    return (
                      <button key={opt.id} onClick={() => setShipping(opt.id)}
                        className="wb-card-btn p-5 rounded-xl text-left"
                        style={{
                          background: sel ? T.accentDim : T.surface,
                          border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                        }}>
                        <Icon size={22} className="mb-3" style={{ color: sel ? T.accent : T.muted }} />
                        <p className="font-semibold text-[15px]">{opt.label}</p>
                        <p className="text-[13px] mt-1" style={{ color: opt.subColor }}>{opt.sub}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Order summary */}
              <div className="rounded-xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: T.muted }}>สรุปคำสั่งซื้อ</p>
                <div className="space-y-0">
                  {[
                    { label: 'จำนวน',       value: `${totalQty} ชิ้น` },
                    { label: 'วัสดุ',        value: MATERIALS.find(m => m.id === material)?.label ?? material },
                    { label: 'Infill',       value: `${infill}%` },
                    { label: 'Layer Height', value: `${layerHeight} mm` },
                    { label: 'ขนาด (Scale)', value: `${scale}%` },
                    { label: 'จัดส่ง',       value: shipping === 'pickup' ? 'รับเอง (ฟรี)' : 'ไปรษณีย์ (+฿45)' },
                  ].map((row, i, arr) => (
                    <div key={row.label}
                      className="flex justify-between items-center py-3"
                      style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                      <span className="text-[13px]" style={{ color: T.muted }}>{row.label}</span>
                      <span className="text-[13px] font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3 CTA (in main content, not just sidebar) */}
              <button onClick={handleOrder}
                className="w-full py-4 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] hover:opacity-90"
                style={{ background: T.accent, color: '#fff' }}>
                ยืนยันสั่งซื้อ →
              </button>
            </>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-[272px] shrink-0 sticky top-6 space-y-3">

          {/* Stats row */}
          <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>ข้อมูลโมเดล</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {([
                { label: 'Volume',  val: scaledVolume > 0 ? `${scaledVolume.toFixed(0)}` : '—', unit: 'cm³' },
                { label: 'Weight',  val: estimate ? `${estimate.weightG.toFixed(0)}` : '—',    unit: 'g'   },
                { label: 'Print',   val: estimate ? formatTimeFull(estimate.printTimeSec) : '—', unit: '' },
              ] as const).map(s => (
                <div key={s.label} className="rounded-lg p-2.5" style={{ background: T.surface2 }}>
                  <p className="text-[14px] font-semibold leading-tight">
                    {s.val}
                    {s.unit && <span className="text-[10px] ml-0.5" style={{ color: T.muted }}>{s.unit}</span>}
                  </p>
                  <p className="text-[10px] mt-1 uppercase tracking-wider" style={{ color: T.muted }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quote card — white */}
          <div className="rounded-xl p-5" style={{ background: '#fff', color: '#111' }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>
              Live Quote
            </p>
            <p className="text-[38px] font-bold leading-none tracking-tight mb-4">
              {estimate ? `฿${estimate.totalPrice.toLocaleString()}` : '—'}
            </p>
            <div className="space-y-2 border-t border-gray-100 pt-3">
              {[
                { label: `ชิ้นงาน (${totalQty} pcs)`, val: estimate ? `฿${estimate.subtotal.toLocaleString()}` : '—', color: '#111' },
                { label: 'จัดส่ง', val: estimate ? (estimate.shippingCost === 0 ? 'ฟรี' : `฿${estimate.shippingCost}`) : '—',
                  color: estimate?.shippingCost === 0 ? '#16a34a' : '#111' },
                { label: 'น้ำหนัก', val: estimate ? `${estimate.weightG.toFixed(0)}g` : '—',  color: '#111' },
                { label: 'เวลาพิมพ์', val: estimate ? formatTimeFull(estimate.printTimeSec) : '—', color: '#111' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-[12px]" style={{ color: '#9ca3af' }}>{row.label}</span>
                  <span className="text-[12px] font-medium" style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Nav buttons */}
          <div className="space-y-2">
            {/* Next (steps 1 & 2) */}
            {step < 3 && (
              <button onClick={nextStep} disabled={!canProceed}
                className="w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-35"
                style={{ background: T.accent, color: '#fff' }}>
                ถัดไป <ChevronRight size={16} />
              </button>
            )}
            {/* Order CTA (step 3 sidebar) */}
            {step === 3 && (
              <button onClick={handleOrder}
                className="w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90"
                style={{ background: T.accent, color: '#fff' }}>
                ยืนยันสั่งซื้อ →
              </button>
            )}
            {/* Back (steps 2 & 3) */}
            {step > 1 && (
              <button onClick={prevStep}
                className="w-full py-3 rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 transition-all hover:opacity-70"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}>
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
