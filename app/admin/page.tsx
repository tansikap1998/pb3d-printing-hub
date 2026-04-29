"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface Order {
  id: string; createdAt: string; status: string
  customer: { name: string; email: string; phone: string; address: string }
  items: { fileName: string; material: string; technology: string; color: string; infill: number; layerHeight: number; quantity: number; notes: string }
  pricing: { total: number; weightG: number; printTimeMin: number }
  delivery: { trackingNumber: string | null }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "⏳ รอยืนยัน",   color: "text-amber-400",  bg: "bg-amber-400/10", border: "border-amber-400/20" },
  confirmed: { label: "✅ ยืนยันแล้ว", color: "text-blue-400",   bg: "bg-blue-400/10",  border: "border-blue-400/20" },
  printing:  { label: "🖨️ กำลังพิมพ์", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  shipped:   { label: "🚚 จัดส่งแล้ว", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  delivered: { label: "📦 ส่งถึงแล้ว", color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/20" },
  cancelled: { label: "❌ ยกเลิก",     color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/20" },
}

const STATUS_FLOW = ["pending","confirmed","printing","shipped","delivered"]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH",{day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"})
}

export default function AdminPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [lastRefresh, setLastRefresh] = useState("")

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
  }

  const loadOrders = useCallback(() => {
    try {
      const raw = localStorage.getItem("pb3d_orders")
      if (raw) setOrders(JSON.parse(raw))
    } catch {}
    setLastRefresh(new Date().toLocaleTimeString("th-TH"))
  }, [])

  useEffect(() => { loadOrders(); const t = setInterval(loadOrders, 15000); return () => clearInterval(t) }, [loadOrders])

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

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-between bg-black/50 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="font-header text-2xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span> <span className="text-[10px] ml-2 tracking-[0.3em] opacity-40">ADMIN</span>
        </Link>
        <div className="flex items-center gap-6 font-header text-[10px] tracking-[0.2em] uppercase">
          <span className="opacity-20 hidden md:inline">SYNCED {lastRefresh}</span>
          <button onClick={loadOrders} className="hover:opacity-50 transition border border-white/10 px-4 py-1.5 rounded-full">Refresh</button>
          <button onClick={handleLogout} className="text-red-400 border border-red-400/20 px-4 py-1.5 rounded-full hover:bg-red-400 hover:text-black transition">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8 pt-32">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {[
            { key:"all",   label:"TOTAL",      num: orders.length,             color:"text-white" },
            { key:"pending",   label:"PENDING",    num: counts.pending||0,   color:"text-amber-400" },
            { key:"confirmed", label:"CONFIRMED",  num: counts.confirmed||0, color:"text-blue-400" },
            { key:"printing",  label:"PRINTING",   num: counts.printing||0,  color:"text-purple-400" },
            { key:"shipped",   label:"SHIPPED",    num: counts.shipped||0,   color:"text-orange-400" },
            { key:"delivered", label:"DELIVERED",  num: counts.delivered||0, color:"text-green-400" },
          ].map(s=>(
            <button key={s.key} onClick={()=>setFilter(s.key)}
              className={`bg-white/[0.02] border rounded-[1.5rem] p-6 text-center transition-all hover:scale-[1.02] ${filter===s.key?"border-white bg-white text-black":"border-white/5 text-white/40 hover:border-white/20"}`}>
              <div className={`font-header text-4xl tracking-tighter ${filter===s.key ? 'text-black' : s.color}`}>{s.num}</div>
              <div className="font-header text-[10px] tracking-widest mt-2 uppercase opacity-40">{s.label}</div>
            </button>
          ))}
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl px-6 py-4 mb-8 flex items-center gap-4 animate-pulse">
            <span className="text-amber-400 font-header text-xs tracking-widest">⚠️ {pendingCount} PENDING ORDERS REQUIRING ATTENTION</span>
          </div>
        )}

        {/* Orders */}
        <div className="flex flex-col gap-4">
          {filtered.length === 0 && (
            <div className="bg-white/[0.02] rounded-[2.5rem] p-32 text-center border border-white/5">
              <div className="text-6xl mb-6 opacity-20">📭</div>
              <p className="font-header text-xl tracking-[0.3em] uppercase opacity-20">No Orders Found</p>
            </div>
          )}
          {filtered.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const statusIdx = STATUS_FLOW.indexOf(order.status)
            const isExpanded = expanded === order.id
            return (
              <div key={order.id} className={`bg-white/[0.02] border rounded-[2rem] overflow-hidden transition-all duration-500 ${isExpanded ? 'border-white/20 shadow-2xl' : 'border-white/5 hover:border-white/10'}`}>
                {/* Header row */}
                <div className="px-8 py-6 flex flex-wrap sm:flex-nowrap items-center gap-6 cursor-pointer group" onClick={()=>setExpanded(isExpanded?null:order.id)}>
                  <span className="font-header text-sm tracking-widest text-white/20 shrink-0">#{order.id.slice(-6)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-header text-xl tracking-tight text-white group-hover:text-violet-400 transition-colors uppercase">{order.customer.name}</p>
                    <p className="font-header text-[10px] tracking-widest opacity-20 uppercase">{order.customer.email}</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-header tracking-widest border uppercase ${sc.bg} ${sc.color} ${sc.border} shrink-0`}>{sc.label}</div>
                  <div className="text-right shrink-0">
                    <p className="font-header text-3xl tracking-tighter text-white">฿{order.pricing.total}</p>
                    <p className="font-header text-[10px] tracking-widest opacity-20 uppercase">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`text-white/20 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/5 p-8 bg-white/[0.01]">
                    <div className="grid md:grid-cols-2 gap-12 mb-10">
                      <div className="space-y-6">
                        <p className="font-header text-[10px] tracking-[0.4em] text-white/20 uppercase">📦 ORDER DETAILS</p>
                        <div className="space-y-4 font-header text-sm tracking-tight">
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">FILE</span><span>{order.items.fileName}</span></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">MATERIAL</span><span>{order.items.material} ({order.items.technology})</span></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">COLOR</span><span className="flex items-center gap-3">{order.items.color}<span className="w-4 h-4 rounded-full border border-white/10" style={{background:order.items.color}}/></span></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">LAYER / INFILL</span><span>{order.items.layerHeight}mm / {order.items.infill}%</span></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">QUANTITY</span><span>{order.items.quantity} PCS</span></div>
                          {order.items.notes && <div className="flex flex-col gap-2"><span className="opacity-40">NOTES</span><p className="bg-white/5 p-4 rounded-xl text-xs">{order.items.notes}</p></div>}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <p className="font-header text-[10px] tracking-[0.4em] text-white/20 uppercase">👤 CUSTOMER INFO</p>
                        <div className="space-y-4 font-header text-sm tracking-tight">
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">NAME</span><span>{order.customer.name}</span></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">EMAIL</span><a href={`mailto:${order.customer.email}`} className="text-violet-400 hover:underline">{order.customer.email}</a></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span className="opacity-40">PHONE</span><span>{order.customer.phone}</span></div>
                          <div className="flex flex-col gap-2"><span className="opacity-40">ADDRESS</span><p className="bg-white/5 p-4 rounded-xl text-xs">{order.customer.address}</p></div>
                        </div>
                        <div className="mt-8 p-6 bg-white/[0.03] rounded-2xl border border-white/5 flex justify-between items-center">
                          <span className="font-header text-[10px] tracking-[0.4em] opacity-40">TOTAL PRICE</span>
                          <span className="font-header text-4xl tracking-tighter text-white">฿{order.pricing.total}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tracking */}
                    <div className="bg-white/[0.03] rounded-2xl p-6 mb-8 border border-white/5">
                      <p className="font-header text-[10px] tracking-[0.4em] text-white/20 uppercase mb-4">🚚 DELIVERY TRACKING</p>
                      <div className="flex gap-4">
                        <input type="text"
                          value={trackingInputs[order.id] ?? (order.delivery.trackingNumber || "")}
                          onChange={e=>setTrackingInputs(p=>({...p,[order.id]:e.target.value}))}
                          placeholder="Enter tracking number..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-white/40 transition-all"/>
                        <button onClick={()=>{
                          const updated=orders.map(o=>o.id===order.id?{...o,delivery:{...o.delivery,trackingNumber:trackingInputs[order.id]||null}}:o)
                          saveOrders(updated)
                          alert("Tracking number saved successfully")
                        }} className="px-8 py-3 bg-white text-black font-header text-xs tracking-widest uppercase rounded-xl hover:bg-white/80 transition-all">SAVE</button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("confirmed")}
                        onClick={()=>updateStatus(order.id,"confirmed")}
                        className="px-6 py-3 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-xl font-header text-[10px] tracking-widest uppercase disabled:opacity-20 hover:bg-blue-400 hover:text-black transition-all">
                        Confirm Order
                      </button>
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("printing")}
                        onClick={()=>updateStatus(order.id,"printing")}
                        className="px-6 py-3 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl font-header text-[10px] tracking-widest uppercase disabled:opacity-20 hover:bg-purple-400 hover:text-black transition-all">
                        Start Printing
                      </button>
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("shipped")}
                        onClick={()=>updateStatus(order.id,"shipped")}
                        className="px-6 py-3 bg-orange-400/10 border border-orange-400/20 text-orange-400 rounded-xl font-header text-[10px] tracking-widest uppercase disabled:opacity-20 hover:bg-orange-400 hover:text-black transition-all">
                        Ship Order
                      </button>
                      <button disabled={statusIdx>=STATUS_FLOW.indexOf("delivered")}
                        onClick={()=>updateStatus(order.id,"delivered")}
                        className="px-6 py-3 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl font-header text-[10px] tracking-widest uppercase disabled:opacity-20 hover:bg-green-400 hover:text-black transition-all">
                        Delivered
                      </button>
                      <button disabled={order.status==="cancelled"}
                        onClick={()=>updateStatus(order.id,"cancelled")}
                        className="px-6 py-3 bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl font-header text-[10px] tracking-widest uppercase disabled:opacity-20 hover:bg-red-400 hover:text-black transition-all ml-auto">
                        Cancel
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
