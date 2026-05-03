"use client"

import { useState, Suspense, useEffect, useCallback, useRef } from "react"
import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls, Stage, Center } from "@react-three/drei"
import * as THREE from "three"
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { translations, Language } from '@/lib/translations'
import { useOrderStore } from '@/lib/store'
import { Stepper } from '@/components/Stepper'
import { Trash2, Plus, Minus, FileText, UploadCloud, X, HelpCircle, Loader2, MessageSquare, RefreshCw, ChevronRight } from 'lucide-react'

const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "CarbonFiber", "Nylon"]
const COLORS = [
  { id: "white", hex: "#ffffff" },
  { id: "black", hex: "#000000" },
  { id: "grey", hex: "#808080" },
  { id: "red", hex: "#ff0000" },
  { id: "blue", hex: "#0000ff" },
  { id: "green", hex: "#008000" },
  { id: "yellow", hex: "#ffff00" },
  { id: "orange", hex: "#ffa500" },
  { id: "purple", hex: "#800080" },
  { id: "pink", hex: "#ffc0cb" },
  { id: "silver", hex: "#c0c0c0" },
  { id: "gold", hex: "#ffd700" },
  { id: "transparent", hex: "rgba(255,255,255,0.1)" },
  { id: "anyColor", hex: "linear-gradient(to bottom right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)" },
]

interface ModelInfo {
  id: string;
  name: string;
  url: string;
  s3Key?: string;
  volumeCm3: number;
  dimensions: { x: number; y: number; z: number };
  material: string;
  colorId: string;
  quantity: number;
  uploading: boolean;
  progress: number;
}

function Model({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#808080" />
    </mesh>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const setEstimateData = useOrderStore((state) => state.setEstimateData)

  const [lang, setLang] = useState<Language>('TH')
  const t = translations[lang]

  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [technology, setTechnology] = useState("FDM")
  const [infill, setInfill] = useState(15)
  const [layerHeight, setLayerHeight] = useState(0.2)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0]

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
      progress: 0
    }))

    setModels(prev => [...prev, ...newModels])
    if (!selectedModelId) setSelectedModelId(newModels[0].id)

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

        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, fileType: 'application/octet-stream' })
        })
        const { url: uploadUrl, key } = await presignedRes.json()

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': 'application/octet-stream' }
        })

        setModels(prev => prev.map(m => m.id === modelId ? {
          ...m,
          volumeCm3,
          dimensions: { x: size.x, y: size.y, z: size.z },
          s3Key: key,
          uploading: false,
          progress: 100
        } : m))
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        setModels(prev => prev.filter(m => m.id !== modelId))
      }
    }))
  }

  const handleEstimate = async () => {
    if (models.length === 0 || models.some(m => m.uploading)) return
    setLoading(true)
    try {
      const estimates = await Promise.all(models.map(async (m) => {
        const res = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            volumeCm3: m.volumeCm3, 
            technology, 
            material: m.material, 
            infill, 
            layerHeight, 
            quantity: m.quantity, 
            isAnyColor: m.colorId === "anyColor" 
          }),
        })
        return res.json()
      }))

      const totalResult = estimates.reduce((acc, curr) => ({
        totalPrice: acc.totalPrice + curr.totalPrice,
        weightG: acc.weightG + curr.weightG,
        printTimeMin: acc.printTimeMin + curr.printTimeMin
      }), { totalPrice: 0, weightG: 0, printTimeMin: 0 })

      setResult(totalResult)
    } finally {
      setLoading(false)
    }
  }

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
    setResult(null)
  }

  const scrollToSettings = () => {
    settingsRef.current?.scrollIntoView({ behavior: 'smooth' })
    settingsRef.current?.classList.add('ring-2', 'ring-white', 'duration-500')
    setTimeout(() => settingsRef.current?.classList.remove('ring-2', 'ring-white'), 2000)
  }

  return (
    <div 
      className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 overflow-x-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[300] bg-white/10 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-white/50 m-4 rounded-[3rem] pointer-events-none transition-all">
          <div className="text-center">
            <UploadCloud size={80} className="mx-auto mb-6 opacity-50 animate-bounce" />
            <h2 className="font-header text-4xl uppercase tracking-tighter">Drop STL files here</h2>
          </div>
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-[100] px-8 py-8 flex items-center justify-between mix-blend-difference">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <Link href="/" className="hidden md:flex items-center gap-2 font-header text-[10px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity">
          <X size={12} /> Exit
        </Link>
      </nav>

      <main className="pt-32 pb-16 px-6 max-w-[1600px] mx-auto">
        <div className="mb-12">
          <Stepper steps={[t.nav.order, t.upload.settings, "Checkout"]} currentStep={models.length > 0 ? 1 : 0} />
        </div>
        
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: PREVIEW (Sticky) */}
          <div className="lg:col-span-4 w-full lg:sticky lg:top-32 space-y-4">
            <div className="aspect-[4/3] bg-neutral-900 border border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl group">
              {models.length > 0 ? (
                <>
                  <Canvas shadows camera={{ position: [100, 100, 100], fov: 45 }}>
                    <Suspense fallback={null}>
                      <Stage intensity={0.5} environment="city" adjustCamera={true}>
                        <Center><Model url={selectedModel.url} /></Center>
                      </Stage>
                    </Suspense>
                    <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
                  </Canvas>
                  <div className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <p className="font-header text-[10px] tracking-widest uppercase truncate max-w-[150px] opacity-60">{selectedModel.name}</p>
                    {selectedModel && !selectedModel.uploading && (
                      <p className="font-header text-[10px] tracking-tight opacity-40">
                        {selectedModel.dimensions.x.toFixed(0)} × {selectedModel.dimensions.y.toFixed(0)} × {selectedModel.dimensions.z.toFixed(0)} mm
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                  <UploadCloud size={40} className="mb-4 opacity-10" />
                  <p className="font-header text-lg tracking-[0.2em] uppercase opacity-40">Preview Area</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border border-dashed border-white/10 rounded-2xl font-header text-[10px] tracking-[0.4em] uppercase hover:bg-white/5 transition-all text-white/40 flex items-center justify-center gap-3"
            >
              <Plus size={14} /> Add new stl files
            </button>
            <input type="file" multiple accept=".stl" ref={fileInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" />
          </div>

          {/* COLUMN 2: FILE LIST (Scrollable) */}
          <div className="lg:col-span-5 w-full space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="font-header text-xs tracking-[0.4em] opacity-30 uppercase">Order Queue ({models.length})</h3>
            </div>

            <div className="space-y-3 lg:max-h-[calc(100vh-250px)] overflow-y-auto pr-3 custom-scrollbar pb-10">
              {models.length === 0 && (
                <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center">
                   <HelpCircle size={32} className="mb-4 opacity-10" />
                   <p className="font-header text-[10px] tracking-[0.4em] uppercase opacity-20">No files uploaded yet</p>
                </div>
              )}
              {models.map((model) => (
                <div 
                  key={model.id} 
                  onClick={() => setSelectedModelId(model.id)}
                  className={`group relative bg-[#111] border rounded-[1.2rem] py-3 px-4 transition-all duration-300 cursor-pointer ${selectedModelId === model.id ? 'border-white bg-neutral-900' : 'border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                        {model.uploading ? <Loader2 size={16} className="animate-spin opacity-40" /> : <FileText size={16} className="opacity-40" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-header text-sm tracking-tight truncate leading-none mb-1">{model.name}</p>
                        <div className="flex items-center gap-3">
                           <span className="text-[9px] font-body opacity-30 uppercase tracking-widest">{model.uploading ? 'Uploading...' : `${model.volumeCm3.toFixed(1)} cm³`}</span>
                           <span className="w-1 h-1 bg-white/10 rounded-full" />
                           <span className="text-[9px] font-header text-violet-400 uppercase tracking-widest">{model.material}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* Compact QTY */}
                        <div className="flex items-center gap-3 bg-white/5 rounded-lg px-2 py-1 h-8">
                            <button onClick={(e) => { e.stopPropagation(); updateModel(model.id, { quantity: Math.max(1, model.quantity - 1) }); }} className="text-white/20 hover:text-white transition-colors"><Minus size={12} /></button>
                            <span className="font-header text-[10px] w-3 text-center">{model.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateModel(model.id, { quantity: model.quantity + 1 }); }} className="text-white/20 hover:text-white transition-colors"><Plus size={12} /></button>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeModel(model.id); }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                    </div>
                  </div>

                  {selectedModelId === model.id && !model.uploading && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                       <div className="flex flex-wrap gap-2 mb-4">
                          {MATERIALS.map(m => (
                            <button 
                              key={m} 
                              onClick={(e) => { e.stopPropagation(); updateModel(model.id, { material: m }); }}
                              className={`px-3 py-1 rounded-lg font-header text-[9px] tracking-widest uppercase border transition-all ${model.material === m ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                            >
                              {m}
                            </button>
                          ))}
                       </div>
                       <div className="flex gap-2">
                          {COLORS.slice(0, 10).map(c => (
                            <button 
                              key={c.id} 
                              onClick={(e) => { e.stopPropagation(); updateModel(model.id, { colorId: c.id }); }}
                              className={`w-4 h-4 rounded-full border transition-all ${model.colorId === c.id ? 'border-white scale-125' : 'border-white/10 opacity-30 hover:opacity-100'}`}
                              style={{ background: c.hex }}
                            />
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3: PRICE & CTA (Sticky) */}
          <div className="lg:col-span-3 w-full lg:sticky lg:top-32 space-y-6">
            
            {/* Resolution/Infill Box */}
            <div ref={settingsRef} className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] space-y-6 transition-all">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-3 block">Resolution</label>
                    <select value={layerHeight} onChange={(e) => setLayerHeight(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-header text-xs tracking-[0.2em] text-white appearance-none cursor-pointer outline-none focus:border-white/40 transition-all">
                      <option value={0.12}>0.12mm (Fine)</option>
                      <option value={0.2}>0.20mm (Standard)</option>
                      <option value={0.28}>0.28mm (Draft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-3 block">Global Infill</label>
                    <select value={infill} onChange={(e) => setInfill(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 font-header text-xs tracking-[0.2em] text-white appearance-none cursor-pointer outline-none focus:border-white/40 transition-all">
                      <option value={15}>15% (Normal)</option>
                      <option value={30}>30% (Sturdy)</option>
                      <option value={100}>100% (Solid)</option>
                    </select>
                  </div>
                </div>
            </div>

            {/* Price Box */}
            <div className="bg-white text-black p-8 rounded-[2.5rem] shadow-[0_0_80px_rgba(255,255,255,0.1)] relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
               
               <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="font-header text-[10px] tracking-[0.4em] opacity-30 mb-2 uppercase leading-none">Estimate Total</p>
                    {result ? (
                       <p className="font-header text-6xl tracking-tighter leading-none">฿{result.totalPrice.toLocaleString()}</p>
                    ) : (
                       <p className="font-header text-2xl tracking-tighter leading-none opacity-20">No Estimate</p>
                    )}
                  </div>
                  {result && (
                     <div className="text-right">
                        <p className="font-header text-[14px] tracking-tighter">{result.weightG.toFixed(0)}g</p>
                        <p className="text-[8px] font-black uppercase opacity-20">Weight</p>
                     </div>
                  )}
               </div>

               {result ? (
                 <button 
                  onClick={() => {
                    setEstimateData({ models, technology, infill, layerHeight, result })
                    router.push('/quote')
                  }} 
                  className="w-full py-6 bg-black text-white rounded-2xl font-header text-xl font-semibold uppercase tracking-tight hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                 >
                   Order Now <ChevronRight size={18} />
                 </button>
               ) : (
                 <button 
                  onClick={handleEstimate} 
                  disabled={loading || models.length === 0 || models.some(m => m.uploading)} 
                  className="w-full py-6 bg-black text-white rounded-2xl font-header text-xl font-semibold uppercase tracking-[0.2em] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                 >
                   {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                   {loading ? 'Calculating...' : 'Get Price'}
                 </button>
               )}

               {result && (
                 <button onClick={handleEstimate} className="w-full mt-4 py-2 border border-black/5 rounded-lg text-[9px] font-header tracking-[0.3em] uppercase opacity-20 hover:opacity-100 transition-opacity">
                    Recalculate
                 </button>
               )}
            </div>

            {/* High Price Prompt */}
            {result && result.totalPrice >= 2000 && (
               <div className="bg-neutral-900 border border-white/5 p-6 rounded-[2rem] animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
                  <h4 className="font-header text-lg uppercase tracking-tight mb-2 leading-tight">Is this price higher than expected?</h4>
                  <p className="text-xs text-white/40 leading-relaxed mb-6 font-body">We can help you optimize your model or suggest more cost-efficient options via LINE.</p>
                  
                  <div className="space-y-3">
                    <a href="https://line.me/ti/p/@pb3d" target="_blank" className="w-full py-4 bg-[#00B900] text-white rounded-xl font-header text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-lg">
                      <MessageSquare size={16} /> Talk to Admin
                    </a>
                    <button onClick={scrollToSettings} className="w-full py-4 border border-white/10 text-white/60 rounded-xl font-header text-[10px] tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-white/5 transition-all">
                      <RefreshCw size={14} /> Optimize settings
                    </button>
                  </div>
               </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Floating Price (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-white/5 z-[200] lg:hidden flex items-center justify-between gap-4">
          <div>
              <p className="text-[8px] font-header tracking-widest opacity-30 uppercase mb-1">Total Estimate</p>
              <p className="font-header text-3xl tracking-tighter">฿{result?.totalPrice.toLocaleString() || '0'}</p>
          </div>
          <button 
            onClick={result ? () => { setEstimateData({ models, technology, infill, layerHeight, result }); router.push('/quote'); } : handleEstimate}
            className="flex-1 py-4 bg-white text-black rounded-xl font-header text-lg font-semibold uppercase tracking-widest shadow-2xl"
          >
            {result ? 'Proceed →' : 'Get Price'}
          </button>
      </div>

      <footer className="py-20 px-8 border-t border-white/5 flex flex-col items-center gap-10 text-white/10">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-header text-4xl tracking-tighter uppercase text-white">PB3D<span className="opacity-10">HUB</span></span>
        </div>
      </footer>
    </div>
  )
}
