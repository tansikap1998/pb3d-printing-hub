import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col text-white">

      {/* NAVBAR — single line, centered */}
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
              {num:'01',title:'อัปโหลดไฟล์',desc:'ลาก-วาง .STL ลงระบบ อ่านขนาดและ volume อัตโนมัติ',icon:<svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>},
              {num:'02',title:'เลือกสเปก',desc:'วัสดุ สี Layer Infill — ราคาปรับ realtime อัตโนมัติ',icon:<svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>},
              {num:'03',title:'ชำระ & รอรับ',desc:'สแกน QR PromptPay ทีมงานรับงานและจัดส่งภายใน 48h',icon:<svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>},
            ].map(s => (
              <div key={s.num} className="bg-white/[0.03] border border-white/8 rounded-2xl p-8 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all group">
                <div className="font-black text-6xl text-white/5 leading-none mb-5 group-hover:text-white/10 transition-colors">{s.num}</div>
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-4">{s.icon}</div>
                <h3 className="font-bold text-lg text-white mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MATERIALS */}
        <section id="materials" className="bg-white/[0.02] border-y border-white/5 px-6 py-20">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-3">วัสดุ</p>
              <h2 className="font-black text-4xl text-white mb-10">เลือกวัสดุ<br/>ตามงาน</h2>
              <div className="flex flex-col gap-2">
                {[
                  {name:'PLA', color:'#e2e8f0',desc:'ทั่วไป · แข็ง · พิมพ์เร็ว',price:'฿3/g'},
                  {name:'PETG',color:'#7dd3fc',desc:'กันน้ำ · ทนกระแทก',        price:'฿4/g'},
                  {name:'ABS', color:'#fbbf24',desc:'ทนความร้อนสูง',             price:'฿4/g'},
                  {name:'ASA', color:'#6ee7b7',desc:'ทน UV · กลางแจ้ง',         price:'฿5/g'},
                  {name:'TPU', color:'#f9a8d4',desc:'ยืดหยุ่น · นุ่ม',          price:'฿6/g'},
                ].map(m => (
                  <div key={m.name} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/8 rounded-xl hover:border-indigo-500/30 transition-all">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white/10" style={{background:m.color}} />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-white tracking-wide">{m.name}</span>
                      <span className="text-white/40 text-xs ml-3">{m.desc}</span>
                    </div>
                    <span className="font-bold text-indigo-400 text-sm">{m.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative">
              <img src="https://images.unsplash.com/photo-1609230307906-bde1477c3906?w=900&q=80" alt="filaments" className="w-full h-full object-cover brightness-75" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
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

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#818cf8" strokeWidth="1.5" fill="none"/>
              <circle cx="14" cy="14" r="2" fill="#818cf8"/>
            </svg>
            <span className="font-bold text-sm text-white">PB <span className="text-indigo-400">3D</span> Printing</span>
          </div>
          <p className="text-white/30 text-xs">© 2025 PB3D Printing · All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">Support</a>
            <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">Contact</a>
            <a href="#" className="text-white/30 text-xs hover:text-white/60 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
