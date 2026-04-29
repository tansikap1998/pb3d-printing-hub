"use client"

import { useState, Suspense, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Stage, useGLTF, Bounds, Center } from "@react-three/drei"
import * as THREE from "three"
import Link from 'next/link'
import { translations, Language } from '@/lib/translations'

const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "CarbonFiber", "Nylon"]
const COLORS = [
  { name: "White (สีขาว)", hex: "#ffffff" },
  { name: "Black (สีดำ)", hex: "#000000" },
  { name: "Grey (สีเทา)", hex: "#808080" },
  { name: "Brown (สีน้ำตาล)", hex: "#8b4513" },
  { name: "Yellow (สีเหลือง)", hex: "#ffff00" },
  { name: "Blue (สีน้ำเงิน)", hex: "#0000ff" },
  { name: "Orange (สีส้ม)", hex: "#ffa500" },
  { name: "Red (สีแดง)", hex: "#ff0000" },
  { name: "Mint Green", hex: "#98ff98" },
  { name: "Green (สีเขียว)", hex: "#008000" },
  { name: "Pink (สีชมพู)", hex: "#ffc0cb" },
  { name: "Skin (สีเนื้อ)", hex: "#ffdbac" },
  { name: "Pink neon", hex: "#ff1493" },
  { name: "AnyColor (ตามใจร้าน)", hex: "linear-gradient(to bottom right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)" },
]

interface ModelInfo {
  id: string; file: File; name: string; url: string; volumeCm3: number; dimensions: { x: number; y: number; z: number }
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} castShadow receiveShadow />
}

export default function UploadPage() {
  const [lang, setLang] = useState<Language>('TH')
  const t = translations[lang]

  const [models, setModels] = useState<ModelInfo[]>([])
  const [technology, setTechnology] = useState("FDM")
  const [material, setMaterial] = useState("PLA")
  const [infill, setInfill] = useState(15)
  const [layerHeight, setLayerHeight] = useState(0.2)
  const [colorName, setColorName] = useState("White (สีขาว)")
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (material === "CarbonFiber") setColorName("Black (สีดำ)")
  }, [material])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      const loader = (window as any).STLLoader ? new (window as any).STLLoader() : null
      if (loader) {
        loader.load(url, (geometry: THREE.BufferGeometry) => {
          geometry.computeBoundingBox()
          const box = geometry.boundingBox!
          const size = new THREE.Vector3()
          box.getSize(size)
          const volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000
          const newModel: ModelInfo = { id: Math.random().toString(), file, name: file.name, url, volumeCm3, dimensions: { x: size.x, y: size.y, z: size.z } }
          setModels((prev) => [...prev, newModel])
        })
      } else {
        const newModel: ModelInfo = { id: Math.random().toString(), file, name: file.name, url, volumeCm3: 10, dimensions: { x: 50, y: 50, z: 50 } }
        setModels((prev) => [...prev, newModel])
      }
    })
  }

  const handleEstimate = async () => {
    if (models.length === 0) return
    setLoading(true)
    try {
      const model = models[0]
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeCm3: model.volumeCm3, technology, material, infill, layerHeight, quantity, isAnyColor: colorName.includes("AnyColor") }),
      })
      const data = await res.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between mix-blend-difference">
        <Link href="/" className="font-header text-3xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="font-header text-xs tracking-widest uppercase hover:opacity-50">
          {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
        </button>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12">
        {/* LEFT: VIEWER */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-square bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden relative">
            {models.length > 0 ? (
              <Canvas shadows camera={{ position: [100, 100, 100], fov: 45 }}>
                <Suspense fallback={null}>
                  <Stage intensity={0.5} environment="city" adjustCamera={false}>
                    <Center><Model url={models[0].url} /></Center>
                  </Stage>
                </Suspense>
                <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
              </Canvas>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <input type="file" multiple accept=".stl" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-6 opacity-40"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <p className="font-header text-xl tracking-widest uppercase">{t.upload.title}</p>
                <p className="text-xs opacity-50 mt-2">STL / 3MF FILES</p>
              </div>
            )}
          </div>
          
          {models.length > 0 && (
            <div className="grid grid-cols-3 gap-4 bg-white/[0.03] p-8 rounded-[2rem] border border-white/5">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Width (X)</p>
                <p className="font-header text-2xl">{models[0].dimensions.x.toFixed(1)} mm</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Depth (Y)</p>
                <p className="font-header text-2xl">{models[0].dimensions.y.toFixed(1)} mm</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Height (Z)</p>
                <p className="font-header text-2xl">{models[0].dimensions.z.toFixed(1)} mm</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: SETTINGS */}
        <div className="lg:col-span-5 space-y-8">
          <div className="flex justify-between items-end">
            <h2 className="font-header text-5xl uppercase tracking-tighter">{t.upload.settings}</h2>
            <span className="font-header text-xs text-indigo-400">Step 01</span>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 block">{t.upload.material}</label>
              <div className="grid grid-cols-4 gap-2">
                {MATERIALS.map(m => (
                  <button key={m} onClick={() => setMaterial(m)} className={`py-3 rounded-xl font-header text-[11px] uppercase tracking-widest border transition-all ${material === m ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 hover:border-white/30 text-white/50'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 block">{t.upload.layer}</label>
                <select value={layerHeight} onChange={(e) => setLayerHeight(Number(e.target.value))} className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 font-header text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value={0.12} className="bg-black">0.12mm (Fine)</option>
                  <option value={0.2} className="bg-black">0.20mm (Standard)</option>
                  <option value={0.28} className="bg-black">0.28mm (Draft)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 block">{t.upload.infill}</label>
                <select value={infill} onChange={(e) => setInfill(Number(e.target.value))} className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 font-header text-sm text-white focus:outline-none focus:border-indigo-500">
                  <option value={15} className="bg-black">15% (Standard)</option>
                  <option value={30} className="bg-black">30% (Functional)</option>
                  <option value={100} className="bg-black">100% (Solid)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 block">{t.upload.color}</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c.name} onClick={() => setColorName(c.name)} disabled={material === "CarbonFiber" && c.name !== "Black (สีดำ)"}
                    className={`group relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${colorName === c.name ? 'border-white scale-110' : 'border-transparent opacity-40 hover:opacity-100'} ${material === "CarbonFiber" && c.name !== "Black (สีดำ)" ? 'hidden' : ''}`}
                    title={c.name}
                    style={{ background: c.hex }}>
                    {colorName === c.name && <div className="w-2 h-2 bg-white rounded-full mix-blend-difference" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mt-2 opacity-40 font-bold uppercase tracking-widest">{colorName}</p>
            </div>

            <button onClick={handleEstimate} disabled={loading || models.length === 0} className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-header text-sm uppercase tracking-[0.3em] transition-all disabled:opacity-20 shadow-2xl shadow-indigo-600/20">
              {loading ? t.upload.calculating : (result ? t.upload.reestimate : t.upload.estimate)}
            </button>
          </div>

          {result && (
            <div className="bg-white text-black p-8 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-8 border-b border-black/10 pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{t.upload.summary}</p>
                  <h3 className="font-header text-3xl tracking-tighter uppercase">{material} PRINT</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Est. Weight</p>
                  <p className="font-header text-xl">{result.weightG}g</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="font-header text-xs tracking-widest opacity-40 uppercase">{t.upload.total}</p>
                <p className="font-header text-5xl tracking-tighter">฿{result.totalPrice}</p>
              </div>
              <button className="w-full mt-8 py-5 bg-black text-white rounded-2xl font-header text-sm uppercase tracking-widest hover:opacity-80 transition-all">
                {t.upload.checkout} →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
