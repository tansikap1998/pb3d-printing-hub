"use client"

import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col text-white">
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#818cf8" strokeWidth="1.5" fill="none"/>
              <polygon points="14,7 21,11 21,17 14,21 7,17 7,11" stroke="#818cf8" strokeWidth="1" fill="rgba(129,140,248,0.08)"/>
              <circle cx="14" cy="14" r="2.5" fill="#818cf8"/>
            </svg>
            <span className="font-bold text-[16px] tracking-wide whitespace-nowrap">
              PB <span className="text-indigo-400">3D</span> Printing
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            <a href="#how" className="text-sm text-white/50 hover:text-white transition-colors">วิธีใช้งาน</a>
            <a href="#materials" className="text-sm text-white/50 hover:text-white transition-colors">วัสดุ</a>
            <a href="#gallery" className="text-sm text-white/50 hover:text-white transition-colors">ตัวอย่างงาน</a>
          </div>
          <Link href="/upload" className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-all hover:shadow-lg hover:shadow-indigo-500/25 shrink-0">
            สั่งพิมพ์เลย →
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:"url('https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1600&q=85')"}} />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/50 to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/60" />
          <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage:'linear-gradient(rgba(129,140,248,1) 1px,transparent 1px),linear-gradient(90deg,rgba(129,140,248,1) 1px,transparent 1px)',backgroundSize:'52px 52px'}} />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 text-indigo-300 text-xs font-semibold tracking-widest uppercase mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              พิมพ์ 3D ออนไลน์ · ไม่ต้องรอแชท
            </div>
            <h1 className="font-black text-5xl md:text-7xl leading-[0.9] tracking-tight mb-6">
              <span className="block text-white">Bring Your</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">Ideas to Life</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
              อัปโหลดไฟล์ .STL เลือกวัสดุ — ระบบคำนวณราคาและเวลาพิมพ์อัตโนมัติทันที
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/upload" className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-4 rounded-xl text-base transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                อัปโหลดไฟล์ &amp; ประเมินราคา
              </Link>
              <a href="#how" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2">
                ดูวิธีใช้งาน
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
              </a>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5 max-w-md mx-auto">
              <div className="bg-[#0a0a0f]/80 backdrop-blur py-4 px-5 text-center">
                <div className="font-black text-2xl text-indigo-400">PLA</div>
                <div className="text-white/40 text-xs mt-0.5">เริ่ม ฿3/g</div>
              </div>
              <div className="bg-[#0a0a0f]/80 backdrop-blur py-4 px-5 text-center border-x border-white/5">
                <div className="font-black text-2xl text-indigo-400">X1C</div>
                <div className="text-white/40 text-xs mt-0.5">Bambu Lab</div>
              </div>
              <div className="bg-[#0a0a0f]/80 backdrop-blur py-4 px-5 text-center">
                <div className="font-black text-2xl text-indigo-400">48H</div>
                <div className="text-white/40 text-xs mt-0.5">จัดส่งเฉลี่ย</div>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTO GRID */}
        <section id="gallery" className="px-6 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-3 grid-rows-2 gap-3 h-[520px]">
            <div className="row-span-2 rounded-2xl overflow-hidden relative group">
              <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80" alt="3D printing" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
                <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">FDM Printing</span>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden relative group">
              <img src="https://images.unsplash.com/photo-1609230307906-bde1477c3906?w=600&q=80" alt="Filaments" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Filaments</span>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden relative group">
              <img src="https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=600&q=80" alt="Parts" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Precision Parts</span>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden relative group">
              <img src="https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80" alt="Design" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Custom Design</span>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden relative group">
              <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80" alt="Prototype" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 brightness-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-indigo-300 text-xs font-bold tracking-widest uppercase">Prototype</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="px-6 pb-24 max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-3">วิธีใช้งาน</p>
            <h2 className="font-black text-4xl text-white">3 ขั้นตอน สั่งพิมพ์ง่ายๆ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {num:'01',title:'อัปโหลดไฟล์',desc:'ลาก-วาง .STL หรือ .3MF ลงระบบ อ่านขนาดและ volume อัตโนมัติ'},
              {num:'02',title:'เลือกสเปก',desc:'วัสดุ สี Layer Infill — ราคาปรับ realtime อัตโนมัติ'},
              {num:'03',title:'ชำระ & รอรับ',desc:'สแกน QR PromptPay ทีมงานรับงานและจัดส่งภายใน 48h'},
            ].map(s => (
              <div key={s.num} className="bg-white/[0.03] border border-white/8 rounded-2xl p-8 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all group">
                <div className="font-black text-6xl text-white/5 leading-none mb-5 group-hover:text-white/10 transition-colors">{s.num}</div>
                <h3 className="font-bold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MATERIALS SECTION (INTERACTIVE) */}
        <section id="materials" className="bg-white/[0.02] border-y border-white/5 px-6 py-20">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-start">
            <div className="w-full lg:w-1/2">
              <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-3">วัสดุ</p>
              <h2 className="font-black text-4xl text-white mb-10">เลือกวัสดุตามงาน</h2>
              <div className="flex flex-col gap-3">
                {MATERIALS.map(m => (
                  <button key={m.id} 
                    onClick={() => setSelectedMat(m)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${selectedMat.id === m.id ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05]'}`}>
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">
                      {m.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-lg text-white tracking-wide">{m.name}</span>
                        <span className="font-black text-indigo-400">{m.price}</span>
                      </div>
                      <span className="text-white/40 text-sm">{m.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 lg:sticky lg:top-24">
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 lg:p-10 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-4xl">
                    {selectedMat.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-3xl text-white">{selectedMat.name}</h3>
                    <p className="text-indigo-400 font-bold">{selectedMat.desc}</p>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">รายละเอียดวัสดุ</h4>
                    <p className="text-white/70 leading-relaxed text-lg">{selectedMat.details}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">เหมาะสำหรับ</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-4 py-2 bg-white/5 rounded-full text-sm text-indigo-300 font-medium">
                        {selectedMat.bestFor}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">คุณสมบัติเด่น</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedMat.properties.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-white/60 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-10 pt-8 border-t border-white/5">
                  <Link href="/upload" className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-400 hover:text-white transition-all shadow-xl">
                    สั่งพิมพ์ด้วย {selectedMat.name} เลย →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-24 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-black text-5xl text-white mb-5 leading-tight">
              พร้อมพิมพ์?<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">อัปโหลดเลย</span>
            </h2>
            <p className="text-white/50 text-lg mb-10">ไม่ต้องสมัครสมาชิก · ไม่ต้องรอตอบ · รับราคาทันที</p>
            <Link href="/upload" className="inline-block bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-10 py-4 rounded-xl text-base transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5">
              เริ่มสั่งพิมพ์ →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-sm">PB <span className="text-indigo-400">3D</span> Printing</span>
          <p className="text-white/30 text-xs">© 2025 PB3D Printing · All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">Support</a>
            <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
