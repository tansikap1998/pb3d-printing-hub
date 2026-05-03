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
import { Trash2, Plus, Minus, FileText, UploadCloud, X, HelpCircle, Loader2 } from 'lucide-react'

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showFindFiles, setShowFindFiles] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedModel = models.find(m => m.id === selectedModelId) || models[0]

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // Create placeholders for parallel uploads
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

    // Parallel Processing & Upload
    await Promise.all(fileArray.map(async (file, index) => {
      const modelId = newModels[index].id
      try {
        // 1. Client-side Parsing
        const url = URL.createObjectURL(file)
        const loader = new STLLoader()
        const geometry = await new Promise<THREE.BufferGeometry>((resolve) => loader.load(url, resolve))
        
        geometry.computeBoundingBox()
        const box = geometry.boundingBox!
        const size = new THREE.Vector3()
        box.getSize(size)
        const volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000

        // 2. S3 Direct Upload (Presigned URL)
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

        // 3. Update State
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
      // Sum up estimates for all models
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
      `}</style>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[300] bg-white/10 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-white/50 m-4 rounded-[3rem] pointer-events-none transition-all">
          <div className="text-center">
            <UploadCloud size={80} className="mx-auto mb-6 opacity-50 animate-bounce" />
            <h2 className="font-header text-4xl uppercase tracking-tighter">Drop STL files here</h2>
            <p className="font-body text-sm text-white/40 mt-4 uppercase tracking-[0.2em]">Release to start upload</p>
          </div>
        </div>
      )}

      <nav className={`fixed top-0 left-0 right-0 z-[100] px-8 py-8 flex items-center justify-between transition-all duration-500 ${isMenuOpen ? 'bg-black' : 'mix-blend-difference'}`}>
        <div className="flex items-center gap-8">
          <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
            PB3D<span className="text-white/20">HUB</span>
          </Link>
          <Link href="/" className="hidden md:flex items-center gap-2 font-header text-[10px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity">
            <X size={12} />
            Cancel & Exit
          </Link>
        </div>
        
        <div className="flex items-center gap-6">
          <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="font-header text-2xl tracking-[0.4em] uppercase hover:opacity-50 border-2 border-white/10 px-8 py-4 rounded-full hidden md:block">
            {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
          </button>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex flex-col gap-1.5 p-2">
            <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </nav>

      <main className="pt-40 pb-16 px-6 max-w-7xl mx-auto">
        <Stepper steps={[t.nav.order, t.upload.settings, "Checkout"]} currentStep={models.length > 0 ? 1 : 0} />
        
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: 3D Preview (Sticky) */}
          <div className="lg:col-span-7 w-full sticky top-24 space-y-6">
            <div className="aspect-square bg-neutral-900 border border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl group">
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
                  <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
                    <p className="font-header text-xs tracking-widest uppercase truncate max-w-[200px]">{selectedModel.name}</p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                  <UploadCloud size={60} className="mb-6 opacity-20" />
                  <p className="font-header text-xl tracking-[0.3em] uppercase">{t.upload.title}</p>
                  <p className="text-[10px] font-black tracking-[0.5em] mt-4 opacity-40">DRAG & DROP STL FILES</p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-8 px-8 py-4 bg-white text-black rounded-xl font-header text-xs tracking-widest uppercase hover:bg-gray-200 transition-all"
                  >
                    Select Files
                  </button>
                </div>
              )}
              <input type="file" multiple accept=".stl" ref={fileInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="hidden" />
            </div>

            {selectedModel && !selectedModel.uploading && (
              <div className="grid grid-cols-3 gap-4 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                {[
                  { l: "X (WIDTH)", v: selectedModel.dimensions.x },
                  { l: "Y (DEPTH)", v: selectedModel.dimensions.y },
                  { l: "Z (HEIGHT)", v: selectedModel.dimensions.z }
                ].map(d => (
                  <div key={d.l} className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-20 mb-2">{d.l}</p>
                    <p className="font-header text-2xl tracking-tighter">{d.v.toFixed(1)} <span className="text-[10px] opacity-20">mm</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Configuration & List */}
          <div className="lg:col-span-5 w-full space-y-10">
            
            {/* Global Settings */}
            <div className="space-y-10 bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem]">
              <div>
                <h2 className="font-header text-3xl uppercase tracking-tighter mb-8 leading-none">Global Quality</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 block">Resolution</label>
                    <select value={layerHeight} onChange={(e) => setLayerHeight(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-header text-base tracking-widest text-white focus:border-white/30 transition-all appearance-none cursor-pointer">
                      <option value={0.12}>0.12mm (Fine)</option>
                      <option value={0.2}>0.20mm (Standard)</option>
                      <option value={0.28}>0.28mm (Draft)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 block">Infill %</label>
                    <select value={infill} onChange={(e) => setInfill(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 font-header text-base tracking-widest text-white focus:border-white/30 transition-all appearance-none cursor-pointer">
                      <option value={15}>15% (Normal)</option>
                      <option value={30}>30% (Sturdy)</option>
                      <option value={100}>100% (Solid)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Model List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-header text-xl uppercase tracking-widest opacity-40">Your Files ({models.length})</h3>
                {models.length > 0 && (
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs font-header tracking-widest uppercase hover:text-white transition-colors flex items-center gap-2">
                    <Plus size={14} /> Add more
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {models.map((model) => (
                  <div 
                    key={model.id} 
                    onClick={() => setSelectedModelId(model.id)}
                    className={`group relative bg-[#111] border rounded-[1.5rem] p-6 transition-all duration-300 cursor-pointer ${selectedModelId === model.id ? 'border-white ring-1 ring-white/20' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                          {model.uploading ? <Loader2 size={20} className="animate-spin opacity-40" /> : <FileText size={20} className="opacity-40" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-header text-sm tracking-tight truncate mb-1">{model.name}</p>
                          <p className="text-[10px] font-body opacity-40 uppercase tracking-widest">{model.uploading ? 'Uploading...' : `${model.volumeCm3.toFixed(1)} cm³`}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeModel(model.id); }}
                        className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {!model.uploading && (
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
                        {/* Per-model Material */}
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {MATERIALS.slice(0, 4).map(m => (
                              <button 
                                key={m} 
                                onClick={(e) => { e.stopPropagation(); updateModel(model.id, { material: m }); }}
                                className={`px-3 py-1.5 rounded-lg font-header text-[10px] tracking-widest uppercase border transition-all ${model.material === m ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Color Circles */}
                          <div className="flex gap-2">
                            {COLORS.slice(0, 6).map(c => (
                              <button 
                                key={c.id} 
                                onClick={(e) => { e.stopPropagation(); updateModel(model.id, { colorId: c.id }); }}
                                className={`w-5 h-5 rounded-full border transition-all ${model.colorId === c.id ? 'border-white scale-125' : 'border-white/10 opacity-30 hover:opacity-100'}`}
                                style={{ background: c.hex }}
                              />
                            ))}
                          </div>

                          {/* Quantity Toggle */}
                          <div className="flex items-center gap-4 bg-white/5 rounded-full px-3 py-1">
                            <button onClick={(e) => { e.stopPropagation(); updateModel(model.id, { quantity: Math.max(1, model.quantity - 1) }); }} className="text-white/40 hover:text-white transition-colors"><Minus size={14} /></button>
                            <span className="font-header text-xs w-4 text-center">{model.quantity}</span>
                            <button onClick={(e) => { e.stopPropagation(); updateModel(model.id, { quantity: model.quantity + 1 }); }} className="text-white/40 hover:text-white transition-colors"><Plus size={14} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {models.length === 0 && (
                <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
                   <HelpCircle size={40} className="mx-auto mb-4 opacity-10" />
                   <p className="font-header text-sm tracking-[0.3em] uppercase opacity-20">Your queue is empty</p>
                </div>
              )}
            </div>

            {/* Price Estimation */}
            {models.length > 0 && (
              <div className="pt-6">
                <button 
                  onClick={handleEstimate} 
                  disabled={loading || models.some(m => m.uploading)} 
                  className={`w-full py-5 rounded-xl font-header text-xl font-semibold uppercase tracking-[0.4em] transition-all duration-200 shadow-2xl active:scale-[0.98] ${result ? 'bg-transparent border-2 border-white/40 hover:bg-white/10 text-white' : 'bg-white text-black hover:bg-white/90 disabled:opacity-30'}`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="animate-spin" />
                      CALCULATING...
                    </div>
                  ) : (result ? 'RE-CALCULATE ESTIMATE' : 'ESTIMATE PRICE')}
                </button>
              </div>
            )}

            {result && (
              <div className="bg-[#F2F2F2] text-black p-10 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8 shadow-2xl">
                <div className="flex justify-between items-start mb-6 border-b border-black/10 pb-4">
                  <div className="flex gap-4 items-center">
                    <span className="font-header text-[10px] tracking-[0.4em] opacity-30 uppercase">TOTAL ESTIMATE</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Weight</p>
                    <p className="font-header text-2xl tracking-tighter">{result.weightG.toFixed(1)}g</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-10">
                  <p className="font-header text-[clamp(2.5rem,8vw,6rem)] tracking-tighter leading-none">฿{result.totalPrice.toLocaleString()}</p>
                </div>

                <button 
                  onClick={() => {
                    setEstimateData({ models, technology, infill, layerHeight, result })
                    router.push('/quote')
                  }} 
                  className="w-full py-6 bg-black text-white rounded-xl font-header text-xl font-semibold uppercase tracking-tight hover:bg-gray-800 transition-all duration-200 shadow-xl active:scale-[0.98]">
                  Proceed to Quote →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-20 px-8 border-t border-white/5 flex flex-col items-center gap-10 text-white/20">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-header text-4xl tracking-tighter uppercase text-white">PB3D<span className="opacity-10">HUB</span></span>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] font-bold">© 2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-12 font-header text-[10px] tracking-[0.5em] uppercase">
          <a href="#" className="hover:text-white transition-colors">SHOPEE</a>
          <a href="#" className="hover:text-white transition-colors">FACEBOOK</a>
          <a href="#" className="hover:text-white transition-colors">LINE OA</a>
          <Link href="/admin" className="hover:text-white transition-colors opacity-50 hover:opacity-100">ADMIN</Link>
        </div>
      </footer>
    </div>
  )
}
