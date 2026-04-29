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
    "/media__1777429328508.png",
    "/media__1777365099190.png",
    "/media__1777363717739.png",
    "/media__1777363626244.png",
    "/media__1777363653135.png",
  ]
  return (
    <div className="w-full overflow-hidden bg-white/5 py-20">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...images, ...images].map((img, i) => (
          <div key={i} className="inline-block px-4">
            <img src={img} alt="Gallery" className="h-60 md:h-80 w-auto rounded-3xl object-cover grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl" />
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: fit-content;
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default function Home() {
  const [lang, setLang] = useState<Language>('EN')
  const t = translations[lang]

  const MATERIALS = [
    { id: 'PLA', name: 'PLA', icon: '🧊', desc: lang === 'TH' ? 'ทั่วไป · แข็ง · พิมพ์เร็ว' : 'General · Rigid · Fast', price: '฿3/g', details: t.materials.items.PLA.details, bestFor: t.materials.items.PLA.bestFor },
    { id: 'PETG', name: 'PETG', icon: '💧', desc: lang === 'TH' ? 'ทนทาน · กันน้ำ' : 'Durable · Waterproof', price: '฿4/g', details: t.materials.items.PETG.details, bestFor: t.materials.items.PETG.bestFor },
    { id: 'ABS', name: 'ABS', icon: '🔥', desc: lang === 'TH' ? 'ทนร้อน · เหนียว' : 'High Heat · Tough', price: '฿4/g', details: t.materials.items.ABS.details, bestFor: t.materials.items.ABS.bestFor },
    { id: 'ASA', name: 'ASA', icon: '☀️', desc: lang === 'TH' ? 'ทน UV · กลางแจ้ง' : 'UV Resistant · Outdoor', price: '฿5/g', details: t.materials.items.ASA.details, bestFor: t.materials.items.ASA.bestFor },
    { id: 'TPU', name: 'TPU', icon: '👟', desc: lang === 'TH' ? 'ยืดหยุ่น · นุ่ม' : 'Flexible · Elastic', price: '฿6/g', details: t.materials.items.TPU.details, bestFor: t.materials.items.TPU.bestFor },
    { id: 'CarbonFiber', name: 'CarbonFiber', icon: '🛡️', desc: lang === 'TH' ? 'แข็งแรงพิเศษ · ดำด้าน' : 'High-Rigidity · Matte', price: '฿10/g', details: t.materials.items.CarbonFiber.details, bestFor: t.materials.items.CarbonFiber.bestFor },
    { id: 'Nylon', name: 'Nylon', icon: '⛓️', desc: lang === 'TH' ? 'ทนแรงเสียดสี · เหนียวมาก' : 'Low-Friction · Tough', price: '฿12/g', details: t.materials.items.Nylon.details, bestFor: t.materials.items.Nylon.bestFor },
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

        {/* INFO */}
        <section className="py-60 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-20 items-center">
            <div className="md:col-span-7">
              <h2 className="font-header text-[10vw] md:text-[8vw] leading-[0.8] uppercase tracking-tighter mb-16">
                Rapid<br/>Prototypes.
              </h2>
              <div className="aspect-video bg-white/5 rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 shadow-2xl">
                <img src="/media__1777429328508.png" alt="X1C" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col gap-12 pt-20">
               <p className="font-serif text-[4vw] md:text-[3vw] text-white/60 leading-[1.1] tracking-tight">
                Industrial grade machines for professional results.
               </p>
               <div className="aspect-[4/5] bg-white/5 rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 shadow-2xl">
                <img src="/media__1777365099190.png" alt="AMS" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* MATERIALS (REFINED LAYOUT) */}
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
                      <h4 className="font-header text-[10px] tracking-[0.4em] uppercase opacity-30 mb-6">{t.materials.details}</h4>
                      <p className="text-3xl md:text-4xl font-serif italic text-black/80 leading-[1.3] tracking-tight">{selectedMat.details}</p>
                    </div>
                    <div>
                      <h4 className="font-header text-[10px] tracking-[0.4em] uppercase opacity-30 mb-6">{t.materials.suitable}</h4>
                      <p className="font-body font-black text-lg uppercase tracking-tighter opacity-80 leading-relaxed">{selectedMat.bestFor}</p>
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
            Ready to<br/><span className="font-serif italic tracking-normal text-white/30 lowercase">the</span> materialize.
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
