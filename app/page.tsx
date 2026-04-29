"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { translations, Language } from '@/lib/translations'

const InteractiveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let animationFrameId: number; let particles: any[] = []
    const mouse = { x: 0, y: 0 }
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number; opacity: number
      constructor(c: any) {
        this.x = Math.random() * c.width; this.y = Math.random() * c.height
        this.size = Math.random() * 1.5 + 0.2; this.speedX = Math.random() * 0.3 - 0.15
        this.speedY = Math.random() * 0.3 - 0.15; this.opacity = Math.random() * 0.3 + 0.05
      }
      update(c: any) {
        this.x += this.speedX; this.y += this.speedY
        if (this.x > c.width) this.x = 0; else if (this.x < 0) this.x = c.width
        if (this.y > c.height) this.y = 0; else if (this.y < 0) this.y = c.height
        const dx = mouse.x - this.x; const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 200) { this.x -= dx * 0.01; this.y -= dy * 0.01 }
      }
      draw(ctx: any) { ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill() }
    }
    const init = () => { particles = []; for (let i = 0; i < 60; i++) particles.push(new Particle(canvas)) }
    const animate = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { p.update(canvas); p.draw(ctx) }); animationFrameId = requestAnimationFrame(animate) }
    window.addEventListener('resize', handleResize); window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY })
    handleResize(); init(); animate()
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-20" />
}

const ImageCarousel = () => {
  const images = [
    "/media__1777430714628.png", 
    "/media__1777429810223.png", 
    "/media__1777429328508.png", 
    "/media__1777365099190.png", 
    "/media__1777363717739.png",
  ]
  return (
    <div className="w-full overflow-hidden bg-white/5 py-32 border-y border-white/5 mt-40">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...images, ...images, ...images].map((img, i) => (
          <div key={i} className="inline-block px-6">
            <div className="h-[400px] w-[500px] rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 shadow-2xl bg-white/5 group border border-white/10">
              <img src={img} alt="PB3D Showcase" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-all duration-1000" />
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        .animate-marquee { display: flex; width: fit-content; animation: marquee 40s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
    </div>
  )
}

const TrustBar = ({ t }: { t: any }) => (
  <div className="border-y border-white/5 py-12 flex flex-wrap justify-center gap-12 md:gap-24 opacity-60">
    <div className="flex items-center gap-4">
      <span className="font-header text-3xl">4.9/5.0</span>
      <span className="font-header text-[10px] tracking-widest uppercase leading-none opacity-50">{t.trust.rating}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="font-header text-3xl">10+</span>
      <span className="font-header text-[10px] tracking-widest uppercase leading-none opacity-50">{t.trust.years}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="font-header text-3xl">1,000+</span>
      <span className="font-header text-[10px] tracking-widest uppercase leading-none opacity-50">{t.trust.orders}</span>
    </div>
  </div>
)

export default function Home() {
  const [lang, setLang] = useState<Language>('TH')
  const t = translations[lang]
  const tTH = translations['TH']

  const MATERIALS = [
    { id: 'PLA', name: 'PLA', icon: '🧊', desc: lang === 'TH' ? 'ทั่วไป · แข็ง · พิมพ์เร็ว' : 'General · Rigid · Fast', price: '฿3/g', details: tTH.materials.items.PLA.details, bestFor: tTH.materials.items.PLA.bestFor },
    { id: 'PETG', name: 'PETG', icon: '💧', desc: lang === 'TH' ? 'ทนทาน · กันน้ำ' : 'Durable · Waterproof', price: '฿4/g', details: tTH.materials.items.PETG.details, bestFor: tTH.materials.items.PETG.bestFor },
    { id: 'ABS', name: 'ABS', icon: '🔥', desc: lang === 'TH' ? 'ทนร้อน · เหนียว' : 'High Heat · Tough', price: '฿4/g', details: tTH.materials.items.ABS.details, bestFor: tTH.materials.items.ABS.bestFor },
    { id: 'ASA', name: 'ASA', icon: '☀️', desc: lang === 'TH' ? 'ทน UV · กลางแจ้ง' : 'UV Resistant · Outdoor', price: '฿5/g', details: tTH.materials.items.ASA.details, bestFor: tTH.materials.items.ASA.bestFor },
    { id: 'TPU', name: 'TPU', icon: '👟', desc: lang === 'TH' ? 'ยืดหยุ่น · นุ่ม' : 'Flexible · Elastic', price: '฿6/g', details: tTH.materials.items.TPU.details, bestFor: tTH.materials.items.TPU.bestFor },
    { id: 'CarbonFiber', name: 'CarbonFiber', icon: '🛡️', desc: lang === 'TH' ? 'แข็งแรงพิเศษ · ดำด้าน' : 'High-Rigidity · Matte', price: '฿10/g', details: tTH.materials.items.CarbonFiber.details, bestFor: tTH.materials.items.CarbonFiber.bestFor },
    { id: 'Nylon', name: 'Nylon', icon: '⛓️', desc: lang === 'TH' ? 'ทนแรงเสียดสี · เหนียวมาก' : 'Low-Friction · Tough', price: '฿12/g', details: tTH.materials.items.Nylon.details, bestFor: tTH.materials.items.Nylon.bestFor },
  ]

  const [selectedMat, setSelectedMat] = useState(MATERIALS[0])

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] selection:bg-white/20 font-sans overflow-x-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Cormorant+Garamond:ital,wght@1,600&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-serif { font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .font-body { font-family: 'Inter', sans-serif; }
        html { scroll-behavior: smooth; }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-8 flex items-center justify-between mix-blend-difference">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <div className="hidden md:flex items-center gap-16 font-header text-xs tracking-[0.3em] uppercase">
          <a href="#materials" className="hover:opacity-50 transition-opacity">{t.nav.materials}</a>
          <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="hover:opacity-50 transition-opacity border-x border-white/10 px-6">
            {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
          </button>
        </div>
        <Link href="/upload" className="font-header text-xs tracking-[0.3em] uppercase border border-white/20 px-8 py-3 rounded-full hover:bg-white hover:text-black transition-all">
          {t.nav.start}
        </Link>
      </nav>

      <main>
        {/* HERO */}
        <section className="relative min-h-screen flex flex-col justify-end px-8 pb-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
             <img src="/media__1777430714628.png" alt="Hero" className="w-full h-full object-cover opacity-40 grayscale" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
          <InteractiveBackground />
          <div className="relative z-10 w-full">
            <div className="mb-10 opacity-30 font-header text-[12px] md:text-[14px] tracking-[0.6em] uppercase">{t.hero.subtitle}</div>
            <h1 className="font-header text-[15vw] md:text-[12vw] leading-[0.75] uppercase tracking-tighter mix-blend-difference">
              Digital<br/>
              <span className="flex items-center gap-6">
                <span className="font-serif text-[12vw] md:text-[10vw] lowercase tracking-normal text-white/40">{lang === 'TH' ? 'เข้าสู่' : 'into'}</span>
                Physical
              </span>
            </h1>
            <div className="mt-16 flex flex-col md:flex-row justify-between items-end gap-16">
              <p className="max-w-xl font-body text-white/40 text-lg md:text-xl leading-relaxed tracking-tight">{t.hero.desc}</p>
              <div className="flex gap-16 font-header text-[11px] tracking-[0.4em] uppercase">
                <div className="flex flex-col gap-2">
                  <span className="text-white/20">Studio</span>
                  <span>BKK — TH</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-white/20">{t.hero.status}</span>
                  <span className="text-green-500">{t.hero.online}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TrustBar t={t} />

        {/* MARKETPLACE INTEGRATION */}
        <section className="py-40 px-8">
           <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
              <div>
                 <h2 className="font-header text-7xl md:text-9xl leading-none uppercase tracking-tighter mb-12">
                   {t.shopee.title}
                 </h2>
                 <p className="font-serif text-3xl text-white/60 leading-relaxed mb-12">
                   {t.shopee.desc}
                 </p>
                 <a href="https://shopee.co.th/shop/9883965" target="_blank" className="inline-flex items-center gap-4 bg-[#EE4D2D] text-white font-header text-xs tracking-widest uppercase px-12 py-5 rounded-full hover:opacity-80 transition-all shadow-2xl">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.124 16.5c-.861 0-1.558.697-1.558 1.558s.697 1.558 1.558 1.558 1.558-.697 1.558-1.558-.697-1.558-1.558-1.558zm-11.666 0c-.861 0-1.558.697-1.558 1.558s.697 1.558 1.558 1.558 1.558-.697 1.558-1.558-.697-1.558-1.558-1.558zm13.14-11.644c-.38-.285-.855-.356-1.282-.19l-11.62 4.437c-.38.143-.665.474-.759.855l-2.09 9.12h17.1c.38 0 .712-.237.855-.57l1.52-7.6c.047-.285 0-.57-.143-.855l-3.581-5.207zM18.026 6.5l2.612 3.8H6.556l1.235-5.32 10.235-3.98L18.026 6.5z"/></svg>
                   {t.trust.shopeeCta}
                 </a>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {[t.shopee.review1, t.shopee.review2, t.shopee.review3].map((rev, i) => (
                   <div key={i} className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                     <div className="flex gap-1 mb-4 text-orange-400">
                       {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                     </div>
                     <p className="font-serif italic text-2xl text-white/80">"{rev}"</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* MATERIALS */}
        <section id="materials" className="py-60 px-8 border-y border-white/5 bg-[#F2F2F2] text-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-32 gap-10">
              <h2 className="font-header text-[12vw] md:text-[9vw] leading-[0.8] uppercase tracking-tighter">{t.materials.title}</h2>
              <div className="font-header text-[12px] tracking-[0.4em] uppercase opacity-40">{t.materials.subtitle}</div>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-stretch">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {MATERIALS.map((m, i) => (
                  <button key={m.id} onClick={() => setSelectedMat(m)}
                    className={`group relative p-8 border border-black/10 transition-all duration-500 flex flex-col justify-between aspect-[3/4] rounded-[2rem] ${selectedMat.id === m.id ? 'bg-black text-white shadow-2xl scale-[1.02]' : 'hover:bg-black/5 hover:scale-[1.02]'}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-header text-5xl tracking-tighter">0{i+1}</span>
                      <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{m.icon}</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-header text-3xl uppercase mb-1 tracking-tighter leading-none">{m.name}</h3>
                      <p className="font-body text-[9px] opacity-40 uppercase tracking-[0.1em] font-black">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="bg-black/5 p-12 lg:p-16 rounded-[3rem] flex flex-col justify-between shadow-inner h-full min-h-[600px]">
                <div>
                  <div className="flex items-center gap-8 mb-12">
                    <div className="w-20 h-20 bg-black text-white flex items-center justify-center text-5xl rounded-[1.5rem] shadow-xl">{selectedMat.icon}</div>
                    <h3 className="font-header text-6xl uppercase tracking-tighter leading-none">{selectedMat.name}</h3>
                  </div>
                  <div className="space-y-12">
                    <div>
                      <h4 className="font-header text-[10px] tracking-[0.4em] uppercase opacity-30 mb-6">รายละเอียดวัสดุ (MATERIAL INSIGHT)</h4>
                      <p className="text-3xl md:text-4xl font-serif italic text-black/80 leading-[1.4] tracking-tight">{selectedMat.details}</p>
                    </div>
                    <div>
                      <h4 className="font-header text-[10px] tracking-[0.4em] uppercase opacity-30 mb-6">เหมาะสำหรับ (BEST FOR)</h4>
                      <p className="font-body font-black text-xl uppercase tracking-tighter opacity-80 leading-relaxed">{selectedMat.bestFor}</p>
                    </div>
                  </div>
                </div>
                <Link href="/upload" className="mt-20 bg-black text-white font-header text-xs tracking-[0.3em] uppercase py-7 text-center rounded-[1.2rem] hover:opacity-80 transition-all shadow-2xl">
                  {t.materials.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* IMAGE CAROUSEL */}
        <ImageCarousel />

        {/* CTA */}
        <section className="py-80 px-8 text-center flex flex-col items-center">
          <h2 className="font-header text-[12vw] md:text-[10vw] leading-[0.8] uppercase tracking-tighter mb-24">
            พร้อมหรือยังที่จะ<br/><span className="font-serif italic tracking-normal text-white/30 lowercase">ทำให้</span> จินตนาการเป็นจริง.
          </h2>
          <Link href="/upload" className="group flex flex-col items-center gap-6">
            <div className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            </div>
            <span className="font-header text-[12px] tracking-[0.6em] uppercase opacity-30 group-hover:opacity-100 transition-opacity">{t.nav.order}</span>
          </Link>
        </section>
      </main>

      <footer className="py-32 px-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-end gap-20 text-white/30">
        <div className="flex flex-col gap-6">
          <span className="font-header text-5xl tracking-tighter uppercase text-white">PB3D<span className="opacity-10">HUB</span></span>
          <p className="font-body text-[11px] uppercase tracking-[0.3em] font-bold">© 2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="flex gap-16 font-header text-[12px] tracking-[0.5em] uppercase">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Facebook</a>
        </div>
      </footer>
    </div>
  )
}
