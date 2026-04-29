"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── INTERACTIVE BACKGROUND ───
const InteractiveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []
    const mouse = { x: 0, y: 0 }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number; opacity: number
      constructor(canvas: HTMLCanvasElement) {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 1.5 + 0.2
        this.speedX = Math.random() * 0.3 - 0.15
        this.speedY = Math.random() * 0.3 - 0.15
        this.opacity = Math.random() * 0.3 + 0.05
      }
      update(canvas: HTMLCanvasElement) {
        this.x += this.speedX
        this.y += this.speedY
        if (this.x > canvas.width) this.x = 0
        else if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        else if (this.y < 0) this.y = canvas.height
        
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 200) {
          this.x -= dx * 0.01
          this.y -= dy * 0.01
        }
      }
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const init = () => {
      particles = []
      for (let i = 0; i < 60; i++) particles.push(new Particle(canvas))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.update(canvas)
        p.draw(ctx)
      })
      animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    })

    handleResize()
    init()
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-20" />
}

const MATERIALS = [
  {
    id: 'PLA',
    name: 'PLA',
    icon: '🧊',
    desc: 'General · Rigid · Fast',
    price: '฿3/g',
    details: 'The standard for prototypes and visual models. High detail and easy to print.',
    bestFor: 'Decorative pieces, non-functional prototypes, architectural models.',
    properties: ['Ease of Use', 'Detail Accuracy', 'Eco-friendly']
  },
  {
    id: 'PETG',
    name: 'PETG',
    icon: '💧',
    desc: 'Durable · Waterproof',
    price: '฿4/g',
    details: 'Tougher than PLA with better chemical and moisture resistance. Great for functional parts.',
    bestFor: 'Mechanical parts, water containers, outdoor gear.',
    properties: ['Toughness', 'Chemical Resistance', 'UV Stable']
  },
  {
    id: 'CarbonFiber',
    name: 'CarbonFiber',
    icon: '🛡️',
    desc: 'High-Rigidity · Matte',
    price: '฿10/g',
    details: 'Extreme stiffness with a premium matte black finish. Reinforced with carbon fibers.',
    bestFor: 'Drones, RC parts, lightweight structural frames.',
    properties: ['Extreme Rigidity', 'Premium Finish', 'High Strength-to-Weight']
  },
  {
    id: 'Nylon',
    name: 'Nylon',
    icon: '⛓️',
    desc: 'Low-Friction · Tough',
    price: '฿12/g',
    details: 'The toughest engineering material for high-wear parts. Exceptional impact resistance.',
    bestFor: 'Gears, bearings, snap-fits, living hinges.',
    properties: ['Wear Resistance', 'Impact Strength', 'Industrial Performance']
  }
]

export default function Home() {
  const [selectedMat, setSelectedMat] = useState(MATERIALS[0])

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] selection:bg-white/20 font-sans">
      {/* FONTS INJECTION */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Cormorant+Garamond:ital,wght@1,600&family=Inter:wght@400;700;900&display=swap');
        
        .font-header { font-family: 'Anton', sans-serif; }
        .font-serif { font-family: 'Cormorant Garamond', serif; font-style: italic; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between mix-blend-difference">
        <Link href="/" className="font-header text-3xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <div className="hidden md:flex items-center gap-12 font-header text-xs tracking-widest uppercase">
          <a href="#about" className="hover:opacity-50 transition-opacity">About</a>
          <a href="#materials" className="hover:opacity-50 transition-opacity">Materials</a>
          <Link href="/upload" className="hover:opacity-50 transition-opacity">Order Now</Link>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/upload" className="font-header text-xs tracking-widest uppercase border border-white/20 px-6 py-2 rounded-full hover:bg-white hover:text-black transition-all">
            Start Project
          </Link>
        </div>
      </nav>

      <main>
        {/* HERO - STUDIO NAMMA STYLE */}
        <section className="relative min-h-screen flex flex-col justify-end px-8 pb-16 overflow-hidden">
          <InteractiveBackground />
          
          <div className="relative z-10 w-full">
            <div className="mb-8 opacity-40 font-header text-xs tracking-[0.5em] uppercase">
              The Digital Forge 2025
            </div>
            
            <h1 className="font-header text-[15vw] md:text-[18vw] leading-[0.8] uppercase tracking-tighter mix-blend-difference">
              Digital<br/>
              <span className="flex items-center gap-4">
                <span className="font-serif text-[12vw] md:text-[14vw] lowercase tracking-normal text-white/50">into</span>
                Physical
              </span>
            </h1>
            
            <div className="mt-12 flex flex-col md:flex-row justify-between items-end gap-12">
              <p className="max-w-md font-body text-white/40 text-base md:text-lg leading-relaxed">
                We bridge the gap between imagination and reality with industrial-grade 3D additive manufacturing. Fast, precise, and purely digital.
              </p>
              <div className="flex gap-4 font-header text-[10px] tracking-[0.3em] uppercase">
                <div className="flex flex-col gap-1">
                  <span className="text-white/20">Location</span>
                  <span>Thailand — BKK</span>
                </div>
                <div className="flex flex-col gap-1 ml-12">
                  <span className="text-white/20">System Status</span>
                  <span className="text-green-500">Online — 48H Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ASYMMETRICAL INFO SECTION */}
        <section className="py-40 px-8 border-t border-white/5">
          <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12">
            <div className="md:col-span-7">
              <h2 className="font-header text-7xl md:text-9xl leading-none uppercase tracking-tighter mb-12">
                Rapid<br/>Prototypes.
              </h2>
              <div className="aspect-[4/5] bg-white/5 rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="https://images.unsplash.com/photo-1631243350033-68d904f4340d?w=1200&q=80" alt="part" className="w-full h-full object-cover scale-110 hover:scale-100 transition-transform duration-1000" />
              </div>
            </div>
            <div className="md:col-span-5 md:pt-40 flex flex-col gap-12">
               <p className="font-serif text-4xl text-white/60 leading-tight">
                Our platform automates the bridge between CAD data and physical output. Zero friction, total precision.
               </p>
               <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000">
                <img src="https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=1000&q=80" alt="part" className="w-full h-full object-cover" />
              </div>
              <p className="font-body text-sm text-white/30 leading-relaxed max-w-sm">
                From biocompatible resins to high-temperature engineering plastics, we curate materials that empower designers to push the limits of what is possible.
              </p>
            </div>
          </div>
        </section>

        {/* MATERIALS - STUDIO NAMMA STYLE GRID */}
        <section id="materials" className="py-40 px-8 border-y border-white/5 bg-[#F2F2F2] text-black">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
              <h2 className="font-header text-7xl md:text-9xl leading-none uppercase tracking-tighter">
                Material<br/>Curated.
              </h2>
              <div className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40">
                Selection 01 — Engineering Plastics
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {MATERIALS.map((m, i) => (
                <div key={m.id} 
                  className={`group relative p-10 border border-black/10 transition-all duration-500 hover:bg-black hover:text-white flex flex-col justify-between aspect-[3/4] ${i % 2 !== 0 ? 'md:translate-y-20' : ''}`}>
                  <div className="flex justify-between items-start">
                    <span className="font-header text-6xl tracking-tighter">0{i+1}</span>
                    <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{m.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-header text-4xl uppercase mb-2">{m.name}</h3>
                    <p className="font-body text-xs opacity-50 uppercase tracking-widest font-bold mb-8">{m.desc}</p>
                    <p className="font-body text-sm leading-relaxed mb-8 opacity-0 group-hover:opacity-70 transition-opacity duration-500">
                      {m.details}
                    </p>
                    <div className="flex justify-between items-center pt-4 border-t border-black/10 group-hover:border-white/20">
                      <span className="font-header text-sm tracking-widest">{m.price}</span>
                      <Link href="/upload" className="font-header text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Choose →</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA - MASSIVE TEXT */}
        <section className="py-60 px-8 text-center flex flex-col items-center">
          <h2 className="font-header text-[10vw] leading-[0.8] uppercase tracking-tighter mb-16">
            Start<br/>
            <span className="font-serif italic tracking-normal text-white/30 lowercase">the</span> Flow.
          </h2>
          <Link href="/upload" className="group flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500 overflow-hidden">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:scale-125 transition-transform">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
            <span className="font-header text-xs tracking-[0.5em] uppercase opacity-40 group-hover:opacity-100 transition-opacity">Upload CAD</span>
          </Link>
        </section>
      </main>

      <footer className="py-20 px-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-end gap-12">
        <div className="flex flex-col gap-4">
          <span className="font-header text-4xl tracking-tighter uppercase">PB3D<span className="text-white/20">HUB</span></span>
          <p className="font-body text-xs text-white/30 uppercase tracking-[0.2em]">© 2025 ALL RIGHTS RESERVED.</p>
        </div>
        <div className="flex gap-20 font-header text-[10px] tracking-[0.3em] uppercase">
          <div className="flex flex-col gap-2">
            <span className="text-white/20">Contact</span>
            <a href="mailto:hello@pb3d.com" className="hover:opacity-50">hello@pb3d.com</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-white/20">Social</span>
            <a href="#" className="hover:opacity-50">Instagram</a>
            <a href="#" className="hover:opacity-50">Behance</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
