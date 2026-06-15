"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { supabase, isPlaceholder } from '@/lib/supabase/client'
import {
  RefreshCw, LogOut, Package, Clock, Printer, Truck,
  CheckCircle2, XCircle, ChevronDown, Mail, Phone,
  MapPin, FileText, Layers, Weight, AlertCircle,
  TrendingUp, User, Hash, Send
} from "lucide-react"

// ─── Types & Config ──────────────────────────────────────────────────────────

interface Order {
  id: string; createdAt: string; status: string
  customer: { name: string; email: string; phone: string; address: string }
  items: { fileName: string; material: string; technology: string; color: string; infill: number; layerHeight: number; quantity: number; notes: string }
  pricing: { total: number; weightG: number; printTimeMin: number }
  delivery: { trackingNumber: string | null }
}

const STATUS: Record<string, { label: string; th: string; color: string; bg: string; border: string; dot: string }> = {
  pending:   { label: "Pending",   th: "รอยืนยัน",    color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/25",  dot: "bg-amber-400"  },
  confirmed: { label: "Confirmed", th: "ยืนยันแล้ว",  color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/25",   dot: "bg-blue-400"   },
  printing:  { label: "Printing",  th: "กำลังพิมพ์",  color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/25", dot: "bg-purple-400" },
  shipped:   { label: "Shipped",   th: "จัดส่งแล้ว",  color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/25", dot: "bg-orange-400" },
  delivered: { label: "Delivered", th: "ส่งถึงแล้ว",  color: "text-emerald-400",bg: "bg-emerald-400/10",border: "border-emerald-400/25",dot: "bg-emerald-400"},
  cancelled: { label: "Cancelled", th: "ยกเลิก",      color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/25",    dot: "bg-red-400"    },
}
const STATUS_FLOW = ["pending","confirmed","printing","shipped","delivered"]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-2xl p-5 text-left border transition-all duration-200 hover:scale-[1.02] ${active ? 'bg-white text-black border-white shadow-lg' : 'bg-white/[0.03] border-white/8 hover:border-white/15'}`}>
      <p className={`font-header text-3xl tracking-tighter mb-1 ${active ? 'text-black' : color}`}>{value}</p>
      <p className={`text-xs font-medium tracking-wide ${active ? 'text-black/50' : 'text-white/35'}`}>{label}</p>
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${s.color} ${s.bg} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.th}
    </span>
  )
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/6 last:border-0">
      <span className="text-xs text-white/35 shrink-0 w-28">{label}</span>
      {href
        ? <a href={href} className="text-sm text-blue-400 hover:text-blue-300 transition-colors text-right break-all">{value}</a>
        : <span className="text-sm text-white/80 text-right break-all">{value}</span>
      }
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [lastRefresh, setLastRefresh] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setRefreshing(true)
    try {
      if (!isPlaceholder) {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
        if (error) throw error
        const mapped: Order[] = data.map(o => ({
          id: o.id, createdAt: o.created_at, status: o.status,
          customer: { name: o.customer_name, email: o.customer_email || '', phone: o.customer_phone || '', address: o.customer_address || '' },
          items: { fileName: o.file_name, material: o.material, technology: o.technology, color: o.color, infill: o.infill, layerHeight: o.layer_height, quantity: o.quantity, notes: o.notes || '' },
          pricing: { total: o.total_price, weightG: o.weight_g || 0, printTimeMin: o.print_time_min || 0 },
          delivery: { trackingNumber: o.tracking_number }
        }))
        setOrders(mapped)
      } else {
        const raw = localStorage.getItem("pb3d_orders")
        if (raw) setOrders(JSON.parse(raw))
      }
    } catch (e) { console.error(e) }
    setLastRefresh(new Date().toLocaleTimeString("th-TH"))
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadOrders()
    const t = setInterval(loadOrders, 15000)
    return () => clearInterval(t)
  }, [loadOrders])

  const sendEmail = (order: Order, newStatus: string) => {
    const msgMap: Record<string, string> = {
      confirmed: "✅ ยืนยันรับออเดอร์แล้ว", printing: "🖨️ เริ่มพิมพ์ชิ้นงานแล้ว",
      shipped: "🚚 จัดส่งพัสดุแล้ว", delivered: "📦 พัสดุส่งถึงแล้ว", cancelled: "❌ ยกเลิกคำสั่งซื้อ",
    }
    const tracking = order.delivery.trackingNumber
    const subject = `[PB3D] ${msgMap[newStatus] || newStatus} — Order #${order.id.slice(-6)}`
    const body = `เรียนคุณ ${order.customer.name}\n\n${msgMap[newStatus] || newStatus}\n\nOrder: #${order.id.slice(-6)}\nไฟล์: ${order.items.fileName}\nวัสดุ: ${order.items.material} × ${order.items.quantity} ชิ้น\nราคา: ฿${order.pricing.total}${newStatus === "shipped" && tracking ? "\n\n📮 เลขพัสดุ: " + tracking : ""}\n\nขอบคุณที่ใช้บริการ PB3D Printing`
    window.open(`mailto:${order.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank")
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const tracking = newStatus === "shipped" ? (trackingInputs[id]?.trim() || null) : null
    if (newStatus === "shipped" && !tracking) { alert("กรุณากรอกเลขพัสดุก่อน"); return }
    setUpdatingId(id)
    try {
      if (!isPlaceholder) {
        const upd: any = { status: newStatus }
        if (tracking) upd.tracking_number = tracking
        const { error } = await supabase.from('orders').update(upd).eq('id', id)
        if (error) throw error
        await loadOrders()
      } else {
        const updated = orders.map(o => o.id !== id ? o : {
          ...o, status: newStatus,
          delivery: { ...o.delivery, trackingNumber: newStatus === "shipped" ? tracking : o.delivery.trackingNumber }
        })
        setOrders(updated)
        localStorage.setItem("pb3d_orders", JSON.stringify(updated))
      }
      const order = orders.find(o => o.id === id)
      if (order) sendEmail(order, newStatus)
    } catch (e) { console.error(e); alert("Failed to update status") }
    setUpdatingId(null)
  }

  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)
  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.pricing.total, 0)
  const pendingCount = counts["pending"] || 0

  return (
    <div className="min-h-screen bg-[#080810] text-white font-body">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-10 flex items-center justify-between bg-[#080810]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <Link href="/" className="font-header text-xl tracking-tighter uppercase">
          PB3D<span className="text-white/15">HUB</span>
          <span className="ml-2 text-[9px] font-header tracking-[0.4em] text-blue-400/70 uppercase">Admin</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-white/25">
            {session?.user?.email}
          </span>
          <span className="hidden md:block text-[9px] text-white/15 font-header tracking-widest uppercase">
            synced {lastRefresh}
          </span>
          <button onClick={loadOrders} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={12} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16">

        {/* Header */}
        <div className="py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-header text-[clamp(1.6rem,4vw,2.5rem)] tracking-tighter leading-none">Order Dashboard</h1>
            <p className="text-white/35 text-sm mt-1">จัดการคำสั่งซื้อ · อัปเดต real-time ทุก 15 วินาที</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/30 mb-1 flex items-center gap-1.5 justify-end"><TrendingUp size={11} />Total Revenue</p>
            <p className="font-header text-3xl tracking-tighter">฿{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="All Orders" value={orders.length}        color="text-white"          active={filter==="all"}       onClick={()=>setFilter("all")} />
          <StatCard label="Pending"    value={counts.pending||0}    color="text-amber-400"      active={filter==="pending"}    onClick={()=>setFilter("pending")} />
          <StatCard label="Confirmed"  value={counts.confirmed||0}  color="text-blue-400"       active={filter==="confirmed"}  onClick={()=>setFilter("confirmed")} />
          <StatCard label="Printing"   value={counts.printing||0}   color="text-purple-400"     active={filter==="printing"}   onClick={()=>setFilter("printing")} />
          <StatCard label="Shipped"    value={counts.shipped||0}    color="text-orange-400"     active={filter==="shipped"}    onClick={()=>setFilter("shipped")} />
          <StatCard label="Delivered"  value={counts.delivered||0}  color="text-emerald-400"    active={filter==="delivered"}  onClick={()=>setFilter("delivered")} />
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-400/8 border border-amber-400/25 rounded-2xl mb-6">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400 font-medium">{pendingCount} คำสั่งซื้อรอการยืนยัน</p>
          </div>
        )}

        {/* Order list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white/[0.02] border border-white/6 rounded-3xl">
              <Package size={40} className="text-white/10 mb-4" />
              <p className="text-white/25 font-header tracking-wider uppercase text-sm">No orders found</p>
            </div>
          ) : filtered.map(order => {
            const statusIdx = STATUS_FLOW.indexOf(order.status)
            const isOpen = expanded === order.id
            const isUpdating = updatingId === order.id

            return (
              <div key={order.id} className={`border rounded-3xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-white/15 bg-white/[0.03]' : 'border-white/6 bg-white/[0.02] hover:border-white/10'}`}>

                {/* Row header */}
                <div className="px-6 py-5 flex flex-wrap sm:flex-nowrap items-center gap-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <span className="text-xs font-mono text-white/25 shrink-0">#{order.id.slice(-6).toUpperCase()}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-header text-base tracking-tight truncate">{order.customer.name}</p>
                    <p className="text-xs text-white/30 truncate">{order.customer.email || order.items.fileName}</p>
                  </div>

                  <StatusBadge status={order.status} />

                  <div className="text-right shrink-0">
                    <p className="font-header text-xl tracking-tighter">฿{order.pricing.total.toLocaleString()}</p>
                    <p className="text-[10px] text-white/25">{formatDate(order.createdAt)}</p>
                  </div>

                  <ChevronDown size={15} className={`text-white/25 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-white/6 p-6 space-y-6">

                    {/* Status progress bar */}
                    <div className="flex items-center gap-1">
                      {STATUS_FLOW.map((s, i) => {
                        const done = statusIdx >= i
                        const active = statusIdx === i
                        return (
                          <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                            <div className={`w-full h-1.5 rounded-full transition-all ${done ? (active ? 'bg-blue-400' : 'bg-white/30') : 'bg-white/8'}`} />
                            <span className={`text-[8px] font-header tracking-wider uppercase ${active ? 'text-blue-400' : done ? 'text-white/40' : 'text-white/15'}`}>
                              {STATUS[s]?.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Two-col detail */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Order details */}
                      <div className="bg-white/[0.025] border border-white/6 rounded-2xl p-5 space-y-1">
                        <p className="text-xs font-medium text-white/35 flex items-center gap-2 mb-3">
                          <FileText size={12} />Order Details
                        </p>
                        <InfoRow label="ชื่อไฟล์" value={order.items.fileName} />
                        <InfoRow label="วัสดุ" value={`${order.items.material} (${order.items.technology})`} />
                        <InfoRow label="สี" value={order.items.color} />
                        <InfoRow label="Layer / Infill" value={`${order.items.layerHeight}mm / ${order.items.infill}%`} />
                        <InfoRow label="จำนวน" value={`${order.items.quantity} ชิ้น`} />
                        {order.items.notes && <InfoRow label="หมายเหตุ" value={order.items.notes} />}
                        <div className="pt-3 mt-1 border-t border-white/6 flex justify-between items-center">
                          <span className="text-xs text-white/35">ยอดรวม</span>
                          <span className="font-header text-2xl tracking-tighter">฿{order.pricing.total.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="bg-white/[0.025] border border-white/6 rounded-2xl p-5 space-y-1">
                        <p className="text-xs font-medium text-white/35 flex items-center gap-2 mb-3">
                          <User size={12} />Customer Info
                        </p>
                        <InfoRow label="ชื่อ" value={order.customer.name} />
                        <InfoRow label="อีเมล์" value={order.customer.email} href={`mailto:${order.customer.email}`} />
                        <InfoRow label="โทร" value={order.customer.phone} href={`tel:${order.customer.phone}`} />
                        <InfoRow label="ที่อยู่" value={order.customer.address} />
                        {order.delivery.trackingNumber && (
                          <InfoRow label="เลขพัสดุ" value={order.delivery.trackingNumber} />
                        )}
                      </div>
                    </div>

                    {/* Tracking input */}
                    <div className="bg-white/[0.02] border border-white/6 rounded-2xl p-5">
                      <p className="text-xs font-medium text-white/35 flex items-center gap-2 mb-3">
                        <Truck size={12} />เลขพัสดุ (สำหรับสถานะ Shipped)
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={trackingInputs[order.id] ?? (order.delivery.trackingNumber || "")}
                          onChange={e => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))}
                          placeholder="กรอกเลขพัสดุ..."
                          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-400/40 transition-all"
                        />
                        <button
                          onClick={() => {
                            const updated = orders.map(o => o.id === order.id ? { ...o, delivery: { ...o.delivery, trackingNumber: trackingInputs[order.id] || null } } : o)
                            setOrders(updated)
                            if (isPlaceholder) localStorage.setItem("pb3d_orders", JSON.stringify(updated))
                          }}
                          className="px-5 py-3 bg-white/10 border border-white/15 rounded-xl text-xs font-medium text-white/60 hover:bg-white/15 hover:text-white transition-all"
                        >
                          บันทึก
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { s: "confirmed", label: "✓ Confirm",   cls: "border-blue-400/25 text-blue-400 hover:bg-blue-400",    idx: 0 },
                        { s: "printing",  label: "⬡ Printing",  cls: "border-purple-400/25 text-purple-400 hover:bg-purple-400", idx: 1 },
                        { s: "shipped",   label: "→ Ship",      cls: "border-orange-400/25 text-orange-400 hover:bg-orange-400", idx: 2 },
                        { s: "delivered", label: "✓ Delivered", cls: "border-emerald-400/25 text-emerald-400 hover:bg-emerald-400", idx: 3 },
                      ].map(btn => (
                        <button key={btn.s}
                          disabled={statusIdx >= STATUS_FLOW.indexOf(btn.s) || isUpdating}
                          onClick={() => updateStatus(order.id, btn.s)}
                          className={`px-5 py-2.5 rounded-xl border text-xs font-medium uppercase tracking-wider transition-all hover:text-black disabled:opacity-20 disabled:cursor-not-allowed ${btn.cls}`}>
                          {isUpdating ? "..." : btn.label}
                        </button>
                      ))}
                      <button
                        disabled={order.status === "cancelled" || isUpdating}
                        onClick={() => updateStatus(order.id, "cancelled")}
                        className="px-5 py-2.5 rounded-xl border border-red-400/25 text-red-400 text-xs font-medium uppercase tracking-wider hover:bg-red-400 hover:text-black transition-all disabled:opacity-20 disabled:cursor-not-allowed ml-auto">
                        ✕ Cancel
                      </button>
                      <a href={`mailto:${order.customer.email}`}
                        className="px-5 py-2.5 rounded-xl border border-white/10 text-white/40 text-xs font-medium flex items-center gap-1.5 hover:border-white/20 hover:text-white/70 transition-all">
                        <Send size={11} /> Email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
