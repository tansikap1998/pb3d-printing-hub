"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── INTERACTIVE BACKGROUND COMPONENT ───
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
        this.size = Math.random() * 1.5 + 0.5
        this.speedX = Math.random() * 0.5 - 0.25
        this.speedY = Math.random() * 0.5 - 0.25
        this.opacity = Math.random() * 0.5 + 0.1
      }
      update(canvas: HTMLCanvasElement) {
        this.x += this.speedX
        this.y += this.speedY
        if (this.x > canvas.width) this.x = 0
        else if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        else if (this.y < 0) this.y = canvas.height
        
        // Interaction with mouse
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < 150) {
          this.x -= dx * 0.02
          this.y -= dy * 0.02
        }
      }
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(129, 140, 248, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const init = () => {
      particles = []
      for (let i = 0; i < 80; i++) particles.push(new Particle(canvas))
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.update(canvas)
        p.draw(ctx)
      })
      
      // Draw lines between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < 120) {
            ctx.strokeStyle = `rgba(129, 140, 248, ${0.15 - distance/800})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
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

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40" />
}

const MATERIALS = [
  {
    id: 'PLA',
    name: 'PLA',
    icon: '🧊',
    desc: 'ทั่วไป · แข็ง · พิมพ์เร็ว',
    price: '฿3/g',
    color: '#e2e8f0',
    details: 'วัสดุยอดนิยมที่สุด พิมพ์ง่าย ผิวสวย เหมาะสำหรับโมเดลตั้งโชว์ ฟิกเกอร์ หรือชิ้นงานที่ไม่ต้องรับแรงกระแทกสูง',
    bestFor: 'ของตกแต่งบ้าน, โมเดลต้นแบบ, อุปกรณ์สำนักงาน',
    properties: ['พิมพ์ง่าย', 'ผิวละเอียด', 'เป็นมิตรกับสิ่งแวดล้อม']
  },
  {
    id: 'PETG',
    name: 'PETG',
    icon: '💧',
    desc: 'กันน้ำ · ทนกระแทก',
    price: '฿4/g',
    color: '#7dd3fc',
    details: 'มีความเหนียวและทนทานกว่า PLA ทนต่อสารเคมีและกันน้ำได้ดี เหมาะสำหรับงานที่ต้องใช้งานจริงกลางแจ้งหรือโดนน้ำ',
    bestFor: 'อะไหล่เครื่องจักร, กระถางต้นไม้, อุปกรณ์ตกแต่งรถ',
    properties: ['ทนทาน', 'กันน้ำ', 'ทนสารเคมี']
  },
  {
    id: 'ABS',
    name: 'ABS',
    icon: '🔥',
    desc: 'ทนความร้อนสูง',
    price: '฿4/g',
    color: '#fbbf24',
    details: 'วัสดุเกรดอุตสาหกรรม ทนความร้อนและแรงเสียดสีได้ดีเยี่ยม สามารถขัดแต่งผิวได้ง่ายด้วยน้ำยาอะซิโตน',
    bestFor: 'กล่องวงจรไฟฟ้า, อุปกรณ์ในห้องเครื่อง, ตัวต่อของเล่น',
    properties: ['ทนความร้อน', 'เหนียว', 'ตกแต่งผิวได้']
  },
  {
    id: 'CarbonFiber',
    name: 'CarbonFiber',
    icon: '🛡️',
    desc: 'แข็งแรงพิเศษ · ดำด้าน',
    price: '฿10/g',
    color: '#111111',
    details: 'ผสมเส้นใยคาร์บอนเพื่อให้มีความแข็งแกร่ง (Rigid) สูงมาก ไม่ยืดหยุ่น ผิวสัมผัสมีความสากและดำด้านพรีเมียม',
    bestFor: 'โดรน, อุปกรณ์ RC, ชิ้นส่วนโครงสร้างเบาแต่แข็งแรง',
    properties: ['แข็งแกร่งมาก', 'น้ำหนักเบา', 'ผิวด้านสวยงาม']
  },
  {
    id: 'Nylon',
    name: 'Nylon',
    icon: '⛓️',
    desc: 'ทนแรงเสียดสี · เหนียวมาก',
    price: '฿12/g',
    color: '#ffffff',
    details: 'วัสดุที่มีความเหนียวและทนต่อแรงเสียดทานสูงสุด เหมาะสำหรับทำเฟืองหรือชิ้นส่วนที่ต้องมีการเคลื่อนที่ตลอดเวลา',
    bestFor: 'เฟือง, บูช, ข้อต่อรับแรงดัน',
    properties: ['ทนแรงเสียดสี', 'เหนียวพิเศษ', 'รับแรงกระแทกได้ดี']
  },
  {
    id: 'TPU',
    name: 'TPU',
    icon: '👟',
    desc: 'ยืดหยุ่น · นุ่ม',
    price: '฿6/g',
    color: '#f9a8d4',
    details: 'วัสดุที่มีลักษณะคล้ายยาง ยืดหยุ่นได้สูง บิดงอได้โดยไม่เสียรูปทรง รับแรงกระแทกได้ดีเยี่ยม',
    bestFor: 'เคสมือถือ, ซีลกันรั่ว, ล้อรถบังคับ',
    properties: ['ยืดหยุ่น', 'กันกระแทก', 'ทนการฉีกขาด']
  }
]

export default function Home() {
  const [selectedMat, setSelectedMat] = useState(MATERIALS[0])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col text-white selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#818cf8" strokeWidth="2" fill="none"/>
              <circle cx="14" cy="14" r="2.5" fill="#818cf8"/>
            </svg>
            <span className="font-bold text-sm tracking-widest uppercase">
              PB <span className="text-indigo-400">3D</span> HUB
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <a href="#how" className="text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Process</a>
            <a href="#materials" className="text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Materials</a>
            <a href="#gallery" className="text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">Gallery</a>
          </div>
          <Link href="/upload" className="bg-white text-black font-black px-5 py-2 rounded-full text-[11px] uppercase tracking-wider hover:bg-indigo-400 hover:text-white transition-all">
            Order Now
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* HERO SECTION (MINIMALIST & ANIMATED) */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
          <InteractiveBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/20 to-[#0a0a0f]" />
          
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Future of Manufacturing
            </div>
            <h1 className="font-black text-6xl md:text-8xl leading-tight tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Design, Upload,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-300 to-white">Materialize.</span>
            </h1>
            <p className="text-white/40 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
              ระบบประเมินราคา 3D Printing อัตโนมัติที่แม่นยำและรวดเร็วที่สุด 
              รองรับวัสดุวิศวกรรมครบวงจร จัดส่งทั่วประเทศภายใน 48 ชั่วโมง
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
              <Link href="/upload" className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-10 py-5 rounded-2xl text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/20">
                Get Started
              </Link>
              <a href="#how" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black px-10 py-5 rounded-2xl text-sm uppercase tracking-widest transition-all">
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* PHOTO GRID (MINIMALIST PRODUCT FOCUS) */}
        <section id="gallery" className="px-6 pb-32 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-auto md:h-[600px]">
            <div className="md:col-span-2 md:row-span-2 rounded-3xl overflow-hidden bg-white/5 border border-white/5 group relative">
              <img src="https://images.unsplash.com/photo-1631243350033-68d904f4340d?w=1000&q=80" alt="3D Printed Part" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-1000 grayscale group-hover:grayscale-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Engineering</p>
                <h3 className="text-2xl font-black">Precision Engineering</h3>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden bg-white/5 border border-white/5 group relative">
              <img src="https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=600&q=80" alt="Material" className="w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-all duration-1000" />
              <div className="absolute bottom-6 left-6 text-sm font-bold uppercase tracking-widest">Matte Black</div>
            </div>
            <div className="rounded-3xl overflow-hidden bg-white/5 border border-white/5 group relative">
              <img src="https://images.unsplash.com/photo-1581092162384-8987c1794714?w=600&q=80" alt="Filament" className="w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-all duration-1000" />
              <div className="absolute bottom-6 left-6 text-sm font-bold uppercase tracking-widest">Carbon Fiber</div>
            </div>
            <div className="md:col-span-2 rounded-3xl overflow-hidden bg-white/5 border border-white/5 group relative">
              <img src="https://images.unsplash.com/photo-1543412849-063870631f49?w=800&q=80" alt="Abstract 3D" className="w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-all duration-1000" />
              <div className="absolute bottom-8 left-8 text-xl font-bold uppercase tracking-widest">Minimal Prototypes</div>
            </div>
          </div>
        </section>

        {/* MATERIALS SECTION (INTERACTIVE) */}
        <section id="materials" className="bg-white/[0.01] border-y border-white/5 px-6 py-32">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-20 items-start">
            <div className="w-full lg:w-1/2">
              <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6">
                Material Library
              </div>
              <h2 className="font-black text-5xl text-white mb-12">Industrial Grade<br/>Filaments.</h2>
              <div className="flex flex-col gap-3">
                {MATERIALS.map(m => (
                  <button key={m.id} 
                    onClick={() => setSelectedMat(m)}
                    className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all text-left ${selectedMat.id === m.id ? 'bg-white/5 border-white/20' : 'bg-transparent border-transparent grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
                      {m.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-xl text-white tracking-tight">{m.name}</span>
                        <span className="font-black text-indigo-400">{m.price}</span>
                      </div>
                      <span className="text-white/40 text-xs uppercase tracking-widest font-bold">{m.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 lg:sticky lg:top-32">
              <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-10 lg:p-14 transition-all duration-500">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-5xl">
                    {selectedMat.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-4xl text-white tracking-tighter">{selectedMat.name}</h3>
                    <p className="text-indigo-400 text-sm font-black uppercase tracking-widest">{selectedMat.desc}</p>
                  </div>
                </div>
                
                <div className="space-y-10">
                  <div>
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Description</h4>
                    <p className="text-white/70 leading-relaxed text-xl font-medium">{selectedMat.details}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Applications</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-5 py-2.5 bg-white/5 rounded-2xl text-sm text-indigo-300 font-bold border border-white/5">
                        {selectedMat.bestFor}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Technical Properties</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedMat.properties.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/50 text-xs font-bold uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-indigo-500/40" />
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 pt-10 border-t border-white/5">
                  <Link href="/upload" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all text-sm uppercase tracking-widest shadow-xl">
                    Upload & Print with {selectedMat.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-40 text-center relative overflow-hidden">
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="font-black text-6xl md:text-7xl text-white mb-8 leading-[1.1] tracking-tighter">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">Create?</span>
            </h2>
            <p className="text-white/40 text-lg mb-12 font-medium max-w-md mx-auto">
              Start your next project today with our automated pricing system. 
              No hidden fees, no wait times.
            </p>
            <Link href="/upload" className="inline-block bg-white text-black font-black px-12 py-5 rounded-2xl text-sm uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-2xl">
              Launch Upload App →
            </Link>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        </section>
      </main>

      <footer className="border-t border-white/5 px-6 py-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
            </div>
            <span className="font-black text-xs uppercase tracking-[0.2em]">PB3D <span className="text-white/30">Hub</span></span>
          </div>
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">© 2025 PB3D Printing Technology. All rights reserved.</p>
          <div className="flex gap-10">
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-indigo-400 transition-colors">Instagram</a>
            <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-indigo-400 transition-colors">Line</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
