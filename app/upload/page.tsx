"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import * as THREE from "three"
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
// @ts-ignore
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader'
import { Canvas, useLoader, useThree } from "@react-three/fiber"
import { OrbitControls, Stage, Center } from "@react-three/drei"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrderStore } from '@/lib/store'
import { formatTimeFull, fitsInBuildVolume, BUILD_MAX, calculate } from '@/lib/priceCalculator'
import type { Shipping, Material, InfillLevel, LayerHeight } from '@/lib/priceCalculator'
import {
  UploadCloud, X, FileText, Plus, Minus, ChevronRight, ChevronLeft,
  Check, AlertTriangle, Loader2, Truck, Store, ZoomIn, ZoomOut, Lock, Unlock,
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
  { id: 'PLA',         label: 'PLA',          hint: 'โปรโตไทป์',    dot: '#3b82f6' },
  { id: 'PETG',        label: 'PETG',         hint: 'ยืดหยุ่น',      dot: '#8b5cf6' },
  { id: 'ABS',         label: 'ABS',          hint: 'ทนความร้อน',   dot: '#f59e0b' },
  { id: 'ASA',         label: 'ASA',          hint: 'กันแดด UV',    dot: '#10b981' },
  { id: 'TPU',         label: 'TPU',          hint: 'ยางยืด',        dot: '#ec4899' },
  { id: 'CarbonFiber', label: 'Carbon Fiber', hint: 'แข็งแรงสูงสุด', dot: '#94a3b8' },
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

const STEPS = ['อัปโหลด & ตั้งค่า', 'จัดส่ง & ยืนยัน']

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubPiece {
  id: string
  volumeCm3: number
  dimensions: { x: number; y: number; z: number }
}

interface ModelFile {
  id: string
  name: string
  url: string
  s3Key?: string
  originalDimensions: { x: number; y: number; z: number }
  originalVolumeCm3: number
  quantity: number
  uploading: boolean
  error?: boolean
  subPieces?: SubPiece[]
  autoSplit?: boolean
}

interface CustomDims { x: number; y: number; z: number }

const AUTO_SPLIT_THRESHOLD = 250 // mm

// ─── Three.js sub-components ──────────────────────────────────────────────────

function ModelSTL({ url, scale }: { url: string; scale: [number, number, number] }) {
  const geo = useLoader(STLLoader, url)
  return (
    <mesh geometry={geo} castShadow receiveShadow scale={scale}>
      <meshStandardMaterial color="#b0b4c0" metalness={0.25} roughness={0.55} />
    </mesh>
  )
}

function Model3MF({ url, scale }: { url: string; scale: [number, number, number] }) {
  const group = useLoader(ThreeMFLoader as any, url)
  return <primitive object={group} scale={scale} />
}

function AxesLabels({ size }: { size: number }) {
  return (
    <group>
      <primitive object={new THREE.AxesHelper(size)} />
    </group>
  )
}

// Camera zoom controller via imperative ref
function ZoomController({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const { controls } = useThree()
  useEffect(() => { controlsRef.current = controls }, [controls, controlsRef])
  return null
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WizardPage() {
  const router = useRouter()
  const setEstimateData = useOrderStore(s => s.setEstimateData)
  const orbitRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step,            setStep]           = useState(1)
  const [maxStep,         setMaxStep]        = useState(1)
  const [models,          setModels]         = useState<ModelFile[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [isDragging,      setIsDragging]     = useState(false)

  // Print settings
  const [material,    setMaterial]    = useState<Material>('PLA')
  const [colorId,     setColorId]     = useState('white')
  const [infill,      setInfill]      = useState<InfillLevel>(25)
  const [layerHeight, setLayerHeight] = useState<LayerHeight>(0.16)
  const [shipping,    setShipping]    = useState<Shipping>('pickup')

  // Dimension / scale state
  const [customDims, setCustomDims] = useState<CustomDims>({ x: 0, y: 0, z: 0 })
  const [lockRatio,  setLockRatio]  = useState(true)

  // Reset customDims when primary model changes
  const primary = models.find(m => m.id === selectedModelId) ?? models[0]
  useEffect(() => {
    if (primary?.originalDimensions && primary.originalDimensions.x > 0) {
      setCustomDims({ ...primary.originalDimensions })
    }
  // re-run when id changes OR when dims arrive (async after parse)
  }, [primary?.id, primary?.originalDimensions?.x])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scale factors (non-uniform allowed) ────────────────────────────────────
  const orig = primary?.originalDimensions ?? { x: 1, y: 1, z: 1 }
  const sx = orig.x > 0 ? customDims.x / orig.x : 1
  const sy = orig.y > 0 ? customDims.y / orig.y : 1
  const sz = orig.z > 0 ? customDims.z / orig.z : 1
  const meshScale: [number, number, number] = [sx, sy, sz]

  const scaledVolume = (primary?.originalVolumeCm3 ?? 0) * sx * sy * sz
  const totalQty     = models.reduce((a, m) => a + m.quantity, 0)
  // Auto-split models are not oversize — pieces are estimated individually
  const isOversize   = primary?.autoSplit ? false : !fitsInBuildVolume(customDims)

  const estimate = (() => {
    if (!primary || primary.uploading || primary.error || primary.originalVolumeCm3 === 0 || isOversize) return null
    try {
      if (primary.autoSplit && primary.subPieces && primary.subPieces.length > 0) {
        // Estimate each sub-piece separately, apply global scale factors, sum up
        const pieceCalcs = primary.subPieces.map(p => calculate({
          volumeCm3: p.volumeCm3 * sx * sy * sz,
          dimensions: { x: p.dimensions.x * sx, y: p.dimensions.y * sy, z: p.dimensions.z * sz },
          technology: 'FDM', material, infill, layerHeight,
          quantity: 1,
          shipping: 'pickup', // no per-piece shipping
        }))
        const SHIPPING_FEE = shipping === 'pickup' ? 0 : 45
        const subtotal = pieceCalcs.reduce((a, e) => a + e.pricePerPc, 0) * totalQty
        return {
          weightG:      pieceCalcs.reduce((a, e) => a + e.weightG, 0) * totalQty,
          printTimeSec: pieceCalcs.reduce((a, e) => a + e.printTimeSec, 0) * totalQty,
          printTimeMin: pieceCalcs.reduce((a, e) => a + (e as any).printTimeMin, 0) * totalQty,
          materialCost: pieceCalcs.reduce((a, e) => a + e.materialCost, 0) * totalQty,
          machineCost:  pieceCalcs.reduce((a, e) => a + e.machineCost,  0) * totalQty,
          pricePerPc:   pieceCalcs.reduce((a, e) => a + e.pricePerPc,   0),
          subtotal,
          shippingCost: SHIPPING_FEE,
          totalPrice:   subtotal + SHIPPING_FEE,
        } as ReturnType<typeof calculate>
      }
      return calculate({
        volumeCm3: scaledVolume,
        dimensions: customDims,
        technology: 'FDM',
        material, infill, layerHeight,
        quantity: totalQty,
        shipping,
      })
    } catch { return null }
  })()

  const canProceed = step === 1
    ? models.length > 0 && !models.some(m => m.uploading || m.error) && !isOversize
    : true

  // ── Dimension input handler ─────────────────────────────────────────────────
  const handleDimChange = (axis: 'x' | 'y' | 'z', val: number) => {
    const v = Math.max(0.1, val)
    if (lockRatio && orig[axis] > 0) {
      const ratio = v / orig[axis]
      setCustomDims({ x: orig.x * ratio, y: orig.y * ratio, z: orig.z * ratio })
    } else {
      setCustomDims(prev => ({ ...prev, [axis]: v }))
    }
  }

  // ── Zoom controls ───────────────────────────────────────────────────────────
  const zoomIn  = useCallback(() => {
    if (orbitRef.current) { orbitRef.current.dollyIn(1.3);  orbitRef.current.update() }
  }, [])
  const zoomOut = useCallback(() => {
    if (orbitRef.current) { orbitRef.current.dollyOut(1.3); orbitRef.current.update() }
  }, [])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToStep = (n: number) => { if (n <= maxStep) setStep(n) }
  const nextStep = () => {
    if (!canProceed) return
    const next = Math.min(2, step + 1)
    setStep(next); setMaxStep(p => Math.max(p, next))
  }
  const prevStep  = () => setStep(s => Math.max(1, s - 1))
  const handleOrder = () => {
    setEstimateData({ models, technology: 'FDM', infill, layerHeight, result: estimate })
    router.push('/quote')
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newModels: ModelFile[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name, url: URL.createObjectURL(file),
      originalDimensions: { x: 0, y: 0, z: 0 },
      originalVolumeCm3: 0, quantity: 1, uploading: true,
    }))
    setModels(prev => [...prev, ...newModels])
    // select first newly added model if none selected
    setSelectedModelId(prev => prev ?? newModels[0]?.id ?? null)

    await Promise.all(fileArray.map(async (file, idx) => {
      const modelId = newModels[idx].id
      try {
        const blobUrl = URL.createObjectURL(file)
        const is3mf   = file.name.toLowerCase().endsWith('.3mf')
        let volumeCm3 = 0, dims = { x: 0, y: 0, z: 0 }

        if (is3mf) {
          const group = await new Promise<THREE.Group>((res, rej) =>
            new (ThreeMFLoader as any)().load(blobUrl, res, undefined, rej)
          )
          const totalSize = new THREE.Vector3()
          new THREE.Box3().setFromObject(group).getSize(totalSize)
          volumeCm3 = Math.abs(totalSize.x * totalSize.y * totalSize.z) / 1000
          dims = { x: totalSize.x, y: totalSize.y, z: totalSize.z }

          // Auto-split: if total BB exceeds threshold and group has multiple meshes
          const meshes: THREE.Mesh[] = []
          group.traverse(obj => { if ((obj as any).isMesh) meshes.push(obj as THREE.Mesh) })

          if (
            meshes.length > 1 &&
            (totalSize.x > AUTO_SPLIT_THRESHOLD || totalSize.y > AUTO_SPLIT_THRESHOLD || totalSize.z > AUTO_SPLIT_THRESHOLD)
          ) {
            const subPieces: SubPiece[] = meshes
              .map((mesh, i) => {
                const sz = new THREE.Vector3()
                new THREE.Box3().setFromObject(mesh).getSize(sz)
                const vol = Math.abs(sz.x * sz.y * sz.z) / 1000
                return { id: `piece-${i}`, volumeCm3: vol, dimensions: { x: sz.x, y: sz.y, z: sz.z } }
              })
              .filter(p => p.volumeCm3 > 0)

            if (subPieces.length > 0) {
              const totalVol = subPieces.reduce((a, p) => a + p.volumeCm3, 0)
              // Use largest piece as representative dims for the primary entry
              const largest = subPieces.reduce((a, b) => b.volumeCm3 > a.volumeCm3 ? b : a)
              setModels(prev => prev.map(m => m.id === modelId ? {
                ...m,
                originalDimensions: largest.dimensions,
                originalVolumeCm3: totalVol,
                s3Key: undefined, uploading: false,
                subPieces, autoSplit: true,
              } : m))
              // upload file in background still (no s3 upload needed for split display, skip s3 for now)
              return
            }
          }
        } else {
          const geo = await new Promise<THREE.BufferGeometry>(res =>
            new STLLoader().load(blobUrl, res)
          )
          geo.computeBoundingBox()
          const size = new THREE.Vector3(); geo.boundingBox!.getSize(size)
          volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000
          dims = { x: size.x, y: size.y, z: size.z }
        }

        const pr = await fetch('/api/upload/presigned', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, fileType: 'application/octet-stream' }),
        })
        const { url: uploadUrl, key } = await pr.json()
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } })

        setModels(prev => prev.map(m => m.id === modelId
          ? { ...m, originalDimensions: dims, originalVolumeCm3: volumeCm3, s3Key: key, uploading: false }
          : m
        ))
      } catch {
        setModels(prev => prev.map(m => m.id === modelId ? { ...m, uploading: false, error: true } : m))
      }
    }))
  }

  const removeModel = (id: string) => setModels(prev => prev.filter(m => m.id !== id))
  const updateQty   = (id: string, qty: number) =>
    setModels(prev => prev.map(m => m.id === id ? { ...m, quantity: Math.max(1, qty) } : m))

  // ── Render ──────────────────────────────────────────────────────────────────

  // Axis size for helper — 30% of longest dimension
  const axisSize = primary
    ? Math.max(orig.x, orig.y, orig.z) * 0.4
    : 40

  return (
    <div
      className="min-h-screen"
      style={{ background: T.bg, color: T.text, fontFamily: 'system-ui,-apple-system,sans-serif' }}
      onDragOver={e  => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
      onDrop={e      => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files) }}
    >
      <style>{`
        .wb-range{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;background:${T.surface2}}
        .wb-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${T.accent};border:2px solid ${T.surface};box-shadow:0 0 0 3px ${T.accent}33;cursor:pointer}
        .wb-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:${T.accent};border:2px solid ${T.surface};cursor:pointer}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        .dim-input{width:100%;text-align:center;font-size:13px;font-weight:600;padding:5px 4px;border-radius:8px;outline:none;background:${T.surface2};border:1px solid ${T.border};color:${T.text};transition:border-color .15s}
        .dim-input:focus{border-color:${T.accent}}
        .wb-btn{transition:opacity .15s,transform .1s}.wb-btn:active{transform:scale(.97)}
      `}</style>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-50"
        style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <Link href="/" className="text-[18px] font-semibold tracking-tight select-none">
          PB3D<span style={{ color: T.accent }}>HUB</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-[13px] hover:opacity-60 transition-opacity"
          style={{ color: T.muted }}>
          <X size={14} /> ออก
        </Link>
      </header>

      {/* ── Progress ── */}
      <div className="px-6 py-4" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center max-w-[480px] mx-auto">
          {STEPS.map((label, i) => {
            const n = i + 1, done = n < step, curr = n === step
            return (
              <div key={n} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <button onClick={() => goToStep(n)} className="flex items-center gap-2.5 wb-btn"
                  style={{ opacity: n <= maxStep ? 1 : 0.35, cursor: n <= maxStep ? 'pointer' : 'default' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
                    style={{ background: done ? T.green : curr ? T.accent : T.surface2, color: '#fff' }}>
                    {done ? <Check size={13} strokeWidth={2.5} /> : n}
                  </div>
                  <span className="text-[13px] hidden sm:block"
                    style={{ color: curr ? T.text : T.muted, fontWeight: curr ? 500 : 400 }}>
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-4" style={{ background: T.border }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex gap-0 max-w-[1400px] mx-auto" style={{ minHeight: 'calc(100vh - 112px)' }}>

        {/* ════════════════ STEP 1 ════════════════ */}
        {step === 1 && (
          <>
            {/* ── Left: Preview + Upload ── */}
            <div className="flex-1 min-w-0 p-5 space-y-4 border-r" style={{ borderColor: T.border }}>

              {/* 3D Preview — large */}
              <div className="relative rounded-2xl overflow-hidden"
                style={{ height: 400, background: 'linear-gradient(135deg,#0f1117 0%,#14161e 100%)', border: `1px solid ${T.border}` }}>

                {primary && !primary.uploading && !primary.error && primary.url ? (
                  <>
                    <Canvas shadows camera={{ position: [120, 100, 120], fov: 40 }}>
                      <Suspense fallback={null}>
                        <Stage intensity={0.5} environment="city" adjustCamera>
                          <Center>
                            {primary.name.toLowerCase().endsWith('.3mf')
                              ? <Model3MF url={primary.url} scale={meshScale} />
                              : <ModelSTL url={primary.url} scale={meshScale} />}
                          </Center>
                        </Stage>
                        <AxesLabels size={axisSize} />
                      </Suspense>
                      <OrbitControls ref={orbitRef} makeDefault autoRotate autoRotateSpeed={0.8} enablePan enableZoom />
                    </Canvas>

                    {/* Zoom buttons */}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                      <button onClick={zoomIn}
                        className="w-9 h-9 rounded-xl flex items-center justify-center wb-btn hover:opacity-80"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: `1px solid ${T.border}`, color: T.text }}>
                        <ZoomIn size={16} />
                      </button>
                      <button onClick={zoomOut}
                        className="w-9 h-9 rounded-xl flex items-center justify-center wb-btn hover:opacity-80"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: `1px solid ${T.border}`, color: T.text }}>
                        <ZoomOut size={16} />
                      </button>
                    </div>

                    {/* Axes legend */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 px-2.5 py-2 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: `1px solid ${T.border}` }}>
                      {[['X', '#ef4444'], ['Y', '#22c55e'], ['Z', '#3b82f6']].map(([ax, col]) => (
                        <div key={ax} className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 rounded-full" style={{ background: col }} />
                          <span className="text-[10px] font-bold" style={{ color: col }}>{ax}</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom info bar */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5 flex items-center justify-between"
                      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                      <p className="text-[11px] font-medium truncate max-w-[60%]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {primary.name}
                      </p>
                      <p className="text-[11px] font-semibold" style={{ color: T.accent }}>
                        {customDims.x.toFixed(1)} × {customDims.y.toFixed(1)} × {customDims.z.toFixed(1)} mm
                      </p>
                    </div>

                    {/* Oversize warning */}
                    {isOversize && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl flex items-center gap-2"
                        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
                        <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                        <p className="text-[12px] font-semibold" style={{ color: '#f59e0b' }}>
                          เกินขนาด Build Volume {BUILD_MAX.x}×{BUILD_MAX.y}×{BUILD_MAX.z} mm
                        </p>
                      </div>
                    )}

                    {/* Auto-split badge */}
                    {primary?.autoSplit && primary.subPieces && (
                      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        style={{ background: 'rgba(91,143,255,0.18)', border: '1px solid rgba(91,143,255,0.4)' }}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M7 1v5M7 8v5M1 7h5M8 7h5" stroke="#5b8fff" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        <span className="text-[11px] font-semibold" style={{ color: T.accent }}>
                          แบ่งอัตโนมัติ {primary.subPieces.length} ชิ้น
                        </span>
                      </div>
                    )}
                  </>
                ) : primary?.uploading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="animate-spin" style={{ color: T.accent }} />
                    <p className="text-[13px]" style={{ color: T.muted }}>กำลังวิเคราะห์โมเดล…</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    {/* Placeholder 3D box visual */}
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" opacity={0.2}>
                      <path d="M36 8 L64 22 L64 50 L36 64 L8 50 L8 22 Z" stroke="white" strokeWidth="1.5" fill="none"/>
                      <path d="M36 8 L36 36 M64 22 L36 36 M8 22 L36 36 M36 36 L36 64" stroke="white" strokeWidth="1" strokeDasharray="3 3"/>
                    </svg>
                    <p className="text-[13px]" style={{ color: T.muted }}>อัปโหลดไฟล์เพื่อดูตัวอย่างโมเดล</p>
                  </div>
                )}
              </div>

              {/* Model thumbnails — shown when 2+ models uploaded */}
              {models.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {models.map(model => {
                    const isSel = (selectedModelId ?? models[0]?.id) === model.id
                    return (
                      <button key={model.id}
                        onClick={() => { setSelectedModelId(model.id) }}
                        className="shrink-0 flex flex-col items-start gap-1.5 p-2.5 rounded-xl wb-btn transition-all"
                        style={{
                          background: isSel ? T.accentDim : T.surface,
                          border:     isSel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                          width: 130,
                        }}>
                        {/* mini canvas or placeholder */}
                        <div className="w-full rounded-lg overflow-hidden relative"
                          style={{ height: 80, background: T.surface2, border: `1px solid ${T.border}` }}>
                          {model.uploading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 size={16} className="animate-spin" style={{ color: T.accent }} />
                            </div>
                          ) : model.error ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                            </div>
                          ) : model.url ? (
                            <Canvas camera={{ position: [80, 60, 80], fov: 50 }}>
                              <Suspense fallback={null}>
                                <Stage intensity={0.5} environment="city" adjustCamera>
                                  <Center>
                                    {model.name.toLowerCase().endsWith('.3mf')
                                      ? <Model3MF url={model.url} scale={[1,1,1]} />
                                      : <ModelSTL url={model.url} scale={[1,1,1]} />}
                                  </Center>
                                </Stage>
                              </Suspense>
                              <OrbitControls makeDefault autoRotate autoRotateSpeed={1.5} enableZoom={false} enablePan={false} />
                            </Canvas>
                          ) : null}
                        </div>
                        <p className="text-[10px] font-semibold leading-tight truncate w-full"
                          style={{ color: isSel ? T.accent : T.text }}>
                          {model.name}
                        </p>
                        {!model.uploading && !model.error && (
                          <p className="text-[9px] leading-tight" style={{ color: T.muted }}>
                            {model.originalDimensions.x.toFixed(0)}×{model.originalDimensions.y.toFixed(0)}×{model.originalDimensions.z.toFixed(0)} mm
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* XYZ Dimension inputs — below preview, always visible when model loaded */}
              {primary && !primary.uploading && !primary.error && primary.originalDimensions.x > 0 && (
                <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>
                      ปรับขนาดโมเดล (mm)
                    </p>
                    <button onClick={() => setLockRatio(p => !p)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg wb-btn text-[11px] font-medium transition-all"
                      style={{
                        background: lockRatio ? T.accentDim : T.surface2,
                        border:     lockRatio ? `1px solid ${T.accent}` : `1px solid ${T.border}`,
                        color:      lockRatio ? T.accent : T.muted,
                      }}>
                      {lockRatio ? <Lock size={11} /> : <Unlock size={11} />}
                      {lockRatio ? 'ล็อกสัดส่วน' : 'อิสระ'}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(['x', 'y', 'z'] as const).map((ax, i) => {
                      const colors = ['#ef4444', '#22c55e', '#3b82f6']
                      const labels = ['X (กว้าง)', 'Y (สูง)', 'Z (ลึก)']
                      return (
                        <div key={ax} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: colors[i] }} />
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: colors[i] }}>
                              {labels[i]}
                            </p>
                          </div>
                          <input
                            type="number"
                            className="dim-input"
                            min={0.1} step={0.1}
                            value={customDims[ax].toFixed(1)}
                            onChange={e => handleDimChange(ax, parseFloat(e.target.value) || 0.1)}
                          />
                          <p className="text-[9px] text-center" style={{ color: T.muted }}>
                            orig: {primary.originalDimensions[ax].toFixed(1)}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Scale % badge */}
                  <div className="flex justify-center mt-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accent}33` }}>
                      {((sx + sy + sz) / 3 * 100).toFixed(0)}% ขนาดเฉลี่ย
                      {sx === sy && sy === sz ? '' : ' (ไม่สม่ำเสมอ)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Auto-split sub-pieces breakdown */}
              {primary?.autoSplit && primary.subPieces && primary.subPieces.length > 0 && (
                <div className="rounded-xl p-4 space-y-2.5" style={{ background: T.surface, border: `1px solid rgba(91,143,255,0.3)` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v5M7 8v5M1 7h5M8 7h5" stroke="#5b8fff" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: T.accent }}>
                      แบ่งอัตโนมัติ — {primary.subPieces.length} ชิ้น
                    </p>
                  </div>
                  <p className="text-[10px]" style={{ color: T.muted }}>
                    โมเดลเกิน {AUTO_SPLIT_THRESHOLD}mm — ระบบแยกชิ้นงานแต่ละส่วนให้อัตโนมัติ
                  </p>
                  <div className="space-y-1.5">
                    {primary.subPieces.map((p, i) => {
                      let pieceEst: ReturnType<typeof calculate> | null = null
                      try {
                        pieceEst = calculate({
                          volumeCm3: p.volumeCm3 * sx * sy * sz,
                          dimensions: { x: p.dimensions.x * sx, y: p.dimensions.y * sy, z: p.dimensions.z * sz },
                          technology: 'FDM', material, infill, layerHeight,
                          quantity: 1, shipping: 'pickup',
                        })
                      } catch { /* ignore */ }
                      return (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                          style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                          <div>
                            <p className="text-[11px] font-semibold">ชิ้นที่ {i + 1}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: T.muted }}>
                              {(p.dimensions.x * sx).toFixed(0)}×{(p.dimensions.y * sy).toFixed(0)}×{(p.dimensions.z * sz).toFixed(0)} mm
                              &nbsp;·&nbsp;{(p.volumeCm3 * sx * sy * sz).toFixed(2)} cm³
                            </p>
                          </div>
                          <p className="text-[12px] font-bold" style={{ color: T.accent }}>
                            {pieceEst ? `฿${pieceEst.pricePerPc.toFixed(0)}` : '—'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Infill + Layer Height — same row */}
              <div className="rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-2 gap-5">
                  {/* Infill */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Infill</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {INFILL_OPTIONS.map(opt => {
                        const sel = infill === opt.v
                        return (
                          <button key={opt.v} onClick={() => setInfill(opt.v)}
                            className="py-2 px-1 rounded-xl text-center wb-btn"
                            style={{
                              background: sel ? T.accentDim : T.surface2,
                              border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                            }}>
                            <p className="text-[11px] font-semibold leading-tight">{opt.label}</p>
                            <p className="text-[9px] mt-0.5" style={{ color: T.muted }}>{opt.pct}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Layer Height */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Layer Height</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {LAYER_OPTIONS.map(opt => {
                        const sel = layerHeight === opt.v
                        return (
                          <button key={opt.v} onClick={() => setLayerHeight(opt.v)}
                            className="py-2 px-2.5 rounded-xl flex items-center justify-between wb-btn"
                            style={{
                              background: sel ? T.accentDim : T.surface2,
                              border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                            }}>
                            <p className="text-[11px] font-semibold">{opt.label}</p>
                            <p className="text-[9px]" style={{ color: T.muted }}>{opt.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drop zone */}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed text-left transition-all wb-btn"
                style={{ borderColor: isDragging ? T.accent : T.border, background: isDragging ? T.accentDim : T.surface }}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                    <UploadCloud size={18} style={{ color: isDragging ? T.accent : T.muted }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium" style={{ color: isDragging ? T.accent : T.text }}>
                      {isDragging ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
                    </p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {['STL', '3MF', 'MAX 100MB'].map(f => (
                        <span key={f} className="px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider"
                          style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>
                          {f}
                        </span>
                      ))}
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                        MAX {BUILD_MAX.x}×{BUILD_MAX.y}×{BUILD_MAX.z}MM
                      </span>
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".stl,.3mf"
                  onChange={e => e.target.files && handleFileUpload(e.target.files)} className="hidden" />
              </button>

              {/* File cards */}
              <div className="space-y-2">
                {models.map(model => (
                  <div key={model.id} className="rounded-xl p-3.5 flex items-center gap-3"
                    style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                      {model.uploading ? <Loader2 size={16} className="animate-spin" style={{ color: T.accent }} />
                       : model.error   ? <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                       : <FileText size={16} style={{ color: T.muted }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{model.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: model.error ? '#ef4444' : T.muted }}>
                        {model.error ? 'อัปโหลดล้มเหลว'
                         : model.uploading ? 'กำลังวิเคราะห์…'
                         : `${model.originalDimensions.x.toFixed(0)}×${model.originalDimensions.y.toFixed(0)}×${model.originalDimensions.z.toFixed(0)} mm · ${model.originalVolumeCm3.toFixed(1)} cm³`}
                      </p>
                    </div>
                    {!model.uploading && !model.error && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                        style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                        <button onClick={() => updateQty(model.id, model.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center" style={{ color: T.muted }}>
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-[13px] font-semibold">{model.quantity}</span>
                        <button onClick={() => updateQty(model.id, model.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center" style={{ color: T.muted }}>
                          <Plus size={11} />
                        </button>
                      </div>
                    )}
                    <button onClick={() => removeModel(model.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-60 transition-opacity"
                      style={{ color: T.muted }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {models.length > 0 && (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-dashed border text-[12px] font-medium flex items-center justify-center gap-2 hover:opacity-60 transition-opacity wb-btn"
                  style={{ borderColor: T.border, color: T.muted }}>
                  <Plus size={13} /> เพิ่มไฟล์อีก
                </button>
              )}
            </div>

            {/* ── Right: Settings + Quote ── */}
            <div className="w-[300px] shrink-0 flex flex-col"
              style={{ borderLeft: `1px solid ${T.border}`, background: T.surface }}>

              {/* Settings area — no scroll, tight spacing */}
              <div className="p-4 space-y-3">

                {/* Material */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>วัสดุ</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MATERIALS.map(m => {
                      const sel = material === m.id
                      return (
                        <button key={m.id} onClick={() => setMaterial(m.id)}
                          className="p-2.5 rounded-xl text-left wb-btn"
                          style={{
                            background: sel ? T.accentDim : T.surface2,
                            border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                          }}>
                          <div className="w-2.5 h-2.5 rounded-full mb-1.5" style={{ background: m.dot }} />
                          <p className="text-[11px] font-semibold leading-tight">{m.label}</p>
                          <p className="text-[9px] mt-0.5 leading-tight" style={{ color: T.muted }}>{m.hint}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>สี</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_SWATCHES.map(c => (
                      <button key={c.id} onClick={() => setColorId(c.id)} title={c.id}
                        className="w-6 h-6 rounded-full transition-transform wb-btn"
                        style={{
                          background: c.hex,
                          border:     colorId === c.id ? `2px solid ${T.accent}` : `1.5px solid ${T.border}`,
                          boxShadow:  colorId === c.id ? `0 0 0 2px ${T.surface}, 0 0 0 3.5px ${T.accent}` : 'none',
                          transform:  colorId === c.id ? 'scale(1.2)' : 'scale(1)',
                        }} />
                    ))}
                  </div>
                </div>

                {/* Qty row — compact inline */}
                {models.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>จำนวน</p>
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg"
                      style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                      <button onClick={() => models[0] && updateQty(models[0].id, models[0].quantity - 1)}
                        className="w-5 h-5 flex items-center justify-center" style={{ color: T.muted }}>
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-[14px] font-bold">{totalQty}</span>
                      <button onClick={() => models[0] && updateQty(models[0].id, models[0].quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center" style={{ color: T.muted }}>
                        <Plus size={11} />
                      </button>
                      <span className="text-[10px]" style={{ color: T.muted }}>ชิ้น</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quote card + nav — pinned to bottom */}
              <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>

                {/* Stats mini row */}
                {estimate && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { l: 'Volume', v: `${scaledVolume.toFixed(0)}`, u: 'cm³' },
                      { l: 'Weight', v: `${estimate.weightG.toFixed(0)}`, u: 'g' },
                      { l: 'Time',   v: formatTimeFull(estimate.printTimeSec), u: '' },
                    ].map(s => (
                      <div key={s.l} className="rounded-lg p-2 text-center" style={{ background: T.surface2 }}>
                        <p className="text-[12px] font-bold leading-tight">{s.v}<span className="text-[9px] ml-0.5" style={{ color: T.muted }}>{s.u}</span></p>
                        <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: T.muted }}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* White quote card */}
                <div className="rounded-xl p-4" style={{ background: '#fff', color: '#111' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Live Quote</p>
                  <p className="text-[34px] font-bold leading-none tracking-tight mb-3">
                    {estimate ? `฿${estimate.totalPrice.toLocaleString()}` : '—'}
                  </p>
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-[11px]">
                    {[
                      { l: `ชิ้นงาน (${totalQty} pcs)`, v: estimate ? `฿${estimate.subtotal.toLocaleString()}` : '—', c: '#111' },
                      { l: 'จัดส่ง', v: estimate ? (estimate.shippingCost === 0 ? 'ฟรี (รับเอง)' : `฿${estimate.shippingCost}`) : '—',
                        c: estimate?.shippingCost === 0 ? '#16a34a' : '#111' },
                    ].map(r => (
                      <div key={r.l} className="flex justify-between">
                        <span style={{ color: '#9ca3af' }}>{r.l}</span>
                        <span className="font-semibold" style={{ color: r.c }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next button */}
                <button onClick={nextStep} disabled={!canProceed}
                  className="w-full py-3 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 wb-btn hover:opacity-90 disabled:opacity-35"
                  style={{ background: T.accent, color: '#fff' }}>
                  ถัดไป <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ════════════════ STEP 2: Delivery & Confirm ════════════════ */}
        {step === 2 && (
          <div className="flex-1 p-6 space-y-5 max-w-[640px]">
            <h2 className="text-[20px] font-medium">จัดส่ง & ยืนยัน</h2>

            {/* Delivery */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: T.muted }}>วิธีรับสินค้า</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'pickup' as Shipping, Icon: Store,  label: 'รับเอง',       sub: 'ฟรี',   sc: T.green },
                  { id: 'postal' as Shipping, Icon: Truck,  label: 'ส่งไปรษณีย์', sub: '+฿45', sc: T.muted },
                ]).map(opt => {
                  const sel = shipping === opt.id
                  return (
                    <button key={opt.id} onClick={() => setShipping(opt.id)}
                      className="p-5 rounded-xl text-left wb-btn"
                      style={{
                        background: sel ? T.accentDim : T.surface,
                        border:     sel ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                      }}>
                      <opt.Icon size={22} className="mb-3" style={{ color: sel ? T.accent : T.muted }} />
                      <p className="font-semibold text-[15px]">{opt.label}</p>
                      <p className="text-[13px] mt-1" style={{ color: opt.sc }}>{opt.sub}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl p-5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: T.muted }}>สรุปคำสั่งซื้อ</p>
              {[
                { l: 'จำนวน',       v: `${totalQty} ชิ้น` },
                { l: 'วัสดุ',       v: MATERIALS.find(m => m.id === material)?.label ?? material },
                { l: 'Infill',      v: `${infill}%` },
                { l: 'Layer',       v: `${layerHeight} mm` },
                { l: 'ขนาด',        v: `${customDims.x.toFixed(0)}×${customDims.y.toFixed(0)}×${customDims.z.toFixed(0)} mm` },
                { l: 'จัดส่ง',      v: shipping === 'pickup' ? 'รับเอง (ฟรี)' : 'ไปรษณีย์ (+฿45)' },
                { l: 'ราคารวม',     v: estimate ? `฿${estimate.totalPrice.toLocaleString()}` : '—' },
              ].map((row, i, arr) => (
                <div key={row.l} className="flex justify-between py-3"
                  style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <span className="text-[13px]" style={{ color: T.muted }}>{row.l}</span>
                  <span className="text-[13px] font-semibold">{row.v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep}
                className="flex-1 py-4 rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 wb-btn hover:opacity-70"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted }}>
                <ChevronLeft size={16} /> ย้อนกลับ
              </button>
              <button onClick={handleOrder}
                className="flex-1 py-4 rounded-xl font-semibold text-[15px] wb-btn hover:opacity-90"
                style={{ background: T.accent, color: '#fff' }}>
                ยืนยันสั่งซื้อ →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
