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
            <div className="h-[400px] w-[500px] rounded-[3rem] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 shadow-2xl bg-white/10 group border border-white/10 flex items-center justify-center">
              <img src={img} alt="PB3D Showcase" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-all duration-1000" onError={(e) => { e.currentTarget.style.display = 'none' }} />
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
  <div className="border-y border-white/5 py-14 flex flex-wrap justify-center items-center gap-12 md:gap-32">
    <div className="flex flex-col items-center gap-2">
      <span className="font-header text-4xl tracking-tighter">4.9/5.0</span>
      <span className="font-header text-[9px] tracking-[0.5em] uppercase opacity-30">{t.trust.rating}</span>
    </div>
    <div className="hidden md:block w-px h-12 bg-white/5" />
    <div className="flex flex-col items-center gap-2">
      <span className="font-header text-4xl tracking-tighter">10+</span>
      <span className="font-header text-[9px] tracking-[0.5em] uppercase opacity-30">{t.trust.years}</span>
    </div>
    <div className="hidden md:block w-px h-12 bg-white/5" />
    <div className="flex flex-col items-center gap-2">
      <span className="font-header text-4xl tracking-tighter">1,000+</span>
      <span className="font-header text-[9px] tracking-[0.5em] uppercase opacity-30">{t.trust.orders}</span>
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showFindFiles, setShowFindFiles] = useState(false)

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] selection:bg-white/20 font-sans overflow-x-hidden">

      <nav className={`fixed top-0 left-0 right-0 z-[100] px-8 py-8 flex items-center justify-between transition-all duration-500 ${isMenuOpen ? 'bg-black mix-blend-normal' : 'mix-blend-difference'}`}>
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none z-[101]">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-16 font-header text-xs tracking-[0.3em] uppercase">
          <a href="#how-it-works" className="hover:opacity-50 transition-opacity">{t.nav.howItWorks}</a>
          <a href="#materials" className="hover:opacity-50 transition-opacity">{t.nav.materials}</a>
          <Link href="/upload" className="hover:opacity-50 transition-opacity">{t.nav.order}</Link>
          <button onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')} className="hover:opacity-50 transition-opacity border-x border-white/10 px-6">
            {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
          </button>
        </div>

        {/* Hamburger Toggle */}
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden z-[101] flex flex-col gap-1.5 p-2">
          <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? 'opacity-0' : ''}`} />
          <div className={`w-8 h-0.5 bg-white transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>

        {/* Mobile Menu Overlay */}
        <div className={`fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center gap-12 transition-all duration-700 lg:hidden ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
          <div className="flex flex-col items-center gap-8 font-header text-2xl tracking-[0.2em] uppercase mt-20">
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="hover:text-white/40 transition-colors">{t.nav.howItWorks}</a>
            <a href="#materials" onClick={() => setIsMenuOpen(false)} className="hover:text-white/40 transition-colors">{t.nav.materials}</a>
            <Link href="/upload" onClick={() => setIsMenuOpen(false)} className="hover:text-white/40 transition-colors">{t.nav.order}</Link>
            <button onClick={() => { setLang(lang === 'TH' ? 'EN' : 'TH'); setIsMenuOpen(false); }} className="text-white/40 mt-4 border-t border-white/10 pt-8 w-full">
              {lang === 'TH' ? 'ENGLISH' : 'ภาษาไทย'}
            </button>
          </div>
          <Link href="/upload" onClick={() => setIsMenuOpen(false)} className="font-header text-xs tracking-[0.3em] uppercase bg-white text-black px-10 py-4 rounded-full mt-auto mb-16 max-w-[80vw] text-center truncate">
            {t.nav.start}
          </Link>
        </div>

        <Link href="/upload" className="hidden lg:block font-header text-xs tracking-[0.3em] uppercase border border-white/20 px-8 py-3 rounded-full hover:bg-white hover:text-black transition-all">
          {t.nav.start}
        </Link>
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

      <main>
        {/* HERO */}
        <section className="relative min-h-screen flex flex-col justify-end px-8 pb-20 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black">
             {/* Replace with actual concrete images when available */}
             <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 opacity-30 mix-blend-luminosity">
                <div className="bg-white/5 rounded-[2rem] overflow-hidden"><img src="/images/hero-1.png" alt="Products" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                <div className="bg-white/5 rounded-[2rem] overflow-hidden mt-12"><img src="/images/hero-2.png" alt="Products" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                <div className="bg-white/5 rounded-[2rem] overflow-hidden hidden md:block"><img src="/images/hero-3.png" alt="Products" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                <div className="bg-white/5 rounded-[2rem] overflow-hidden hidden md:block mt-24"><img src="/images/hero-4.png" alt="Products" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
             </div>
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
          </div>
          <InteractiveBackground />
          <div className="relative z-10 w-full max-w-7xl mx-auto">
            <div className="mb-6 opacity-40 font-header text-[12px] md:text-[14px] tracking-[0.6em] uppercase flex items-center gap-4">
              <span className="w-12 h-px bg-white/40"></span>
              {t.hero.subtitle}
            </div>
            <h1 className="font-header text-[clamp(4rem,15vw,10rem)] leading-[0.8] uppercase tracking-tighter mix-blend-difference relative">
              Digital<br/>
              <span className="font-serif italic text-[0.4em] normal-case tracking-normal text-white/60 ml-4 md:ml-12">
                {lang === 'TH' ? 'เข้าสู่' : 'into'}
              </span>
              Physical
            </h1>
            <p className="mt-8 font-header text-[1.2rem] md:text-[1.5rem] tracking-[0.1em] text-white/80 max-w-xl leading-relaxed">
              {t.hero.copyTag}
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Link href="/upload" className="w-full sm:w-auto bg-white text-black px-12 py-6 rounded-full font-header text-xs tracking-[0.3em] uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] text-center">
                📁 {t.hero.cta}
              </Link>
              <button onClick={() => setShowFindFiles(true)} className="w-full sm:w-auto bg-white/10 border border-white/20 text-white px-10 py-6 rounded-full font-header text-xs tracking-[0.3em] uppercase hover:bg-white/20 active:scale-95 transition-all text-center">
                🔍 {t.hero.ctaSearch}
              </button>
            </div>
            <div className="mt-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-12 border-t border-white/10 pt-10">
              <p className="max-w-xl font-body text-white/40 text-sm md:text-base leading-relaxed tracking-wide">{t.hero.desc}</p>
              <div className="flex gap-16 font-header text-[10px] tracking-[0.4em] uppercase">
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

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-40 px-8">
           <div className="max-w-7xl mx-auto">
              <div className="mb-24">
                <h2 className="font-header text-[clamp(3.5rem,10vw,8rem)] leading-none uppercase tracking-tighter mb-8">{t.howItWorks.title}</h2>
                <p className="font-serif text-2xl md:text-3xl text-white/60 lowercase">{t.howItWorks.subtitle}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { step: "01", title: t.howItWorks.step1Title, desc: t.howItWorks.step1Desc },
                  { step: "02", title: t.howItWorks.step2Title, desc: t.howItWorks.step2Desc },
                  { step: "03", title: t.howItWorks.step3Title, desc: t.howItWorks.step3Desc },
                  { step: "04", title: t.howItWorks.step4Title, desc: t.howItWorks.step4Desc },
                ].map((s, i) => (
                  <div key={i} className="group p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:bg-white/[0.05] transition-all relative overflow-hidden">
                    <span className="absolute -top-10 -right-10 font-header text-[10rem] leading-none opacity-20 group-hover:opacity-40 transition-all duration-700 pointer-events-none">{s.step}</span>
                    <span className="font-header text-[10px] tracking-[0.5em] opacity-20 group-hover:opacity-100 transition-opacity uppercase mb-8 block">{s.step}</span>
                    <h3 className="font-header text-2xl uppercase mt-8 mb-4 tracking-tighter leading-tight">{s.title}</h3>
                    <p className="font-body text-white/40 leading-relaxed text-xs">{s.desc}</p>
                  </div>
                ))}
              </div>
           </div>
        </section>

        {/* MARKETPLACE INTEGRATION */}
        <section className="py-40 px-8 overflow-hidden">
           <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
              <div>
                <h2 className="font-header text-[clamp(1.75rem,5vw,4rem)] leading-none uppercase tracking-tighter mb-8">
                  <span className="font-serif italic lowercase tracking-normal block text-[0.4em] mb-4 opacity-40">PB3D Hub</span>
                  {t.shopee.title}
                </h2>
                <p className="font-serif text-lg md:text-xl text-white/60 leading-relaxed mb-8">
                  {t.shopee.desc}
                </p>
                <div className="flex flex-wrap gap-4">
                  <a href="https://shopee.co.th/shop/9883965" target="_blank" className="inline-flex items-center gap-4 bg-[#EE4D2D] text-white font-header text-xs tracking-widest uppercase px-10 py-4 rounded-full hover:opacity-80 transition-all shadow-2xl">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.124 16.5c-.861 0-1.558.697-1.558 1.558s.697 1.558 1.558 1.558 1.558-.697 1.558-1.558-.697-1.558-1.558-1.558zm-11.666 0c-.861 0-1.558.697-1.558 1.558s.697 1.558 1.558 1.558 1.558-.697 1.558-1.558-.697-1.558-1.558-1.558zm13.14-11.644c-.38-.285-.855-.356-1.282-.19l-11.62 4.437c-.38.143-.665.474-.759.855l-2.09 9.12h17.1c.38 0 .712-.237.855-.57l1.52-7.6c.047-.285 0-.57-.143-.855l-3.581-5.207zM18.026 6.5l2.612 3.8H6.556l1.235-5.32 10.235-3.98L18.026 6.5z"/></svg>
                    {t.trust.shopeeCta}
                  </a>
                  <a href="https://www.facebook.com/share/1JPnWMk3md/?mibextid=wwXIfr" target="_blank" className="inline-flex items-center gap-4 bg-[#1877F2] text-white font-header text-xs tracking-widest uppercase px-10 py-4 rounded-full hover:opacity-80 transition-all shadow-2xl">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                    {t.trust.facebookCta}
                  </a>
                </div>
              </div>
              <div className="w-full relative h-[500px] overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#000000] to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#000000] to-transparent z-10 pointer-events-none" />
                <div className="flex flex-col animate-marquee-vertical group-hover:[animation-play-state:paused]">
                  {[...t.shopee.reviews, ...t.shopee.reviews].map((rev: string, i: number) => (
                    <div key={i} className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:bg-white/10 transition-all mb-4 mx-2">
                      <div className="flex gap-1 mb-4 text-orange-400">
                        {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                      </div>
                      <p className="font-serif italic text-xl text-white/80">"{rev}"</p>
                    </div>
                  ))}
                </div>
              </div>
           </div>
           <style jsx>{`
             @keyframes marqueeVertical {
               0% { transform: translateY(0); }
               100% { transform: translateY(-50%); }
             }
             .animate-marquee-vertical {
               animation: marqueeVertical 30s linear infinite;
             }
           `}</style>
        </section>

        {/* MATERIALS */}
        <section id="materials" className="py-60 px-8 border-y border-white/5 bg-[#F2F2F2] text-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-10">
              <h2 className="font-header text-[clamp(2.5rem,6vw,5rem)] leading-none uppercase tracking-tighter">{t.materials.title}</h2>
              <div className="font-header text-[10px] md:text-[12px] tracking-[0.4em] uppercase opacity-40">{t.materials.subtitle}</div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-12 items-stretch">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                      <p className="text-xl md:text-2xl font-serif italic text-black/80 leading-[1.8] tracking-normal break-words">{selectedMat.details}</p>
                    </div>
                    <div>
                      <h4 className="font-header text-[10px] tracking-[0.4em] uppercase opacity-30 mb-6">เหมาะสำหรับ (BEST FOR)</h4>
                      <p className="font-body font-black text-lg md:text-xl uppercase tracking-wide opacity-80 leading-relaxed break-words">{selectedMat.bestFor}</p>
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
          <h2 className="font-header text-[clamp(4.5rem,15vw,14rem)] leading-[0.8] uppercase tracking-tighter mb-32 max-w-5xl">
            พร้อมหรือยังที่จะ<br/>
            <span className="font-serif italic tracking-normal text-white/10 lowercase block my-4">ทำให้</span>
            จินตนาการเป็นจริง.
          </h2>
          <Link href="/upload" className="group flex flex-col items-center gap-6">
            <div className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700 shadow-2xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
            </div>
            <span className="font-header text-[12px] tracking-[0.6em] uppercase opacity-30 group-hover:opacity-100 transition-opacity">{t.nav.order}</span>
          </Link>
        </section>
      </main>

      <footer className="py-20 px-8 border-t border-white/5 flex flex-col items-center gap-10 text-white/20">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="font-header text-4xl tracking-tighter uppercase text-white">PB3D<span className="opacity-10">HUB</span></span>
          <p className="font-body text-[10px] uppercase tracking-[0.3em] font-bold">© 2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 font-header text-[10px] tracking-[0.5em] uppercase">
          <a href="https://shopee.co.th/shop/9883965" target="_blank" className="hover:text-white transition-colors">SHOPEE</a>
          <a href="https://www.facebook.com/share/1JPnWMk3md/?mibextid=wwXIfr" target="_blank" className="hover:text-white transition-colors">FACEBOOK</a>
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
