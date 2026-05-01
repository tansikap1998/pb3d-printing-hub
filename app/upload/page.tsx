"use client"

import { useState, Suspense, useEffect } from "react"
import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls, Stage, Center } from "@react-three/drei"
import * as THREE from "three"
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
// @ts-ignore
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { translations, Language } from '@/lib/translations'
import { useOrderStore } from '@/lib/store'

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
  id: string; file: File; name: string; url: string; volumeCm3: number; dimensions: { x: number; y: number; z: number }
}

function Model({ url, fileName }: { url: string; fileName: string }) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  if (extension === 'stl') {
    const geometry = useLoader(STLLoader, url)
    return (
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#808080" />
      </mesh>
    )
  } else if (extension === '3mf') {
    const group = useLoader(ThreeMFLoader, url)
    return <primitive object={group} castShadow receiveShadow />
  }
  
  return null
}

export default function UploadPage() {
  const router = useRouter()
  const setEstimateData = useOrderStore((state) => state.setEstimateData)

  const [lang, setLang] = useState<Language>('TH')
  const t = translations[lang]

  const [models, setModels] = useState<ModelInfo[]>([])
  const [technology, setTechnology] = useState("FDM")
  const [material, setMaterial] = useState("PLA")
  const [infill, setInfill] = useState(15)
  const [layerHeight, setLayerHeight] = useState(0.2)
  const [colorId, setColorId] = useState("white")
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({ name: '', method: 'line', contactValue: '' })
  const [showFindFiles, setShowFindFiles] = useState(false)

  useEffect(() => {
    if (material === "CarbonFiber") setColorId("black")
  }, [material])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      if (extension === 'stl') {
        const loader = new STLLoader()
        loader.load(url, (geometry: THREE.BufferGeometry) => {
          geometry.computeBoundingBox()
          const box = geometry.boundingBox!
          const size = new THREE.Vector3()
          box.getSize(size)
          const volumeCm3 = Math.abs(size.x * size.y * size.z) / 1000
          const newModel: ModelInfo = { id: Math.random().toString(), file, name: file.name, url, volumeCm3, dimensions: { x: size.x, y: size.y, z: size.z } }
          setModels((prev) => [...prev, newModel])
        })
      } else if (extension === '3mf') {
        const loader = new ThreeMFLoader()
        loader.load(url, (group: THREE.Group) => {
          const box = new THREE.Box3().setFromObject(group)
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
        body: JSON.stringify({ volumeCm3: model.volumeCm3, technology, material, infill, layerHeight, quantity, isAnyColor: colorId === "anyColor" }),
      })
      const data = await res.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 overflow-x-hidden">

      <nav className={`fixed top-0 left-0 right-0 z-[100] px-8 py-8 flex items-center justify-between transition-all duration-500 ${isMenuOpen ? 'bg-black mix-blend-normal' : 'mix-blend-difference'}`}>
        <div className="flex items-center gap-8">
          <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none z-[101]">
            PB3D<span className="text-white/20">HUB</span>
          </Link>
          <Link href="/" className="hidden md:flex items-center gap-2 font-header text-[10px] tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Home
          </Link>
        </div>
        
        <div className="flex items-center gap-6">
          <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="font-header text-[10px] tracking-[0.4em] uppercase hover:opacity-50 border border-white/10 px-4 py-2 rounded-full hidden md:block">
            {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
          </button>
          {/* Hamburger Toggle */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="z-[101] flex flex-col gap-1.5 p-2">
            <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div className={`fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center gap-12 transition-all duration-700 ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <div className="flex flex-col items-center gap-8 font-header text-2xl tracking-[0.2em] uppercase">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="hover:text-white/40 transition-colors">Home</Link>
            <Link href="/#materials" onClick={() => setIsMenuOpen(false)} className="hover:text-white/40 transition-colors">{t.nav.materials}</Link>
            <button onClick={() => { setLang(lang === 'TH' ? 'EN' : 'TH'); setIsMenuOpen(false); }} className="text-white/40">
              {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
            </button>
          </div>
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="font-header text-sm tracking-[0.3em] uppercase bg-white text-black px-12 py-5 rounded-full">
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Model Search Modal */}
      {showFindFiles && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowFindFiles(false)} />
          <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full max-w-4xl relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button onClick={() => setShowFindFiles(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="mb-12">
              <h3 className="font-header text-3xl uppercase tracking-tighter mb-2 text-white">{t.findFiles.popular}</h3>
              <p className="font-body text-sm text-white/40 uppercase tracking-[0.2em]">{t.findFiles.subtitle}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { name: "Thingiverse", url: "https://www.thingiverse.com" },
                { name: "Printables", url: "https://www.printables.com" },
                { name: "Cults3D", url: "https://cults3d.com" },
                { name: "MyMiniFactory", url: "https://www.myminifactory.com" },
                { name: "MakerWorld", url: "https://makerworld.com" },
                { name: "Yeggi", url: "https://www.yeggi.com" }
              ].map(site => (
                <a key={site.name} href={site.url} target="_blank" className="bg-white/5 border border-white/5 p-8 rounded-3xl text-center hover:bg-white/10 hover:border-white/20 transition-all group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="font-header text-[12px] tracking-widest uppercase mb-1 relative z-10">{site.name}</p>
                  <p className="text-[8px] opacity-20 group-hover:opacity-50 transition-opacity relative z-10 tracking-[0.3em]">VISIT LIBRARY →</p>
                </a>
              ))}
            </div>

            <div className="bg-white/[0.03] p-10 rounded-[2.5rem] border border-white/10 mb-8 relative overflow-hidden group text-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-all" />
              <h3 className="font-header text-[10px] tracking-[0.5em] uppercase mb-4 text-white/30">KEYWORD SUGGESTIONS</h3>
              <p className="text-[14px] text-white/60 font-body tracking-wide italic">{t.findFiles.hint}</p>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-8 rounded-3xl flex gap-6 items-start">
               <span className="text-2xl mt-1">🚨</span>
               <div>
                 <p className="font-header text-[12px] tracking-[0.4em] uppercase text-orange-500 mb-2">{t.findFiles.licenseTitle}</p>
                 <p className="text-[12px] text-orange-500/60 font-body leading-relaxed">{t.findFiles.licenseDesc}</p>
               </div>
            </div>
          </div>
        </div>
      )}

      <main className="pt-40 pb-32 px-6 max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-8">
          <div className="flex justify-between items-end border-b border-white/5 pb-4 mb-4">
            <h2 className="font-header text-3xl uppercase tracking-tighter leading-none">{t.upload.title}</h2>
            <span className="font-header text-[10px] tracking-[0.4em] opacity-30 uppercase">Step 01</span>
          </div>
          <div className="aspect-square bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden relative shadow-2xl">
            {models.length > 0 ? (
              <Canvas 
                shadows 
                camera={{ position: [100, 100, 100], fov: 45 }}
                onCreated={({ gl }) => {
                  gl.domElement.addEventListener('webglcontextlost', (event) => {
                    event.preventDefault()
                    console.warn('WebGL context lost. Reloading...')
                    window.location.reload()
                  }, false)
                }}
              >
                <Suspense fallback={null}>
                  <Stage intensity={0.5} environment="city" adjustCamera={false}>
                    <Center><Model url={models[0].url} fileName={models[0].name} /></Center>
                  </Stage>
                </Suspense>
                <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
              </Canvas>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                <input type="file" multiple accept=".stl,.3mf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-8 opacity-20"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <p className="font-header text-2xl tracking-[0.3em] uppercase">{t.upload.title}</p>
                <p className="text-[10px] font-black tracking-[0.5em] mt-4 opacity-40">STL / 3MF FILES ONLY</p>
              </div>
            )}
          </div>
          
          {models.length === 0 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
               <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setShowFindFiles(true)} className="flex-1 border py-5 rounded-2xl font-header text-[10px] tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    {t.findFiles.title}
                  </button>
                  <a href="https://line.me/ti/p/@pb3d" target="_blank" className="flex-1 bg-[#06C755]/10 border border-[#06C755]/20 text-[#06C755] py-5 rounded-2xl font-header text-[10px] tracking-[0.3em] uppercase hover:bg-[#06C755]/20 transition-all flex items-center justify-center gap-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.58 2 10c0 2.9 1.87 5.48 4.7 7.04-.13.5-.47 1.94-.54 2.22-.08.3-.38 1.18.16 1.18.52 0 2.4-1.6 3.3-2.22.45.12.92.18 1.38.18 5.52 0 10-3.58 10-8s-4.48-8-10-8zm-5 11h-1v-4h1v4zm3 0h-1v-4h1v4zm3-4v4h-1v-4h1zm3 4h-1v-4h1v4z"/></svg>
                    {t.findFiles.contactHelp}
                  </a>
               </div>
            </div>
          )}

          {models.length > 0 && (
            <div className="grid grid-cols-3 gap-6 bg-white/[0.02] p-10 rounded-[2.5rem] border border-white/5">
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">{t.upload.dimensions} X</p>
                <p className="font-header text-3xl tracking-tighter">{models[0].dimensions.x.toFixed(1)} <span className="text-xs opacity-20 ml-1 uppercase">mm</span></p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">{t.upload.dimensions} Y</p>
                <p className="font-header text-3xl tracking-tighter">{models[0].dimensions.y.toFixed(1)} <span className="text-xs opacity-20 ml-1 uppercase">mm</span></p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 mb-3">{t.upload.dimensions} Z</p>
                <p className="font-header text-3xl tracking-tighter">{models[0].dimensions.z.toFixed(1)} <span className="text-xs opacity-20 ml-1 uppercase">mm</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-12">
          <div className="flex justify-between items-end border-b border-white/5 pb-4">
            <h2 className="font-header text-3xl uppercase tracking-tighter leading-none">{t.upload.settings}</h2>
            <span className="font-header text-[10px] tracking-[0.4em] opacity-30 uppercase">Step 02</span>
          </div>

          <div className="space-y-10">
            <div>
              <label className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 mb-6 block">{t.upload.material}</label>
              <div className="grid grid-cols-3 gap-3">
                {MATERIALS.map(m => (
                  <button key={m} onClick={() => setMaterial(m)} className={`py-4 rounded-xl font-header text-[12px] uppercase tracking-[0.2em] border-2 transition-all ${material === m ? 'bg-white text-black border-white shadow-xl' : 'bg-transparent border-white/5 hover:border-white/20 text-white/40'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 mb-6 block">{t.upload.layer}</label>
                <select value={layerHeight} onChange={(e) => setLayerHeight(Number(e.target.value))} className="w-full bg-white/[0.05] border-2 border-white/5 rounded-2xl px-6 py-4 font-header text-sm tracking-widest text-white focus:outline-none focus:border-white/20 transition-all">
                  <option value={0.12} className="bg-black">0.12mm (Fine)</option>
                  <option value={0.2} className="bg-black">0.20mm (Standard)</option>
                  <option value={0.28} className="bg-black">0.28mm (Draft)</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 mb-6 block">{t.upload.infill}</label>
                <select value={infill} onChange={(e) => setInfill(Number(e.target.value))} className="w-full bg-white/[0.05] border-2 border-white/5 rounded-2xl px-6 py-4 font-header text-sm tracking-widest text-white focus:outline-none focus:border-white/20 transition-all">
                  <option value={15} className="bg-black">15% (Standard)</option>
                  <option value={30} className="bg-black">30% (Functional)</option>
                  <option value={100} className="bg-black">100% (Solid)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-black uppercase tracking-[0.4em] opacity-30 mb-6 block">{t.upload.color}</label>
              <div className="flex flex-wrap gap-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                {COLORS.map(c => (
                  <button key={c.id} onClick={() => setColorId(c.id)} disabled={material === "CarbonFiber" && c.id !== "black"}
                    className={`group relative w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${colorId === c.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-20 hover:opacity-100'} ${material === "CarbonFiber" && c.id !== "black" ? 'hidden' : ''}`}
                    title={t.colors[c.id as keyof typeof t.colors]}
                    style={{ background: c.hex }}>
                    {colorId === c.id && <div className="w-2 h-2 bg-white rounded-full mix-blend-difference" />}
                  </button>
                ))}
              </div>
              <p className="text-[11px] mt-4 opacity-40 font-black uppercase tracking-[0.3em]">{t.colors[colorId as keyof typeof t.colors]}</p>
            </div>

            <button onClick={handleEstimate} disabled={loading || models.length === 0} className="w-full py-6 rounded-2xl bg-white text-black font-header text-sm uppercase tracking-[0.4em] transition-all disabled:opacity-10 shadow-2xl hover:bg-white/90 active:scale-[0.98]">
              {loading ? t.upload.calculating : (result ? t.upload.reestimate : t.upload.estimate)}
            </button>
          </div>

          {result && (
            <div className="bg-[#F2F2F2] text-black p-10 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8 shadow-2xl">
              <div className="flex justify-between items-start mb-6 border-b border-black/5 pb-4">
                <div className="flex gap-4 items-center">
                  <span className="font-header text-[10px] tracking-[0.4em] opacity-30 uppercase">Step 03</span>
                  <h3 className="font-header text-2xl tracking-tighter uppercase">{material} PREVIEW</h3>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 mb-2">Weight</p>
                  <p className="font-header text-2xl tracking-tighter">{result.weightG}g</p>
                </div>
              </div>
              <div className="flex justify-between items-center mb-8">
                <p className="font-header text-[12px] tracking-[0.5em] opacity-30 uppercase">{t.upload.total}</p>
                <p className="font-header text-[clamp(2.5rem,10vw,7rem)] tracking-tighter">฿{result.totalPrice}</p>
              </div>

              <button 
                onClick={() => {
                  setEstimateData({ models, technology, material, infill, layerHeight, colorId, quantity, result })
                  router.push('/quote')
                }} 
                className="w-full mt-4 py-7 bg-black text-white rounded-2xl font-header text-sm uppercase tracking-[0.4em] hover:opacity-90 transition-all shadow-xl active:scale-[0.98]">
                Proceed to Quote
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="py-20 px-8 border-t border-white/5 flex flex-col items-center gap-10 text-white/20">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-header text-4xl tracking-tighter uppercase text-white">PB3D<span className="opacity-10">HUB</span></span>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] font-bold">© 2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 font-header text-[10px] tracking-[0.5em] uppercase">
          <a href="https://shopee.co.th/shop/9883965" target="_blank" className="hover:text-white transition-colors">SHOPEE</a>
          <a href="https://facebook.com/pb3d" target="_blank" className="hover:text-white transition-colors">FACEBOOK</a>
          <a href="https://line.me/ti/p/@pb3d" target="_blank" className="hover:text-white transition-colors">LINE OA</a>
          <Link href="/admin" className="hover:text-white transition-colors opacity-50 hover:opacity-100">ADMIN</Link>
        </div>
      </footer>

      {/* Floating LINE Button */}
      <a href="https://lin.ee/R8Vd7q5" target="_blank" rel="noreferrer" className="fixed bottom-8 right-8 z-[90] hover:scale-105 active:scale-95 transition-all">
        <img src="https://scdn.line-apps.com/n/line_add_friends/btn/th.png" alt="เพิ่มเพื่อน" height="18" style={{ border: 0 }} />
      </a>
    </div>
  )
}
