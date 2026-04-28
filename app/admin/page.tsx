"use client"
import { useState, useEffect } from "react"

interface Order {
  id: string; createdAt: string; status: string
  customer: { name: string; email: string; phone: string; address: string }
  items: { fileName: string; material: string; technology: string; color: string; infill: number; layerHeight: number; quantity: number; notes: string }
  pricing: { total: number; weightG: number; printTimeMin: number }
  delivery: { trackingNumber: string | null }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "⏳ รอยืนยัน",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  confirmed: { label: "✅ ยืนยันแล้ว", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  printing:  { label: "🖨️ กำลังพิมพ์", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  shipped:   { label: "🚚 จัดส่งแล้ว", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  delivered: { label: "📦 ส่งถึงแล้ว", color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  cancelled: { label: "❌ ยกเลิก",     color: "text-red-700",    bg: "bg-red-50 border-red-200" },
}

const STATUS_FLOW = ["pending","confirmed","printing","shipped","delivered"]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH",{day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [lastRefresh, setLastRefresh] = useState("")
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const ADMIN_PW = "pb3dadmin"

  const loadOrders = () => {
    try {
      const raw = localStorage.getItem("pb3d_orders")
      if (raw) setOrders(JSON.parse(raw))
    } catch {}
    setLastRefresh(new Date().toLocaleTimeString("th-TH"))
  }

  useEffect(() => { if (authed) { loadOrders(); const t = setInterval(loadOrders, 15000); return () => clearInterval(t) } }, [authed])

  const saveOrders = (updated: Order[]) => {
    setOrders(updated)
    localStorage.setItem("pb3d_orders", JSON.stringify(updated))
  }

  const sendStatusEmail = (order: Order, newStatus: string) => {
    const statusTH: Record<string,string> = {
      confirmed: "✅ ยืนยันรับออเดอร์แล้ว",
      printing:  "🖨️ เริ่มพิมพ์ชิ้นงานของคุณแล้ว",
      shipped:   "🚚 จัดส่งพัสดุแล้ว",
      delivered: "📦 พัสดุส่งถึงปลายทางแล้ว",
      cancelled: "❌ ยกเลิกคำสั่งซื้อ",
    }
    const tracking = order.delivery.trackingNumber
    const subject = `[PB3D] ${statusTH[newStatus]||newStatus} — Order #${order.id}`
    const body = `เรียนคุณ ${order.customer.name}\n\n${statusTH[newStatus]||newStatus}\n\nORDER: #${order.id}\nไฟล์: ${order.items.fileName}\nวัสดุ: ${order.items.material} × ${order.items.quantity} ชิ้น\nราคา: ${order.pricing.total} THB${newStatus==="shipped"&&tracking?"\n\n📮 เลขพัสดุ: "+tracking:""}${newStatus==="cancelled"?"\n\nหากมีข้อสงสัยติดต่อ Line @pb3dprint":""}\n\nขอบคุณที่ใช้บริการ PB3D Printing`
    window.open(`mailto:${order.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank")
  }

  const updateStatus = (id: string, newStatus: string) => {
    if (newStatus === "shipped") {
      const tracking = trackingInputs[id]?.trim()
      if (!tracking) { alert("กรุณากรอกเลขพัสดุก่อน"); return }
    }
    const updated = orders.map(o => {
      if (o.id !== id) return o
      const tracking = newStatus === "shipped" ? (trackingInputs[id] || null) : o.delivery.trackingNumber
      return { ...o, status: newStatus, delivery: { ...o.delivery, trackingNumber: tracking } }
    })
    saveOrders(updated)
    const order = updated.find(o => o.id === id)
    if (order) sendStatusEmail(order, newStatus)
  }

  const counts = orders.reduce((acc,o)=>{acc[o.status]=(acc[o.status]||0)+1;return acc},{} as Record<string,number>)
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)
  const pendingCount = counts["pending"] || 0

  if (!authed) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="bg-[#1e1e2e] rounded-2xl p-8 w-80 shadow-2xl border border-white/10">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚙️</div>
          <h1 className="text-white font-black text-xl">Admin Login</h1>
          <p className="text-gray-400 text-sm mt-1">PB3D Printing Hub</p>
        </div>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&pw===ADMIN_PW&&setAuthed(true)}
          placeholder="รหัสผ่าน" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 mb-4"/>
        <button onClick={()=>pw===ADMIN_PW?setAuthed(true):alert("รหัสผ่านไม่ถูกต้อง")}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition">
          เข้าสู่ระบบ
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1e1e2e] h-14 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <a href="/" className="text-white font-bold">PB<span className="text-violet-400">3D</span></a>
          <span className="text-gray-600">/</span>
          <span className="text-violet-300 font-bold text-sm">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">อัปเดต {lastRefresh}</span>
          <button onClick={loadOrders} className="border border-gray-600 text-gray-300 px-3 py-1 rounded-lg text-xs hover:border-violet-400 transition">↻ รีเฟรช</button>
          <a href="/upload" className="border border-gray-600 text-gray-300 px-3 py-1 rounded-lg text-xs hover:border-violet-400 transition">หน้าสั่งซื้อ</a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          {[
            { key:"all",   label:"ทั้งหมด",    num: orders.length,             color:"text-gray-800" },
            { key:"pending",   label:"รอยืนยัน",   num: counts.pending||0,   color:"text-amber-600" },
            { key:"confirmed", label:"ยืนยันแล้ว", num: counts.confirmed||0, color:"text-blue-600" },
            { key:"printing",  label:"กำลังพิมพ์", num: counts.printing||0,  color:"text-purple-600" },
            { key:"shipped",   label:"จัดส่งแล้ว", num: counts.shipped||0,   color:"text-orange-600" },
            { key:"delivered", label:"ส่งถึงแล้ว", num: counts.delivered||0, color:"text-green-600" },
          ].map(s=>(
            <button key={s.key} onClick={()=>setFilter(s.key)}
              className={`bg-white border rounded-2xl p-4 text-center transition hover:shadow-md ${filter===s.key?"border-violet-400 shadow-md":"border-gray-200"}`}>
              <div className={`font-black text-3xl ${s.color}`}>{s.num}</div>
              <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            </button>
          ))}
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-5 flex items-center gap-3">
            <span className="text-amber-600 font-bold">⚠️ มีออเดอร์รอยืนยัน {pendingCount} รายการ</span>
          </div>
        )}

        {/* Orders */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-16 text-center text-gray-400 border border-gray-100">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-bold text-lg text-gray-600">ไม่มีออเดอร์</p>
            </div>
          )}
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const statusIdx = STATUS_FLOW.indexOf(order.status)
            const isExpanded = expanded === order.id
            return (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                {/* Header row */}
                <div className="px-6 py-4 flex items-center gap-4 cursor-pointer" onClick={()=>setExpanded(isExpanded?null:order.id)}>
                  <span className="font-mono text-sm font-bold text-violet-600 shrink-0">#{order.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{order.customer.name}</p>
                    <p className="text-gray-400 text-xs">{order.customer.email}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.color} shrink-0`}>{sc.label}</div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg text-gray-900">{order.pricing.total} THB</p>
                    <p className="text-gray-400 text-xs">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className="text-gray-400 text-sm">{isExpanded?"▲":"▼"}</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-6">
                    <div className="grid grid-cols-2 gap-8 mb-6">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">📦 รายละเอียดงาน</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">ไฟล์</span><span className="font-medium">{order.items.fileName}</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">วัสดุ</span><span className="font-medium">{order.items.material} ({order.items.technology})</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">สี</span><span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border border-gray-200 inline-block" style={{background:order.items.color}}/>{order.items.color}</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Layer</span><span className="font-medium">{order.items.layerHeight}mm</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">Infill</span><span className="font-medium">{order.items.infill}%</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">จำนวน</span><span className="font-medium">{order.items.quantity} ชิ้น</span></div>
                          {order.items.notes && <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">หมายเหตุ</span><span className="font-medium">{order.items.notes}</span></div>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">👤 ลูกค้า</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">ชื่อ</span><span className="font-medium">{order.customer.name}</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">อีเมล</span><a href={`mailto:${order.customer.email}`} className="font-medium text-violet-600 hover:underline">{order.customer.email}</a></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">โทร</span><span className="font-medium">{order.customer.phone}</span></div>
                          <div className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">ที่อยู่</span><span className="font-medium">{order.customer.address}</span></div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 mt-5">💰 ราคา</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-gray-400">น้ำหนัก</span><span>{order.pricing.weightG} g</span></div>
                          <div className="flex justify-between"><span className="text-gray-400">เวลาพิมพ์</span><span>{order.pricing.printTimeMin} นาที</span></div>
                          <div className="flex justify-between font-black text-base"><span>รวม</span><span className="text-violet-600">{order.pricing.total} THB</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Tracking */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">🚚 เลขพัสดุ</p>
                      <div className="flex gap-3">
                        <input type="text"
                          value={trackingInputs[order.id] ?? (order.delivery.trackingNumber || "")}
                          onChange={e=>setTrackingInputs(p=>({...p,[order.id]:e.target.value}))}
                          placeholder="ใส่เลขพัสดุก่อนกด 'จัดส่งแล้ว'"
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"/>
                        <button onClick={()=>{
                          const updated=orders.map(o=>o.id===order.id?{...o,delivery:{...o.delivery,trackingNumber:trackingInputs[order.id]||null}}:o)
                          saveOrders(updated)
                          alert("บันทึกเลขพัสดุแล้ว")
                        }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-bold transition">บันทึก</button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("confirmed")}
                        onClick={()=>updateStatus(order.id,"confirmed")}
                        className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-blue-100 transition">
                        ✅ ยืนยันรับออเดอร์
                      </button>
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("printing")}
                        onClick={()=>updateStatus(order.id,"printing")}
                        className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-purple-100 transition">
                        🖨️ เริ่มพิมพ์แล้ว
                      </button>
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("shipped")}
                        onClick={()=>updateStatus(order.id,"shipped")}
                        className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-orange-100 transition">
                        🚚 จัดส่งแล้ว
                      </button>
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("delivered")}
                        onClick={()=>updateStatus(order.id,"delivered")}
                        className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-green-100 transition">
                        📦 ส่งถึงแล้ว
                      </button>
                      <button disabled={order.status==="cancelled"}
                        onClick={()=>updateStatus(order.id,"cancelled")}
                        className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold disabled:opacity-30 hover:bg-red-100 transition ml-auto">
                        ❌ ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
