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

export default function Home() {
  const [lang, setLang] = useState<Language>('TH')
  const t = translations[lang]

  const MATERIALS = [
    {
      id: 'PLA', name: 'PLA', icon: '🧊', desc: lang === 'TH' ? 'ทั่วไป · แข็ง · พิมพ์เร็ว' : 'General · Rigid · Fast', price: '฿3/g',
      details: t.materials.items.PLA.details,
      bestFor: t.materials.items.PLA.bestFor,
      properties: lang === 'TH' ? ['พิมพ์ง่าย', 'ผิวละเอียด', 'เป็นมิตรกับสิ่งแวดล้อม'] : ['Ease of Use', 'Detail Accuracy', 'Eco-friendly']
    },
    {
      id: 'PETG', name: 'PETG', icon: '💧', desc: lang === 'TH' ? 'ทนทาน · กันน้ำ' : 'Durable · Waterproof', price: '฿4/g',
      details: t.materials.items.PETG.details,
      bestFor: t.materials.items.PETG.bestFor,
      properties: lang === 'TH' ? ['ทนทาน', 'กันน้ำ', 'ทนสารเคมี'] : ['Toughness', 'Chemical Resistance', 'UV Stable']
    },
    {
      id: 'CarbonFiber', name: 'CarbonFiber', icon: '🛡️', desc: lang === 'TH' ? 'แข็งแรงพิเศษ · ดำด้าน' : 'High-Rigidity · Matte', price: '฿10/g',
      details: t.materials.items.CarbonFiber.details,
      bestFor: t.materials.items.CarbonFiber.bestFor,
      properties: lang === 'TH' ? ['แข็งแกร่งมาก', 'น้ำหนักเบา', 'ผิวด้านพรีเมียม'] : ['Extreme Rigidity', 'Premium Finish', 'High Strength']
    },
    {
      id: 'Nylon', name: 'Nylon', icon: '⛓️', desc: lang === 'TH' ? 'ทนแรงเสียดสี · เหนียวมาก' : 'Low-Friction · Tough', price: '฿12/g',
      details: t.materials.items.Nylon.details,
      bestFor: t.materials.items.Nylon.bestFor,
      properties: lang === 'TH' ? ['ทนแรงเสียดสี', 'เหนียวพิเศษ', 'รับแรงกระแทก'] : ['Wear Resistance', 'Impact Strength', 'Industrial']
    }
  ]

  const [selectedMat, setSelectedMat] = useState(MATERIALS[0])

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] selection:bg-white/20 font-sans">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Cormorant+Garamond:ital,wght@1,600&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-serif { font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between mix-blend-difference">
        <Link href="/" className="font-header text-3xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <div className="hidden md:flex items-center gap-12 font-header text-xs tracking-widest uppercase">
          <a href="#materials" className="hover:opacity-50 transition-opacity">{t.nav.materials}</a>
          <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="hover:opacity-50 transition-opacity border-x border-white/10 px-4">
            {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
          </button>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/upload" className="font-header text-xs tracking-widest uppercase border border-white/20 px-6 py-2 rounded-full hover:bg-white hover:text-black transition-all">
            {t.nav.start}
          </Link>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="relative min-h-screen flex flex-col justify-end px-8 pb-16 overflow-hidden">
          <InteractiveBackground />
          <div className="relative z-10 w-full">
            <div className="mb-8 opacity-40 font-header text-xs tracking-[0.5em] uppercase">{t.hero.subtitle}</div>
            <h1 className="font-header text-[12vw] md:text-[15vw] leading-[0.8] uppercase tracking-tighter mix-blend-difference">
              Digital<br/>
              <span className="flex items-center gap-4">
                <span className="font-serif text-[10vw] md:text-[12vw] lowercase tracking-normal text-white/50">{lang === 'TH' ? 'เข้าสู่' : 'into'}</span>
                Physical
              </span>
            </h1>
            <div className="mt-12 flex flex-col md:flex-row justify-between items-end gap-12">
              <p className="max-w-md font-body text-white/40 text-base md:text-lg leading-relaxed">{t.hero.desc}</p>
              <div className="flex gap-4 font-header text-[10px] tracking-[0.3em] uppercase">
                <div className="flex flex-col gap-1">
                  <span className="text-white/20">Studio</span>
                  <span>BKK — TH</span>
                </div>
                <div className="flex flex-col gap-1 ml-12">
                  <span className="text-white/20">{t.hero.status}</span>
                  <span className="text-green-500">{t.hero.online}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 01: MACHINE FOCUS */}
        <section className="py-40 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7">
              <h2 className="font-header text-7xl md:text-9xl leading-none uppercase tracking-tighter mb-12">
                Precision<br/>Engineered.
              </h2>
              <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="/media__1777429328508.png" alt="Bambu Lab X1C" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col gap-8">
               <p className="font-serif text-4xl text-white/60 leading-tight">
                Industrial grade machines for professional results.
               </p>
               <div className="aspect-[4/5] bg-white/5 rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="/media__1777365099190.png" alt="AMS System" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 02: PRODUCT GALLERY (FULL WIDTH) */}
        <section className="py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
             <div className="aspect-[4/5] rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="/media__1777363717739.png" alt="Product" className="w-full h-full object-cover" />
             </div>
             <div className="aspect-[4/5] md:translate-y-20 rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="/media__1777363626244.png" alt="Product" className="w-full h-full object-cover" />
             </div>
             <div className="aspect-[4/5] rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="/media__1777363653135.png" alt="Product" className="w-full h-full object-cover" />
             </div>
          </div>
        </section>

        {/* MATERIALS SECTION (UPGRADED) */}
        <section id="materials" className="py-40 px-8 border-y border-white/5 bg-[#F2F2F2] text-black mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
              <h2 className="font-header text-7xl md:text-9xl leading-none uppercase tracking-tighter">{t.materials.title}</h2>
              <div className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40">{t.materials.subtitle}</div>
            </div>
            <div className="grid lg:grid-cols-2 gap-20">
              <div className="grid md:grid-cols-2 gap-4">
                {MATERIALS.map((m, i) => (
                  <button key={m.id} onClick={() => setSelectedMat(m)}
                    className={`group relative p-10 border border-black/10 transition-all duration-500 flex flex-col justify-between aspect-[3/4] rounded-3xl ${selectedMat.id === m.id ? 'bg-black text-white' : 'hover:bg-black/5'}`}>
                    <div className="flex justify-between items-start">
                      <span className="font-header text-6xl tracking-tighter">0{i+1}</span>
                      <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{m.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-header text-4xl uppercase mb-2">{m.name}</h3>
                      <p className="font-body text-[10px] opacity-50 uppercase tracking-widest font-bold">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="bg-black/5 p-12 rounded-[3rem] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-6 mb-12">
                    <div className="w-24 h-24 bg-black text-white flex items-center justify-center text-5xl rounded-3xl">{selectedMat.icon}</div>
                    <h3 className="font-header text-5xl uppercase tracking-tighter">{selectedMat.name}</h3>
                  </div>
                  <div className="space-y-12">
                    <div>
                      <h4 className="font-header text-[10px] tracking-widest uppercase opacity-30 mb-4">{t.materials.details}</h4>
                      <p className="text-3xl font-serif italic text-black/80 leading-snug">{selectedMat.details}</p>
                    </div>
                    <div>
                      <h4 className="font-header text-[10px] tracking-widest uppercase opacity-30 mb-4">{t.materials.suitable}</h4>
                      <p className="font-body font-black text-xl uppercase tracking-tight">{selectedMat.bestFor}</p>
                    </div>
                  </div>
                </div>
                <Link href="/upload" className="mt-16 bg-black text-white font-header text-sm tracking-[0.2em] uppercase py-7 text-center rounded-2xl hover:opacity-80 transition-all shadow-2xl">
                  {t.materials.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-60 px-8 text-center flex flex-col items-center">
          <h2 className="font-header text-[8vw] leading-[0.8] uppercase tracking-tighter mb-16">
            Ready to<br/><span className="font-serif italic tracking-normal text-white/30 lowercase">the</span> materialize.
          </h2>
          <Link href="/upload" className="group flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            </div>
            <span className="font-header text-[10px] tracking-[0.5em] uppercase opacity-40 group-hover:opacity-100">{t.nav.order}</span>
          </Link>
        </section>
      </main>

      <footer className="py-20 px-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-end gap-12 text-white/40">
        <div className="flex flex-col gap-4">
          <span className="font-header text-4xl tracking-tighter uppercase text-white">PB3D<span className="opacity-20">HUB</span></span>
          <p className="font-body text-[10px] uppercase tracking-[0.2em]">© 2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="flex gap-10 font-header text-[10px] tracking-[0.3em] uppercase">
          <a href="#" className="hover:text-white">Instagram</a>
          <a href="#" className="hover:text-white">Facebook</a>
        </div>
      </footer>
    </div>
  )
}
