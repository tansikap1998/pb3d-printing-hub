"use client"

import { useState, Suspense, useRef, useEffect, useCallback } from "react"
import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls, Stage, Center } from "@react-three/drei"
import * as THREE from "three"
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrderStore } from '@/lib/store'
import { formatTimeFull, fitsInBuildVolume, BUILD_MAX } from '@/lib/priceCalculator'
import type { Shipping } from '@/lib/priceCalculator'
import {
  Trash2, Plus, Minus, FileText, UploadCloud, X,
  Loader2, RefreshCw, Box, Clock, Weight, Zap,
  CheckCircle2, AlertCircle, Layers, Settings2,
  ArrowRight, Truck, Store, AlertTriangle
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const FDM_MATERIALS = [
  { id: "PLA",  label: "PLA",  desc: "Best for prototypes", color: "#3b82f6" },
  { id: "PETG", label: "PETG", desc: "Flexible & durable",  color: "#8b5cf6" },
  { id: "ABS",  label: "ABS",  desc: "Heat resistant",      color: "#f59e0b" },
  { id: "ASA",  label: "ASA",  desc: "UV resistant",        color: "#10b981" },
  { id: "TPU",         label: "TPU",          desc: "Rubber-like flex",    color: "#ec4899" },
  { id: "CarbonFiber", label: "Carbon Fiber", desc: "Ultra strong",        color: "#94a3b8" },
  { id: "Nylon",       label: "Nylon",        desc: "Industrial grade",    color: "#f97316" },
]

const COLORS = [
  { id: "white",  hex: "#ffffff", label: "White"  },
  { id: "black",  hex: "#1a1a1a", label: "Black"  },
  { id: "grey",   hex: "#808080", label: "Grey"   },
  { id: "red",    hex: "#ef4444", label: "Red"    },
  { id: "blue",   hex: "#3b82f6", label: "Blue"   },
  { id: "green",  hex: "#22c55e", label: "Green"  },
  { id: "yellow", hex: "#eab308", label: "Yellow" },
  { id: "orange", hex: "#f97316", label: "Orange" },
  { id: "purple", hex: "#a855f7", label: "Purple" },
  { id: "silver", hex: "#c0c0c0", label: "Silver" },
]

const INFILL_OPTIONS = [
  { v: 10,  label: "Light",      desc: "10%",  icon: "░" },
  { v: 25,  label: "Normal",     desc: "25%",  icon: "▒" },
  { v: 50,  label: "Strong",     desc: "50%",  icon: "▓" },
  { v: 80,  label: "Very Strong",desc: "80%",  icon: "█" },
]

const LAYER_OPTIONS = [
  { v: 0.08, label: "Fine",   desc: "0.08 mm", quality: 5 },
  { v: 0.16, label: "Normal", desc: "0.16 mm", quality: 3 },
  { v: 0.24, label: "Coarse", desc: "0.24 mm", quality: 2 },
]

const SUPPORTED_FORMATS = ["STL", "Binary STL", "ASCII STL"]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelInfo {
  id: string
  name: string
  url: string
  s3Key?: string
  volumeCm3: number
  dimensions: { x: number; y: number; z: number }
  material: string
  colorId: string
  quantity: number
  uploading: boolean
  progress: number
  error?: boolean
  oversize?: boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Model({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#a0a0b0" metalness={0.3} roughness={0.6} />
    </mesh>
  )
}

function UploadZone({ onFiles, isDragging }: { onFiles: (f: FileList | File[]) => void; isDragging: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onClick={() => ref.current?.click()}
      className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden
        ${isDragging ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' : 'border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]'}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 transition-opacity duration-300 ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
      <div className="relative py-14 px-8 flex flex-col items-center text-center gap-5">
        <div className={`w-18 h-18 w-[4.5rem] h-[4.5rem] rounded-2xl border flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-blue-500/20 border-blue-400/40 scale-110' : 'bg-white/5 border-white/10 group-hover:scale-105 group-hover:bg-white/8'}`}>
          <UploadCloud size={30} className={`transition-colors duration-200 ${isDragging ? 'text-blue-400' : 'text-white/30 group-hover:text-white/60'}`} />
        </div>
        <div className="space-y-1.5">
          <p className="font-header text-lg tracking-tight text-white/80">
            {isDragging ? 'Release to upload' : 'Drop STL files here'}
          </p>
          <p className="text-sm text-white/30">
            or <span className="text-blue-400">browse files</span> from your device
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {SUPPORTED_FORMATS.map(f => (
            <span key={f} className="px-2.5 py-1 rounded-full text-[9px] font-header tracking-widest uppercase bg-white/5 border border-white/8 text-white/35">{f}</span>
          ))}
          <span className="px-2.5 py-1 rounded-full text-[9px] font-header tracking-widest uppercase bg-white/5 border border-white/8 text-white/35">Max 100MB</span>
          <span className="px-2.5 py-1 rounded-full text-[9px] font-header tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
            Max {BUILD_MAX.x}×{BUILD_MAX.y}×{BUILD_MAX.z}mm
          </span>
        </div>
      </div>
      <input ref={ref} type="file" multiple accept=".stl" onChange={e => e.target.files && onFiles(e.target.files)} className="hidden" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const setEstimateData = useOrderStore(s => s.setEstimateData)

  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [technology] = useState<"FDM">("FDM")
  const [infill, setInfill] = useState(25)
  const [layerHeight, setLayerHeight] = useState(0.16)
  const [shipping, setShipping] = useState<Shipping>("pickup")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedModel = models.find(m => m.id === selectedModelId) ?? models[0]
  const canEstimate = models.length > 0 && !models.some(m => m.uploading || m.error || m.oversize)
  const materials   = FDM_MATERIALS

  // Auto-recalculate when settings change and models are ready
  useEffect(() => {
    if (!canEstimate) { setResult(null); return }
    const timer = setTimeout(() => { handleEstimate() }, 400)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models.map(m => `${m.id}-${m.material}-${m.colorId}-${m.quantity}`).join(), infill, layerHeight, technology, shipping])

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newModels: ModelInfo[] = fileArray.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: URL.createObjectURL(file),
      volumeCm3: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      material: "PLA",
      colorId: "white",
      quantity: 1,
      uploading: true,
      progress: 0,
    }))

    setModels(prev => [...prev, ...newModels])
    if (!selectedModelId) setSelectedModelId(newModels[0].id)
    setResult(null)

    await Promise.all(fileArray.map(async (file, index) => {
      const modelId = newModels[index].id
      try {
        const url = URL.createObjectURL(file)
        const loader = new STLLoader()
        const geometry = await new Promise<THREE.BufferGeometry>((resolve) => loader.load(url, resolve))
        geometry.computeBoundingBox()
        const box = geometry.boundingBox!
        const size = new THREE.Vector3()
        box.getSize(size)
        const volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000
        const dims = { x: size.x, y: size.y, z: size.z }
        const oversize = !fitsInBuildVolume(dims)

        // Upload to S3
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, fileType: 'application/octet-stream' })
        })
        const { url: uploadUrl, key } = await presignedRes.json()
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } })

        setModels(prev => prev.map(m => m.id === modelId ? {
          ...m, volumeCm3, dimensions: dims, s3Key: key, uploading: false, progress: 100, oversize
        } : m))
      } catch {
        setModels(prev => prev.map(m => m.id === modelId ? { ...m, uploading: false, error: true } : m))
      }
    }))
  }

  const handleEstimate = useCallback(async () => {
    if (models.length === 0 || models.some(m => m.uploading)) return
    setLoading(true)
    try {
      const estimates = await Promise.all(models.filter(m => !m.error && !m.oversize).map(async (m) => {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            volumeCm3: m.volumeCm3,
            dimensions: m.dimensions,
            technology,
            material: m.material,
            infill,
            layerHeight,
            quantity: m.quantity,
            shipping,
            isAnyColor: m.colorId === "anyColor",
          }),
        })
        return res.json()
      }))

      const total = estimates.reduce((acc, curr) => ({
        weightG:      acc.weightG      + curr.weightG,
        printTimeSec: acc.printTimeSec + curr.printTimeSec,
        printTimeMin: acc.printTimeMin + curr.printTimeMin,
        subtotal:     acc.subtotal     + curr.subtotal,
        shippingCost: curr.shippingCost,   // shipping is flat (last value wins)
        totalPrice:   acc.subtotal + curr.subtotal + curr.shippingCost,
        materialCost: acc.materialCost + curr.materialCost,
        machineCost:  acc.machineCost  + curr.machineCost,
      }), { weightG: 0, printTimeSec: 0, printTimeMin: 0, subtotal: 0, shippingCost: 0, totalPrice: 0, materialCost: 0, machineCost: 0 })

      // Fix total: subtotal of all + one shipping
      total.totalPrice = total.subtotal + total.shippingCost
      setResult(total)
    } finally {
      setLoading(false)
    }
  }, [models, technology, infill, layerHeight, shipping])

  const removeModel = (id: string) => {
    setModels(prev => {
      const filtered = prev.filter(m => m.id !== id)
      if (selectedModelId === id) setSelectedModelId(filtered[0]?.id || null)
      return filtered
    })
    setResult(null)
  }

  const updateModel = (id: string, updates: Partial<ModelInfo>) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const handleProceed = () => {
    setEstimateData({ models, technology, infill, layerHeight, result })
    router.push('/quote')
  }

  return (
    <div
      className="min-h-screen bg-[#080810] text-white font-body selection:bg-blue-500/20 overflow-x-hidden"
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
      onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files) }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[999] pointer-events-none">
          <div className="absolute inset-4 rounded-[2.5rem] border-2 border-dashed border-blue-400/60 bg-blue-500/5 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-3xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto mb-6">
                <UploadCloud size={40} className="text-blue-400 animate-bounce" />
              </div>
              <p className="font-header text-3xl tracking-tight text-blue-300">Drop to upload</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-10 py-5 flex items-center justify-between bg-[#080810]/85 backdrop-blur-xl border-b border-white/[0.05]">
        <Link href="/" className="font-header text-2xl tracking-tighter uppercase">
          PB3D<span className="text-white/15">HUB</span>
        </Link>
        <div className="hidden md:flex items-center gap-3 text-[9px] font-header tracking-[0.3em] uppercase">
          <span className="text-blue-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Upload</span>
          <div className="w-6 h-px bg-white/10" />
          <span className="text-white/20">Quote</span>
          <div className="w-6 h-px bg-white/10" />
          <span className="text-white/20">Checkout</span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-[10px] font-header tracking-[0.3em] uppercase text-white/25 hover:text-white/60 transition-colors">
          <X size={11} /> Exit
        </Link>
      </nav>

      <main className="pt-24 pb-32 px-4 md:px-8 max-w-[1480px] mx-auto">
        <div className="pt-8 pb-8">
          <h1 className="font-header text-[clamp(1.8rem,5vw,3.5rem)] tracking-tighter leading-[0.9]">Upload Your Model</h1>
          <p className="text-white/30 text-sm mt-2">Real-time pricing · Instant quote</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ── COL 1: 3D Preview ── */}
          <div className="xl:col-span-4 xl:sticky xl:top-24 space-y-4">
            <div className="aspect-[4/3] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/8 rounded-3xl overflow-hidden relative shadow-2xl">
              {models.length > 0 && selectedModel && !selectedModel.error ? (
                <>
                  <Canvas shadows camera={{ position: [100, 100, 100], fov: 45 }}>
                    <Suspense fallback={null}>
                      <Stage intensity={0.4} environment="city" adjustCamera>
                        <Center><Model url={selectedModel.url} /></Center>
                      </Stage>
                    </Suspense>
                    <OrbitControls makeDefault autoRotate autoRotateSpeed={0.8} />
                  </Canvas>

                  {/* Oversize warning */}
                  {selectedModel.oversize && (
                    <div className="absolute top-3 left-3 right-3 flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-2">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                      <p className="text-[9px] font-header tracking-wide uppercase text-amber-400">Exceeds build volume ({BUILD_MAX.x}×{BUILD_MAX.y}×{BUILD_MAX.z}mm)</p>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/5">
                    <p className="font-header text-[10px] tracking-wider uppercase text-white/50 truncate mb-1">{selectedModel.name}</p>
                    {selectedModel.dimensions.x > 0 && (
                      <p className="text-[10px] text-white/30 font-body">
                        {selectedModel.dimensions.x.toFixed(1)} × {selectedModel.dimensions.y.toFixed(1)} × {selectedModel.dimensions.z.toFixed(1)} mm
                        <span className="mx-1.5 text-white/15">·</span>
                        {selectedModel.volumeCm3.toFixed(1)} cm³
                      </p>
                    )}
                  </div>

                  {selectedModel.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <Loader2 size={28} className="animate-spin mx-auto mb-3 text-blue-400" />
                        <p className="text-xs font-header tracking-widest uppercase text-white/40">Analysing model…</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
                      <Box size={28} className="text-white/15" />
                    </div>
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white/10 rounded-tl-sm" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white/10 rounded-tr-sm" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white/10 rounded-bl-sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white/10 rounded-br-sm" />
                  </div>
                  <p className="text-xs font-header tracking-[0.3em] uppercase text-white/15">3D Preview</p>
                </div>
              )}
            </div>

            {/* Stats */}
            {selectedModel && !selectedModel.uploading && selectedModel.dimensions.x > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Box,    label: "Volume",     value: `${selectedModel.volumeCm3.toFixed(1)}`, unit: "cm³" },
                  { icon: Weight, label: "Weight",     value: result ? `${result.weightG.toFixed(0)}` : "—", unit: "g" },
                  { icon: Clock,  label: "Print Time", value: result ? formatTimeFull(result.printTimeSec) : "—", unit: "" },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.025] border border-white/6 rounded-2xl p-3 text-center">
                    <s.icon size={12} className="mx-auto mb-1.5 text-white/25" />
                    <p className="font-header text-sm tracking-tight">{s.value}<span className="text-white/40 text-[9px] ml-0.5">{s.unit}</span></p>
                    <p className="text-[8px] font-header tracking-widest uppercase text-white/25 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 border border-dashed border-white/8 rounded-2xl font-header text-[10px] tracking-[0.4em] uppercase hover:bg-white/4 hover:border-white/15 transition-all text-white/30 flex items-center justify-center gap-2">
              <Plus size={12} /> Add more files
            </button>
            <input type="file" multiple accept=".stl" ref={fileInputRef} onChange={e => e.target.files && handleFileUpload(e.target.files)} className="hidden" />
          </div>

          {/* ── COL 2: Upload + File Queue ── */}
          <div className="xl:col-span-5 space-y-5">
            {models.length === 0 && <UploadZone onFiles={handleFileUpload} isDragging={isDragging} />}

            {models.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-header tracking-[0.4em] uppercase text-white/25">
                    Queue · {models.length} {models.length === 1 ? 'file' : 'files'}
                  </span>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-[9px] font-header tracking-[0.3em] uppercase text-blue-400/70 hover:text-blue-400 transition-colors">
                    <Plus size={10} /> Add file
                  </button>
                </div>

                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
                  {models.map(model => {
                    const mat = FDM_MATERIALS.find(m => m.id === model.material)
                    return (
                      <div key={model.id} onClick={() => !model.error && setSelectedModelId(model.id)}
                        className={`group relative border rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden
                          ${model.error || model.oversize ? 'border-amber-500/20 bg-amber-500/5' : selectedModelId === model.id ? 'border-blue-400/30 bg-blue-500/5' : 'border-white/6 bg-white/[0.02] hover:border-white/12'}`}>

                        {model.uploading && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse w-3/5" />
                          </div>
                        )}

                        <div className="px-4 py-3.5 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors
                            ${model.error || model.oversize ? 'bg-amber-500/10 border-amber-500/20' : model.uploading ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/4 border-white/8'}`}>
                            {model.error ? <AlertCircle size={16} className="text-red-400" /> :
                             model.oversize ? <AlertTriangle size={16} className="text-amber-400" /> :
                             model.uploading ? <Loader2 size={16} className="animate-spin text-blue-400" /> :
                             <FileText size={16} className={selectedModelId === model.id ? 'text-blue-400' : 'text-white/30'} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-header text-sm tracking-tight truncate leading-tight">{model.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {model.error ? <span className="text-[9px] text-red-400 font-header uppercase">Upload failed</span> :
                               model.oversize ? <span className="text-[9px] text-amber-400 font-header uppercase">Exceeds max build volume</span> :
                               model.uploading ? <span className="text-[9px] text-blue-400/70 font-header uppercase tracking-widest">Uploading…</span> : (
                                <>
                                  <span className="text-[9px] text-white/25">{model.volumeCm3.toFixed(1)} cm³</span>
                                  <span className="w-0.5 h-0.5 rounded-full bg-white/15" />
                                  <span className="text-[9px] font-header uppercase tracking-wider" style={{ color: mat?.color }}>
                                    {model.material}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {!model.uploading && !model.error && !model.oversize && (
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/6">
                              <button onClick={e => { e.stopPropagation(); updateModel(model.id, { quantity: Math.max(1, model.quantity - 1) }) }} className="text-white/20 hover:text-white transition-colors"><Minus size={11} /></button>
                              <span className="font-header text-[11px] w-4 text-center">{model.quantity}</span>
                              <button onClick={e => { e.stopPropagation(); updateModel(model.id, { quantity: model.quantity + 1 }) }} className="text-white/20 hover:text-white transition-colors"><Plus size={11} /></button>
                            </div>
                          )}

                          <button onClick={e => { e.stopPropagation(); removeModel(model.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10">
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Material + Color picker (expanded when selected) */}
                        {selectedModelId === model.id && !model.uploading && !model.error && !model.oversize && (
                          <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4">
                            <div>
                              <p className="text-[9px] font-header tracking-[0.35em] uppercase text-white/20 mb-2.5 flex items-center gap-1.5"><Layers size={9} />Material</p>
                              <div className="grid grid-cols-4 gap-1.5">
                                {materials.map(mat => (
                                  <button key={mat.id} onClick={e => { e.stopPropagation(); updateModel(model.id, { material: mat.id }) }}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${model.material === mat.id ? 'bg-white text-black border-white' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                                    <div className="w-2 h-2 rounded-full mb-1.5" style={{ background: model.material === mat.id ? '#000' : mat.color }} />
                                    <p className={`font-header text-[9px] tracking-wider uppercase ${model.material === mat.id ? 'text-black' : 'text-white/70'}`}>{mat.label}</p>
                                    <p className={`text-[7px] mt-0.5 ${model.material === mat.id ? 'text-black/50' : 'text-white/20'}`}>{mat.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-header tracking-[0.35em] uppercase text-white/20 mb-2.5">Color</p>
                              <div className="flex flex-wrap gap-2">
                                {COLORS.map(c => (
                                  <button key={c.id} onClick={e => { e.stopPropagation(); updateModel(model.id, { colorId: c.id }) }}
                                    title={c.label}
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${model.colorId === c.id ? 'border-white scale-125 ring-1 ring-white/30 ring-offset-1 ring-offset-[#080810]' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                                    style={{ background: c.hex }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {models.length > 0 && models.length < 5 && (
              <UploadZone onFiles={handleFileUpload} isDragging={isDragging} />
            )}
          </div>

          {/* ── COL 3: Settings + Live Price ── */}
          <div className="xl:col-span-3 xl:sticky xl:top-24 space-y-4">

            {/* Print Settings */}
            <div className="bg-white/[0.02] border border-white/6 rounded-3xl p-4 space-y-4">
              <p className="text-[9px] font-header tracking-[0.35em] uppercase text-white/25 flex items-center gap-1.5"><Settings2 size={9} />Print Settings</p>

              {/* Infill */}
              <div>
                <p className="text-[8px] font-header tracking-[0.3em] uppercase text-white/20 mb-2">Infill Density</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {INFILL_OPTIONS.map(opt => (
                    <button key={opt.v} onClick={() => setInfill(opt.v)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${infill === opt.v ? 'bg-white text-black border-white' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                      <p className={`font-header text-[9px] tracking-wider uppercase ${infill === opt.v ? 'text-black' : 'text-white/60'}`}>{opt.label}</p>
                      <p className={`text-[8px] mt-0.5 ${infill === opt.v ? 'text-black/50' : 'text-white/20'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layer Height */}
              <div>
                <p className="text-[8px] font-header tracking-[0.3em] uppercase text-white/20 mb-2">Layer Height</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {LAYER_OPTIONS.map(opt => (
                    <button key={opt.v} onClick={() => setLayerHeight(opt.v)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${layerHeight === opt.v ? 'bg-white text-black border-white' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                      <p className={`font-header text-[9px] tracking-wider uppercase ${layerHeight === opt.v ? 'text-black' : 'text-white/60'}`}>{opt.label}</p>
                      <p className={`text-[8px] mt-0.5 ${layerHeight === opt.v ? 'text-black/50' : 'text-white/20'}`}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white/[0.02] border border-white/6 rounded-3xl p-4 space-y-3">
              <p className="text-[9px] font-header tracking-[0.35em] uppercase text-white/25 flex items-center gap-1.5"><Truck size={9} />Delivery</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setShipping("pickup")}
                  className={`p-3 rounded-xl border text-left transition-all ${shipping === "pickup" ? 'bg-white text-black border-white' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                  <Store size={13} className={`mb-1.5 ${shipping === "pickup" ? 'text-black' : 'text-white/30'}`} />
                  <p className={`font-header text-[9px] tracking-wider uppercase ${shipping === "pickup" ? 'text-black' : 'text-white/60'}`}>Pickup</p>
                  <p className={`text-[8px] mt-0.5 font-header ${shipping === "pickup" ? 'text-black/50' : 'text-emerald-400/70'}`}>Free</p>
                </button>
                <button onClick={() => setShipping("postal")}
                  className={`p-3 rounded-xl border text-left transition-all ${shipping === "postal" ? 'bg-white text-black border-white' : 'border-white/6 bg-white/[0.02] hover:border-white/15'}`}>
                  <Truck size={13} className={`mb-1.5 ${shipping === "postal" ? 'text-black' : 'text-white/30'}`} />
                  <p className={`font-header text-[9px] tracking-wider uppercase ${shipping === "postal" ? 'text-black' : 'text-white/60'}`}>Postal</p>
                  <p className={`text-[8px] mt-0.5 font-header ${shipping === "postal" ? 'text-black/60' : 'text-white/30'}`}>+฿45</p>
                </button>
              </div>
            </div>

            {/* Live Price Card */}
            <div className={`rounded-3xl p-5 border relative overflow-hidden transition-all duration-500 ${result ? 'bg-white text-black border-white' : 'bg-white/[0.02] border-white/8 text-white'}`}>
              {!result && <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />}

              <div className="relative space-y-4">
                <div>
                  <p className={`text-[9px] font-header tracking-[0.4em] uppercase mb-2 ${result ? 'text-black/40' : 'text-white/25'}`}>
                    {loading ? 'Calculating…' : result ? 'Live Quote' : 'Price Estimate'}
                  </p>

                  {result ? (
                    <div className="space-y-3">
                      <p className="font-header text-5xl tracking-tighter leading-none">
                        ฿{result.totalPrice.toLocaleString()}
                      </p>
                      <div className="space-y-1.5 pt-3 border-t border-black/8 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-black/40">Parts ({models.reduce((a, m) => a + m.quantity, 0)} pcs)</span>
                          <span className="font-header">฿{result.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/40">Shipping</span>
                          <span className={`font-header ${result.shippingCost === 0 ? 'text-emerald-600' : ''}`}>
                            {result.shippingCost === 0 ? 'Free' : `฿${result.shippingCost}`}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-black/8">
                          <span className="font-header text-[9px] uppercase tracking-widest text-black/50">Weight</span>
                          <span className="font-header">{result.weightG.toFixed(0)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-header text-[9px] uppercase tracking-widest text-black/50">Print Time</span>
                          <span className="font-header">{formatTimeFull(result.printTimeSec)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="font-header text-2xl tracking-tighter text-white/15">
                      {models.length === 0 ? 'Upload a file' : models.some(m => m.uploading) ? 'Analysing…' : loading ? 'Calculating…' : 'Ready'}
                    </p>
                  )}
                </div>

                {loading && (
                  <div className="flex items-center gap-2 text-white/30">
                    <Loader2 size={13} className="animate-spin" />
                    <span className="text-[9px] font-header tracking-widest uppercase">Updating price…</span>
                  </div>
                )}

                {result ? (
                  <div className="space-y-2">
                    <button onClick={handleProceed}
                      className="w-full py-4 bg-black text-white rounded-2xl font-header text-sm uppercase tracking-[0.15em] hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-lg">
                      Proceed to Order <ArrowRight size={15} />
                    </button>
                    <button onClick={handleEstimate}
                      className="w-full py-2.5 border border-black/10 rounded-xl font-header text-[9px] tracking-[0.35em] uppercase text-black/40 hover:text-black/70 transition-colors flex items-center justify-center gap-1.5">
                      <RefreshCw size={10} /> Recalculate
                    </button>
                  </div>
                ) : (
                  <button onClick={handleEstimate} disabled={loading || !canEstimate}
                    className="w-full py-4 rounded-2xl font-header text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-2.5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white">
                    {loading ? <><Loader2 size={14} className="animate-spin" />Calculating…</> : <><Zap size={14} />Get Instant Quote</>}
                  </button>
                )}

                <div className={`flex items-center gap-2 ${result ? 'text-black/30' : 'text-white/15'}`}>
                  <CheckCircle2 size={10} />
                  <span className="text-[8px] font-header tracking-[0.25em] uppercase">FDM · Bambu Lab X1C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 xl:hidden z-[200] bg-[#080810]/90 backdrop-blur-xl border-t border-white/6 px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-[8px] font-header tracking-widest uppercase text-white/25 mb-0.5">Total</p>
            <p className="font-header text-2xl tracking-tighter">
              {result ? `฿${result.totalPrice.toLocaleString()}` : '—'}
            </p>
            {result && <p className="text-[8px] text-white/20">{formatTimeFull(result.printTimeSec)}</p>}
          </div>
          <button onClick={result ? handleProceed : handleEstimate} disabled={loading || !canEstimate}
            className="flex-1 py-4 rounded-2xl font-header text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-2 bg-white text-black shadow-2xl active:scale-[0.98]">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {result ? 'Proceed →' : loading ? 'Calculating…' : 'Get Quote'}
          </button>
        </div>
      </div>
    </div>
  )
}
