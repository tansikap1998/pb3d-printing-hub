"use client"
import ThemeToggle from '@/components/ThemeToggle'
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import ShopeeAdmin from "@/components/admin/ShopeeAdmin"
import {
  RefreshCw, LogOut, Package, Clock, Printer, Truck,
  CheckCircle2, XCircle, ChevronDown, Mail, Phone,
  MapPin, FileText, Layers, Weight, AlertCircle,
  TrendingUp, User, Hash, Send, ShoppingBag, Receipt
} from "lucide-react"

// ─── Types & Config ──────────────────────────────────────────────────────────

interface Order {
  id: string; createdAt: string; status: string
  customer: { name: string; email: string; phone: string; address: string }
  items: { fileName: string; material: string; technology: string; color: string; infill: number; layerHeight: number; quantity: number; notes: string }
  pricing: { total: number; weightG: number; printTimeMin: number }
  delivery: { trackingNumber: string | null }
  hasSlip?: boolean
}

const STATUS: Record<string, { label: string; th: string; color: string; bg: string; border: string; dot: string }> = {
  pending:   { label: "Pending",   th: "รอชำระเงิน",    color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/25",  dot: "bg-amber-400"  },
  awaiting_verification: { label: "Slip", th: "รอตรวจสลิป", color: "text-yellow-300", bg: "bg-yellow-300/10", border: "border-yellow-300/25", dot: "bg-yellow-300" },
  confirmed: { label: "Confirmed", th: "ยืนยันแล้ว",  color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/25",   dot: "bg-blue-400"   },
  printing:  { label: "Printing",  th: "กำลังพิมพ์",  color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/25", dot: "bg-purple-400" },
  shipped:   { label: "Shipped",   th: "จัดส่งแล้ว",  color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/25", dot: "bg-orange-400" },
  delivered: { label: "Delivered", th: "ส่งถึงแล้ว",  color: "text-emerald-400",bg: "bg-emerald-400/10",border: "border-emerald-400/25",dot: "bg-emerald-400"},
  cancelled: { label: "Cancelled", th: "ยกเลิก",      color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/25",    dot: "bg-red-400"    },
}
const STATUS_FLOW = ["pending","confirmed","printing","shipped","delivered"]
// awaiting_verification sits between pending and confirmed in the progress bar
const flowIndex = (status: string) => status === "awaiting_verification" ? 0 : STATUS_FLOW.indexOf(status)


function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-2xl p-5 text-left border transition-all duration-200 hover:scale-[1.02] ${active ? 'bg-foreground text-background border-foreground shadow-lg' : 'bg-foreground/[0.03] border-foreground/8 hover:border-foreground/15'}`}>
      <p className={`font-header text-3xl tracking-tighter mb-1 ${active ? 'text-background' : color}`}>{value}</p>
      <p className={`text-xs font-medium tracking-wide ${active ? 'text-background/50' : 'text-foreground/35'}`}>{label}</p>
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
  if (!value) href = undefined
  value = value || "—"
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-foreground/6 last:border-0">
      <span className="text-xs text-foreground/35 shrink-0 w-28">{label}</span>
      {href
        ? <a href={href} className="text-sm text-blue-400 hover:text-blue-300 transition-colors text-right break-all">{value}</a>
        : <span className="text-sm text-foreground/80 text-right break-all whitespace-pre-line">{value}</span>
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
  const [tab, setTab] = useState<"orders" | "shopee">("orders")
  const [savedTrackingId, setSavedTrackingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState("")

  const loadOrders = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/orders', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      const data: any[] = body.orders
      setOrders(data.map(o => ({
        id: o.id, createdAt: o.created_at, status: o.status,
        customer: { name: o.customer_name, email: o.customer_email || '', phone: o.customer_phone || '', address: o.customer_address || '' },
        items: { fileName: o.file_name, material: o.material, technology: o.technology, color: o.color, infill: o.infill, layerHeight: o.layer_height, quantity: o.quantity, notes: o.notes || '' },
        pricing: { total: Number(o.total_price) || 0, weightG: Number(o.weight_g) || 0, printTimeMin: o.print_time_min || 0 },
        delivery: { trackingNumber: o.tracking_number || null },
        hasSlip: !!o.has_slip,
      })))
      setLoadError("")
    } catch (e: any) { console.error(e); setLoadError(e?.message || "โหลดคำสั่งซื้อไม่สำเร็จ") }
    setLastRefresh(new Date().toLocaleTimeString("th-TH"))
    setRefreshing(false)
  }, [])

  useEffect(() => {
    loadOrders()
    const t = setInterval(loadOrders, 15000)
    return () => clearInterval(t)
  }, [loadOrders])

  /** Admin writes go through the server (admin session check), never straight to the sheet. */
  const adminPatch = async (id: string, body: { status?: string; trackingNumber?: string | null }) => {
    const r = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      throw new Error(d.error || `HTTP ${r.status}`)
    }
  }

  const saveTracking = async (id: string) => {
    const value = (trackingInputs[id] ?? "").trim() || null
    try {
      await adminPatch(id, { trackingNumber: value })
      await loadOrders()
      setSavedTrackingId(id)
      setTimeout(() => setSavedTrackingId(p => p === id ? null : p), 2000)
    } catch (e: any) { console.error(e); alert("บันทึกเลขพัสดุไม่สำเร็จ: " + (e?.message || "")) }
  }

  const sendEmail = (order: Order, newStatus: string, trackingOverride?: string | null) => {
    if (!order.customer.email) return
    const msgMap: Record<string, string> = {
      confirmed: "✅ ยืนยันรับออเดอร์แล้ว", printing: "🖨️ เริ่มพิมพ์ชิ้นงานแล้ว",
      shipped: "🚚 จัดส่งพัสดุแล้ว", delivered: "📦 พัสดุส่งถึงแล้ว", cancelled: "❌ ยกเลิกคำสั่งซื้อ",
    }
    const tracking = trackingOverride ?? order.delivery.trackingNumber
    const subject = `[PB3D] ${msgMap[newStatus] || newStatus} — Order #${order.id.slice(-6)}`
    const body = `เรียนคุณ ${order.customer.name}\n\n${msgMap[newStatus] || newStatus}\n\nOrder: #${order.id.slice(-6)}\nไฟล์: ${order.items.fileName}\nวัสดุ: ${order.items.material} × ${order.items.quantity} ชิ้น\nราคา: ฿${order.pricing.total}${newStatus === "shipped" && tracking ? "\n\n📮 เลขพัสดุ: " + tracking : ""}\n\nขอบคุณที่ใช้บริการ PB3D Printing`
    window.location.href = `mailto:${order.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const current = orders.find(o => o.id === id)
    const tracking = newStatus === "shipped"
      ? ((trackingInputs[id] ?? current?.delivery.trackingNumber ?? "").trim() || null)
      : null
    if (newStatus === "shipped" && !tracking) { alert("กรุณากรอกเลขพัสดุก่อน"); return }
    if (newStatus === "cancelled" && !confirm("ยืนยันการยกเลิกคำสั่งซื้อนี้?")) return
    setUpdatingId(id)
    try {
      await adminPatch(id, { status: newStatus, ...(tracking ? { trackingNumber: tracking } : {}) })
      await loadOrders()
      if (current) sendEmail(current, newStatus, tracking)
    } catch (e: any) { console.error(e); alert("อัปเดตสถานะไม่สำเร็จ: " + (e?.message || "")) }
    setUpdatingId(null)
  }

  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)
  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.pricing.total, 0)
  const pendingCount = counts["awaiting_verification"] || 0

  return (
    <div className="min-h-screen bg-background text-foreground font-body">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-10 flex items-center justify-between bg-background/90 backdrop-blur-xl border-b border-foreground/[0.06]">
        <Link href="/" className="font-header text-xl tracking-tighter uppercase">
          PB3D<span className="text-foreground/15">HUB</span>
          <span className="ml-2 text-2xs font-header tracking-[0.4em] text-blue-400/70 uppercase">Admin</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-foreground/25">
            {session?.user?.email}
          </span>
          <span className="hidden md:block text-2xs text-foreground/15 font-header tracking-widest uppercase">
            synced {lastRefresh}
          </span>
          <ThemeToggle />
          <button onClick={loadOrders} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-foreground/10 text-xs text-foreground/40 hover:text-foreground/70 hover:border-foreground/20 transition-all">
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

        {/* Tabs */}
        <div className="flex gap-2 pt-6" role="tablist">
          {([
            { id: "orders", label: "คำสั่งซื้อ", Icon: Package },
            { id: "shopee", label: "สินค้า Shopee", Icon: ShoppingBag },
          ] as const).map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all ${tab === t.id ? "bg-foreground text-background border-foreground" : "border-foreground/10 text-foreground/45 hover:text-foreground/80"}`}>
              <t.Icon size={13} />{t.label}
            </button>
          ))}
        </div>

        {tab === "shopee" ? <div className="pt-8"><ShopeeAdmin /></div> : <>
        {/* Header */}
        <div className="py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-semibold tracking-tight text-[clamp(1.6rem,4vw,2.5rem)] leading-none">Order Dashboard</h1>
            <p className="text-foreground/35 text-sm mt-1">จัดการคำสั่งซื้อ · อัปเดต real-time ทุก 15 วินาที</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/30 mb-1 flex items-center gap-1.5 justify-end"><TrendingUp size={11} />Total Revenue</p>
            <p className="font-header text-3xl tracking-tighter">฿{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <StatCard label="All Orders" value={orders.length}        color="text-foreground"          active={filter==="all"}       onClick={()=>setFilter("all")} />
          <StatCard label="Pending"    value={counts.pending||0}    color="text-amber-400"      active={filter==="pending"}    onClick={()=>setFilter("pending")} />
          <StatCard label="Slip Sent"  value={counts.awaiting_verification||0} color="text-yellow-300" active={filter==="awaiting_verification"} onClick={()=>setFilter("awaiting_verification")} />
          <StatCard label="Confirmed"  value={counts.confirmed||0}  color="text-blue-400"       active={filter==="confirmed"}  onClick={()=>setFilter("confirmed")} />
          <StatCard label="Printing"   value={counts.printing||0}   color="text-purple-400"     active={filter==="printing"}   onClick={()=>setFilter("printing")} />
          <StatCard label="Shipped"    value={counts.shipped||0}    color="text-orange-400"     active={filter==="shipped"}    onClick={()=>setFilter("shipped")} />
          <StatCard label="Delivered"  value={counts.delivered||0}  color="text-emerald-400"    active={filter==="delivered"}  onClick={()=>setFilter("delivered")} />
          <StatCard label="Cancelled"  value={counts.cancelled||0}  color="text-red-400"        active={filter==="cancelled"}  onClick={()=>setFilter("cancelled")} />
        </div>

        {loadError && (
          <div role="alert" className="flex items-center gap-3 px-5 py-3.5 bg-red-500/8 border border-red-500/25 rounded-2xl mb-6">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">โหลดคำสั่งซื้อไม่สำเร็จ: {loadError}</p>
          </div>
        )}

        {/* Pending alert */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-400/8 border border-amber-400/25 rounded-2xl mb-6">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400 font-medium">{pendingCount} คำสั่งซื้อส่งสลิปแล้ว รอตรวจสอบ</p>
          </div>
        )}

        {/* Order list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-foreground/[0.02] border border-foreground/6 rounded-3xl">
              <Package size={40} className="text-foreground/10 mb-4" />
              <p className="text-foreground/25 font-header tracking-wider uppercase text-sm">No orders found</p>
            </div>
          ) : filtered.map(order => {
            const statusIdx = flowIndex(order.status)
            const isCancelled = order.status === "cancelled"
            const isOpen = expanded === order.id
            const isUpdating = updatingId === order.id

            return (
              <div key={order.id} className={`border rounded-3xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-foreground/15 bg-foreground/[0.03]' : 'border-foreground/6 bg-foreground/[0.02] hover:border-foreground/10'}`}>

                {/* Row header */}
                <div className="px-6 py-5 flex flex-wrap sm:flex-nowrap items-center gap-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <span className="text-xs font-mono text-foreground/25 shrink-0">#{order.id.slice(-6).toUpperCase()}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-header text-base tracking-tight truncate">{order.customer.name}</p>
                    <p className="text-xs text-foreground/30 truncate">{order.customer.email || order.items.fileName}</p>
                  </div>

                  <StatusBadge status={order.status} />

                  <div className="text-right shrink-0">
                    <p className="font-header text-xl tracking-tighter">฿{order.pricing.total.toLocaleString()}</p>
                    <p className="text-2xs text-foreground/25">{formatDate(order.createdAt)}</p>
                  </div>

                  <ChevronDown size={15} className={`text-foreground/25 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-foreground/6 p-6 space-y-6">

                    {/* Status progress bar */}
                    <div className="flex items-center gap-1">
                      {STATUS_FLOW.map((s, i) => {
                        const done = statusIdx >= i
                        const active = statusIdx === i
                        return (
                          <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
                            <div className={`w-full h-1.5 rounded-full transition-all ${done ? (active ? 'bg-blue-400' : 'bg-foreground/30') : 'bg-foreground/8'}`} />
                            <span className={`text-2xs font-header tracking-wider uppercase ${active ? 'text-blue-400' : done ? 'text-foreground/40' : 'text-foreground/15'}`}>
                              {STATUS[s]?.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Two-col detail */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Order details */}
                      <div className="bg-foreground/[0.025] border border-foreground/6 rounded-2xl p-5 space-y-1">
                        <p className="text-xs font-medium text-foreground/35 flex items-center gap-2 mb-3">
                          <FileText size={12} />Order Details
                        </p>
                        <InfoRow label="ชื่อไฟล์" value={order.items.fileName} />
                        <InfoRow label="วัสดุ" value={`${order.items.material} (${order.items.technology})`} />
                        <InfoRow label="สี" value={order.items.color} />
                        <InfoRow label="Layer / Infill" value={`${order.items.layerHeight}mm / ${order.items.infill}%`} />
                        <InfoRow label="จำนวน" value={`${order.items.quantity} ชิ้น`} />
                        {order.items.notes && <InfoRow label="หมายเหตุ" value={order.items.notes} />}
                        <div className="pt-3 mt-1 border-t border-foreground/6 flex justify-between items-center">
                          <span className="text-xs text-foreground/35">ยอดรวม</span>
                          <span className="font-header text-2xl tracking-tighter">฿{order.pricing.total.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="bg-foreground/[0.025] border border-foreground/6 rounded-2xl p-5 space-y-1">
                        <p className="text-xs font-medium text-foreground/35 flex items-center gap-2 mb-3">
                          <User size={12} />Customer Info
                        </p>
                        <InfoRow label="ชื่อ" value={order.customer.name} />
                        <InfoRow label="อีเมล์" value={order.customer.email} href={`mailto:${order.customer.email}`} />
                        <InfoRow label="โทร" value={order.customer.phone} href={`tel:${order.customer.phone}`} />
                        <InfoRow label="ที่อยู่" value={order.customer.address} />
                        {order.delivery.trackingNumber && (
                          <InfoRow label="เลขพัสดุ" value={order.delivery.trackingNumber} />
                        )}
                        {order.hasSlip && (
                          <div className="flex items-start justify-between gap-4 py-2.5">
                            <span className="text-xs text-foreground/35 shrink-0 w-28 flex items-center gap-1.5"><Receipt size={11} />สลิปโอนเงิน</span>
                            <a href={`/api/admin/orders/${order.id}/slip`} target="_blank" rel="noopener noreferrer" data-testid="slip-link"
                              className="text-sm text-blue-400 hover:text-blue-300">ดูสลิป →</a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracking input */}
                    <div className="bg-foreground/[0.02] border border-foreground/6 rounded-2xl p-5">
                      <p className="text-xs font-medium text-foreground/35 flex items-center gap-2 mb-3">
                        <Truck size={12} />เลขพัสดุ (สำหรับสถานะ Shipped)
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={trackingInputs[order.id] ?? (order.delivery.trackingNumber || "")}
                          onChange={e => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))}
                          placeholder="กรอกเลขพัสดุ..."
                          className="flex-1 bg-foreground/[0.04] border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/20 outline-none focus:border-blue-400/40 transition-all"
                        />
                        <button
                          onClick={() => saveTracking(order.id)}
                          className="px-5 py-3 bg-foreground/10 border border-foreground/15 rounded-xl text-xs font-medium text-foreground/60 hover:bg-foreground/15 hover:text-foreground transition-all"
                        >
                          {savedTrackingId === order.id ? "✓ บันทึกแล้ว" : "บันทึก"}
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
                          disabled={isCancelled || statusIdx >= STATUS_FLOW.indexOf(btn.s) || isUpdating}
                          onClick={() => updateStatus(order.id, btn.s)}
                          className={`px-5 py-2.5 rounded-xl border text-xs font-medium uppercase tracking-wider transition-all hover:text-black disabled:opacity-20 disabled:cursor-not-allowed ${btn.cls}`}>
                          {isUpdating ? "..." : btn.label}
                        </button>
                      ))}
                      <button
                        disabled={isCancelled || order.status === "delivered" || isUpdating}
                        onClick={() => updateStatus(order.id, "cancelled")}
                        className="px-5 py-2.5 rounded-xl border border-red-400/25 text-red-400 text-xs font-medium uppercase tracking-wider hover:bg-red-400 hover:text-black transition-all disabled:opacity-20 disabled:cursor-not-allowed ml-auto">
                        ✕ Cancel
                      </button>
                      {order.customer.email && <a href={`mailto:${order.customer.email}`}
                        className="px-5 py-2.5 rounded-xl border border-foreground/10 text-foreground/40 text-xs font-medium flex items-center gap-1.5 hover:border-foreground/20 hover:text-foreground/70 transition-all">
                        <Send size={11} /> Email
                      </a>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </>}
      </main>
    </div>
  )
}
