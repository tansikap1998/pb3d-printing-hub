"use client"

import ThemeToggle from '@/components/ThemeToggle'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store'
import { formatTimeFull, formatTime } from '@/lib/priceCalculator'
import { thaiDate, quoteSentence, type Quote } from '@/lib/quotePricing'
import { DEFAULT_QUOTE_CONFIG, type QuoteConfig } from '@/lib/quoteConfig'
import {
  FileText, ChevronLeft, User, MapPin, Phone, Mail,
  Shield, Truck, Clock, Weight, CheckCircle2,
  Layers, Loader2, AlertCircle, Zap,
  Package, Store, ArrowRight, BarChart3, MessageCircle, Download, CalendarDays, StickyNote
} from 'lucide-react'

const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#3b82f6', PETG: '#8b5cf6', ABS: '#f59e0b',
  ASA: '#10b981', TPU: '#ec4899', CarbonFiber: '#94a3b8', Nylon: '#f97316',
}

function layerLabel(lh: number) {
  if (lh <= 0.08) return 'Fine (0.08mm)'
  if (lh <= 0.16) return 'Normal (0.16mm)'
  if (lh < 0.4) return `${lh}mm`
  return 'Standard (0.4mm)'
}

// ── Form components with improved readability ─────────────────────────────────

function InputField({ label, icon: Icon, type = 'text', value, onChange, placeholder, required }: {
  label: string; icon: any; type?: string; value: string
  onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const filled = value.length > 0
  return (
    <div>
      {/* Normal case label — easier to read */}
      <label className={`text-sm font-medium mb-2 block transition-colors ${focused ? 'text-blue-400' : 'text-foreground/55'}`}>
        {label}{required && <span className="text-blue-400/60 ml-1">*</span>}
      </label>
      <div className={`relative flex items-center border rounded-2xl transition-all duration-200
        ${focused
          ? 'border-blue-400/50 bg-blue-500/8 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
          : filled
            ? 'border-foreground/20 bg-foreground/[0.05]'
            : 'border-foreground/12 bg-foreground/[0.03] hover:border-foreground/20'
        }`}>
        <Icon size={15} className={`absolute left-4 transition-colors ${focused ? 'text-blue-400' : 'text-foreground/30'}`} />
        <input type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-11 pr-10 py-4 text-sm text-foreground placeholder:text-foreground/20 outline-none" />
        {filled && (
          <div className="absolute right-3.5 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <CheckCircle2 size={11} className="text-emerald-400" />
          </div>
        )}
      </div>
    </div>
  )
}

function TextareaField({ label, icon: Icon, value, onChange, placeholder, required }: {
  label: string; icon: any; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label className={`text-sm font-medium mb-2 block transition-colors ${focused ? 'text-blue-400' : 'text-foreground/55'}`}>
        {label}{required && <span className="text-blue-400/50 ml-1">*</span>}
      </label>
      <div className={`relative border rounded-2xl transition-all duration-200
        ${focused
          ? 'border-blue-400/50 bg-blue-500/8 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]'
          : value
            ? 'border-foreground/20 bg-foreground/[0.05]'
            : 'border-foreground/12 bg-foreground/[0.03] hover:border-foreground/20'
        }`}>
        <Icon size={15} className={`absolute left-4 top-4 transition-colors ${focused ? 'text-blue-400' : 'text-foreground/30'}`} />
        <textarea rows={3} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-foreground/20 outline-none resize-none" />
      </div>
    </div>
  )
}

// Saved quote data comes from localStorage, so it can be stale or broken: check it.
function isValidQuoteData(d: any): boolean {
  if (!d || typeof d !== 'object' || !Array.isArray(d.models) || d.models.length === 0) return false
  const r = d.result
  if (!r || typeof r !== 'object') return false
  if (!['totalPrice', 'weightG'].every(k => Number.isFinite(Number(r[k])) && Number(r[k]) >= 0)) return false
  return d.models.every((m: any) => m && typeof m.name === 'string' && Number(m.quantity) >= 1)
}

const LINE_URL = 'https://lin.ee/R8Vd7q5'

// ── Main Page ────────────────────────────────────────────────────────────────

export default function QuotePage() {
  const router = useRouter()
  const { estimateData, _hasHydrated } = useOrderStore()
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' })
  const [notes, setNotes] = useState('')
  const [cfg, setCfg] = useState<QuoteConfig>(DEFAULT_QUOTE_CONFIG)
  useEffect(() => {
    fetch('/api/quote-config').then(r => r.ok ? r.json() : null).then(d => { if (d?.config) setCfg(d.config) }).catch(() => {})
  }, [])
  // quote number + date for the printable / PDF quote (stable for this visit)
  const [quoteNo] = useState(() => {
    const d = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
    return `Q${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (_hasHydrated && !isValidQuoteData(estimateData)) router.replace('/upload')
  }, [estimateData, _hasHydrated, router])

  if (!_hasHydrated) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-foreground/30" />
    </div>
  )
  if (!estimateData || !isValidQuoteData(estimateData)) return null

  const { models, technology, infill, layerHeight, result } = estimateData
  const quote: Quote | null = result.quote ?? null
  const isPickup  = (estimateData.shipping ?? 'pickup') !== 'postal'
  const totalQty  = models.reduce((a: number, m: any) => a + m.quantity, 0)
  // pick-up orders don't need an address
  const isValid   = !!(customer.name.trim() && customer.phone.trim() && (isPickup || customer.address.trim()))
  const today     = thaiDate(new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10))

  const subtotal     = result.subtotal     ?? result.totalPrice
  const shippingCost = result.shippingCost ?? 0
  const totalPrice   = result.totalPrice
  const weightG      = result.weightG
  const printDisplay = result.printTimeSec
    ? formatTimeFull(result.printTimeSec)
    : formatTime(result.printTimeMin ?? 0)

  // Cost breakdown (approximate split)
  const matCost  = result.materialCost ?? Math.round(totalPrice * 0.55)
  const machCost = result.machineCost  ?? Math.round(totalPrice * 0.35)
  const setupCost = subtotal - matCost - machCost > 0 ? subtotal - matCost - machCost : Math.round(totalPrice * 0.10)
  const BAR_COLORS = ['#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#ef4444', '#10b981']
  const breakdown = quote ? quote.items.map((it, i) => ({
    label: it.label, value: it.amount, pct: Math.round((it.amount / Math.max(1, quote.total)) * 100), color: BAR_COLORS[i % BAR_COLORS.length], detail: it.detail,
  })) : [
    { label: 'Material & Filament', value: matCost,   pct: Math.round((matCost  / subtotal) * 100), color: '#3b82f6' },
    { label: 'Machine Time',        value: machCost,  pct: Math.round((machCost / subtotal) * 100), color: '#8b5cf6' },
    { label: 'Setup & Handling',    value: setupCost, pct: Math.round((setupCost/ subtotal) * 100), color: '#10b981' },
  ]

  const handleConfirm = async () => {
    if (!isValid) return
    setLoading(true); setError('')
    try {
      const fileNames = models.map((m: any) => m.name).join(', ')
      const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)))
      const materials = uniq(models.map((m: any) => m.material)).join(', ') || 'PLA'
      const colors    = uniq(models.flatMap((m: any) => m.colors ?? [m.colorId])).join(', ') || 'various'
      const perFileColors = models.map((m: any) => `${m.name}: ${(m.colors ?? [m.colorId]).join(' + ')}`).join('\n')
      const printTimeMin = result.printTimeMin ?? Math.round((result.printTimeSec ?? 0) / 60)
      const opts = estimateData.options ?? { sanding: false, painting: false, rush: false }
      const addons = [opts.sanding && cfg.addons.sanding.label, opts.painting && cfg.addons.painting.label,
        models.some((m: any) => (m.colors?.length ?? 1) > 1) && cfg.addons.multiColor.label].filter(Boolean).join(', ')

      // Orders are created on the server; the browser never touches the order sheet.
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: customer.name, phone: customer.phone, email: customer.email, address: isPickup ? (customer.address || 'รับที่ร้าน') : customer.address },
          fileName: fileNames, technology, material: materials, color: colors,
          infill, layerHeight, quantity: totalQty,
          notes: [`สีแต่ละไฟล์:\n${perFileColors}`, notes.trim() && `หมายเหตุลูกค้า: ${notes.trim()}`].filter(Boolean).join('\n\n'),
          volumeCm3: models.reduce((a: number, m: any) => a + (m.meshVolumeCm3 ?? m.originalVolumeCm3 ?? 0), 0),
          weightG, printTimeMin, totalPrice, subtotal,
          priceItems: quote?.items ?? [], expectedDate: quote?.expectedDate ?? '',
          rush: !!quote?.rushApplied, addons, shippingMethod: isPickup ? 'pickup' : 'postal',
          fileWarnings: models.flatMap((m: any) => (m.warnings ?? []).map((w: string) => `${m.name}: ${w}`)).join('\n'),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to place order')
      router.push(`/checkout/${data.id}`)
    } catch (e: any) {
      setError(e?.message && e.message !== 'Failed to fetch' ? e.message : 'ส่งคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  // Copy a plain-text quote and open the shop's LINE, for customers who prefer to chat.
  const handleSendToLine = async () => {
    setError(''); setNotice('')
    const summary = [
      'PB3D Hub – ใบเสนอราคา / Quote',
      ...models.map((m: any) => `• ${m.name} ×${m.quantity} (${m.material ?? ''}${m.colorId ? `, ${m.colorId}` : ''})`),
      `Infill: ${infill}% · Layer: ${Number(layerHeight).toFixed(2)} mm`,
      `น้ำหนัก / Weight: ${Number(weightG).toFixed(0)} g · เวลาพิมพ์ / Print time: ${printDisplay}`,
      `จัดส่ง / Shipping: ${shippingCost === 0 ? 'รับเอง (ฟรี)' : `฿${shippingCost}`}`,
      ...(quote ? [`รายการ: ${quoteSentence(quote)}`, `คาดว่าได้รับ: ${thaiDate(quote.expectedDate)}`] : []),
      `ยอดรวม (ประมาณการ) / Total: ฿${Number(totalPrice).toLocaleString()}`,
      ...(cfg.payment.shopeeEnabled && quote ? [`สั่งผ่าน Shopee: บริการพิมพ์ 3D ชิ้นละ ฿${cfg.payment.shopeeUnitPrice} จำนวน ${quote.shopeeUnits} ชิ้น`] : []),
    ].join('\n')
    // open LINE first: browsers block pop-ups opened after an await
    window.open(cfg.contact.lineUrl || LINE_URL, '_blank', 'noopener,noreferrer')
    try {
      await navigator.clipboard.writeText(summary)
      setNotice('คัดลอกใบเสนอราคาแล้ว วางในแชท LINE ได้เลย / Quote copied — paste it in LINE.')
    } catch {
      setNotice('คัดลอกอัตโนมัติไม่ได้ กรุณาพิมพ์รายละเอียดจากหน้านี้ในแชท LINE')
    }
  }

  return (
    <>
    <PrintableQuote quoteNo={quoteNo} date={today} customer={customer} models={models} quote={quote}
      total={totalPrice} infill={infill} isPickup={isPickup} cfg={cfg} />
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-blue-500/20 pb-32 print:hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-10 flex items-center justify-between bg-background/85 backdrop-blur-xl border-b border-foreground/[0.06]">
        <Link href="/upload" className="flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground/80 transition-colors">
          <ChevronLeft size={15} /> Back
        </Link>
        <Link href="/" className="font-header text-xl tracking-tighter uppercase">
          PB3D<span className="text-foreground/15">HUB</span>
        </Link>
        <div className="hidden md:flex items-center gap-2 text-xs text-foreground/30">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={10} className="text-emerald-400/70" />Upload</span>
          <span className="text-foreground/10 mx-1">›</span>
          <span className="text-blue-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Quote</span>
          <span className="text-foreground/10 mx-1">›</span>
          <span>Checkout</span>
          <ThemeToggle className="ml-3" />
        </div>
        <ThemeToggle className="md:hidden" />
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 pt-24">

        <div className="py-8">
          <h1 className="font-semibold tracking-tight text-[clamp(1.8rem,5vw,3rem)] leading-[1.1]">ใบเสนอราคา</h1>
          <p className="text-foreground/40 text-sm mt-2">
            เลขที่ {quoteNo} · ราคานี้เป็นราคาประมาณการ ร้านจะตรวจไฟล์และยืนยันราคาก่อนให้ชำระเงิน
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => window.print()} data-testid="download-pdf"
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-foreground/15 hover:bg-foreground/5">
              <Download size={14} /> ดาวน์โหลด PDF / พิมพ์ใบเสนอราคา
            </button>
            {quote && (
              <span className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500" data-testid="quote-expected-date">
                <CalendarDays size={14} /> คาดว่าได้รับ {thaiDate(quote.expectedDate)}{quote.rushApplied ? ' (งานด่วน)' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT: Parts + Form ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Parts list */}
            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground/40 flex items-center gap-2">
                <Package size={14} /> Parts · {models.length} {models.length === 1 ? 'file' : 'files'} · {totalQty} pcs
              </p>
              <div className="space-y-2">
                {models.map((model: any) => {
                  const col = MATERIAL_COLORS[model.material] || '#fff'
                  return (
                    <div key={model.id} className="bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${col}15`, border: `1px solid ${col}30` }}>
                        <FileText size={16} style={{ color: col, opacity: 0.8 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate mb-1">{model.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                            style={{ color: col, borderColor: `${col}35`, background: `${col}12` }}>
                            {model.material}
                          </span>
                          <span className="text-xs text-foreground/35">{(model.colors ?? [model.colorId]).join(' + ')}</span>
                          {model.dimensions?.x > 0 && (
                            <span className="text-xs text-foreground/25">
                              {model.dimensions.x.toFixed(0)}×{model.dimensions.y.toFixed(0)}×{model.dimensions.z.toFixed(0)} mm
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="bg-foreground/8 border border-foreground/12 rounded-xl px-3 py-1.5">
                          <p className="font-header text-sm">×{model.quantity}</p>
                        </div>
                        <p className="text-xs text-foreground/30 mt-1">{(model.meshVolumeCm3 ?? model.originalVolumeCm3 ?? model.volumeCm3 ?? 0).toFixed(1)} cm³</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Print specs — larger values, readable labels */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Clock,  label: 'Print Time', value: printDisplay },
                { icon: Weight, label: 'Weight',     value: `${weightG?.toFixed(0)}g` },
                { icon: Layers, label: 'Resolution', value: layerLabel(layerHeight) },
              ].map(s => (
                <div key={s.label} className="bg-foreground/[0.03] border border-foreground/10 rounded-2xl p-4 text-center">
                  <s.icon size={15} className="mx-auto mb-2.5 text-foreground/30" />
                  <p className="font-header text-sm tracking-tight leading-tight">{s.value}</p>
                  <p className="text-xs text-foreground/35 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Itemised quote (all screens) */}
            {quote && (
              <section className="bg-foreground/[0.03] border border-foreground/10 rounded-3xl p-5 space-y-2" data-testid="quote-items">
                <p className="text-sm font-medium text-foreground/50">รายการราคา</p>
                {quote.items.map(it => (
                  <div key={it.key} className="flex justify-between gap-4 text-sm py-1.5 border-b border-foreground/8">
                    <div className="min-w-0">
                      <p className="font-medium">{it.label}</p>
                      <p className="text-xs text-foreground/45">{it.detail}</p>
                    </div>
                    <span className="font-semibold shrink-0">฿{it.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 font-semibold">
                  <span>รวม (ประมาณการ)</span><span data-testid="quote-total">฿{quote.total.toLocaleString()}</span>
                </div>
                <p className="text-xs text-foreground/45" data-testid="quote-sentence">{quoteSentence(quote)}</p>
              </section>
            )}

            {/* Mobile price card */}
            <div className="lg:hidden bg-foreground/[0.03] border border-foreground/10 rounded-3xl p-6 space-y-3">
              <p className="text-sm font-medium text-foreground/40">Order Total</p>
              <p className="font-header text-5xl tracking-tighter">฿{totalPrice?.toLocaleString()}</p>
              <div className="space-y-2 pt-3 border-t border-foreground/10 text-sm">
                <div className="flex justify-between text-foreground/50">
                  <span>Subtotal</span><span className="text-foreground font-medium">฿{subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-foreground/50">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? 'text-emerald-400 font-medium' : 'text-foreground font-medium'}>
                    {shippingCost === 0 ? 'Free (Pickup)' : `฿${shippingCost}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping form */}
            <section className="space-y-4 pt-4 border-t border-foreground/8">
              <p className="text-sm font-medium text-foreground/40 flex items-center gap-2">
                <Truck size={14} /> Shipping Details
              </p>
              <div className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Full Name" icon={User} value={customer.name}
                    onChange={v => setCustomer(p => ({ ...p, name: v }))} placeholder="John Doe" required />
                  <InputField label="Phone" icon={Phone} type="tel" value={customer.phone}
                    onChange={v => setCustomer(p => ({ ...p, phone: v }))} placeholder="08x-xxx-xxxx" required />
                </div>
                <InputField label="Email" icon={Mail} type="email" value={customer.email}
                  onChange={v => setCustomer(p => ({ ...p, email: v }))} placeholder="john@example.com" />
                <TextareaField label={isPickup ? 'ที่อยู่ (ไม่บังคับ: เลือกรับที่ร้าน)' : 'ที่อยู่จัดส่ง'} icon={MapPin} value={customer.address}
                  onChange={v => setCustomer(p => ({ ...p, address: v }))}
                  placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์" required={!isPickup} />
                <TextareaField label="หมายเหตุ / รายละเอียดสี (เช่น หัวสีแดง ตัวสีขาว)" icon={StickyNote} value={notes}
                  onChange={setNotes} placeholder="บอกร้านเพิ่มเติมได้ที่นี่" />
              </div>
            </section>

            {notice && (
              <div role="status" className="flex items-center gap-3 px-4 py-3.5 bg-emerald-500/8 border border-emerald-500/25 rounded-2xl">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-400">{notice}</p>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-red-500/8 border border-red-500/25 rounded-2xl">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sticky price + CTA ── */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-20 space-y-4">

            {/* Price card */}
            <div className="bg-foreground text-background rounded-3xl p-7 shadow-2xl space-y-5">
              <div>
                <p className="text-xs font-medium text-background/40 mb-3 tracking-wide">Order Total</p>
                <p className="font-header text-6xl tracking-tighter leading-none">฿{totalPrice?.toLocaleString()}</p>
              </div>

              {/* Cost breakdown with bars — 4px height */}
              <div className="space-y-3 pt-4 border-t border-background/8">
                <p className="text-xs font-medium text-background/40 flex items-center gap-1.5">
                  <BarChart3 size={12} /> Cost Breakdown
                </p>
                {breakdown.map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1.5" title={(item as any).detail}>
                      <span className="text-sm text-background/60">{item.label}</span>
                      <span className="font-header text-sm text-background">฿{item.value.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-background/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Order summary */}
              <div className="space-y-2 pt-4 border-t border-background/8">
                {models.map((model: any) => (
                  <div key={model.id} className="flex items-center justify-between">
                    <span className="text-sm text-background/40 truncate max-w-[60%]">{model.name} ×{model.quantity}</span>
                    <span className="text-sm font-medium text-background/60">{model.material}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-background/8">
                  <span className="text-sm text-background/40">Subtotal</span>
                  <span className="font-header text-sm">฿{subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-background/40 flex items-center gap-1.5">
                    {shippingCost === 0 ? <Store size={12} /> : <Truck size={12} />} Shipping
                  </span>
                  <span className={`font-header text-sm ${shippingCost === 0 ? 'text-emerald-600' : ''}`}>
                    {shippingCost === 0 ? 'Free' : `฿${shippingCost}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-background/40">Weight</span>
                  <span className="font-header text-sm">{weightG?.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-background/40">Print Time</span>
                  <span className="font-header text-sm">{printDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-background/40">Infill</span>
                  <span className="font-header text-sm">{infill}%</span>
                </div>
              </div>

              {/* CTA */}
              <button onClick={handleSendToLine} data-testid="send-to-line"
                className="w-full py-3 rounded-2xl border border-emerald-500/40 text-emerald-600 text-sm font-medium hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2">
                <MessageCircle size={15} /> ส่งใบเสนอราคาเข้า LINE
              </button>
              <button onClick={handleConfirm} disabled={!isValid || loading}
                className="w-full py-5 rounded-2xl bg-background text-foreground font-header text-base uppercase tracking-[0.15em] transition-all disabled:opacity-25 hover:bg-background/80 active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl">
                {loading
                  ? <><Loader2 size={17} className="animate-spin" />Processing…</>
                  : <><Zap size={17} />ส่งให้ร้านตรวจไฟล์</>
                }
              </button>
              {!isValid && (
                <p className="text-center text-xs text-background/35">Complete required fields to continue</p>
              )}
            </div>

            {/* Trust badges — improved contrast */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Shield,       label: 'Secure',   desc: 'Encrypted checkout' },
                { icon: Truck,        label: 'Tracked',  desc: 'Real-time updates'  },
                { icon: CheckCircle2, label: 'QC Check', desc: 'Quality verified'   },
                { icon: ArrowRight,   label: 'Fast',     desc: quote ? `ได้รับ ${thaiDate(quote.expectedDate)}` : '3–7 business days' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2.5 p-3 rounded-2xl bg-foreground/[0.03] border border-foreground/10">
                  <div className="w-8 h-8 rounded-lg bg-foreground/8 border border-foreground/12 flex items-center justify-center shrink-0">
                    <b.icon size={14} className="text-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/70 leading-none">{b.label}</p>
                    <p className="text-xs text-foreground/35 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-foreground/20 px-4">
              By placing an order you agree to our terms & privacy policy
            </p>
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-[100] bg-background/95 backdrop-blur-xl border-t border-foreground/10 px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-xs text-foreground/30 mb-0.5">Total</p>
            <p className="font-header text-2xl tracking-tighter">฿{totalPrice?.toLocaleString()}</p>
          </div>
          <button onClick={handleSendToLine} aria-label="ส่งใบเสนอราคาเข้า LINE"
            className="w-12 h-12 shrink-0 rounded-2xl border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <MessageCircle size={18} />
          </button>
          <button onClick={handleConfirm} disabled={!isValid || loading}
            className="flex-1 py-4 rounded-2xl font-header text-sm uppercase tracking-[0.15em] transition-all disabled:opacity-30 flex items-center justify-center gap-2 bg-foreground text-background shadow-2xl active:scale-[0.98]">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={14} />}
            {loading ? 'Processing…' : isValid ? 'ส่งให้ร้านตรวจ →' : 'กรอกข้อมูลให้ครบ'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

/** The quote as a printable page (window.print → "Save as PDF"). Hidden on screen. */
function PrintableQuote({ quoteNo, date, customer, models, quote, total, infill, isPickup, cfg }: {
  quoteNo: string; date: string; customer: { name: string; phone: string; email: string; address: string }
  models: any[]; quote: Quote | null; total: number; infill: number; isPickup: boolean; cfg: QuoteConfig
}) {
  return (
    <div className="hidden print:block text-black bg-white p-8 text-[12px] leading-relaxed" data-testid="printable-quote">
      <div className="flex justify-between items-start border-b border-black/20 pb-4 mb-4">
        <div>
          <p className="text-2xl font-bold tracking-tight">PB3D HUB</p>
          <p>บริการพิมพ์ 3 มิติ · pb3d-printing-hub.vercel.app</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">ใบเสนอราคา / Quotation</p>
          <p>เลขที่ {quoteNo}</p>
          <p>วันที่ {date} · ยืนราคา 7 วัน</p>
        </div>
      </div>
      {(customer.name || customer.phone) && (
        <div className="mb-4">
          <p className="font-semibold">ลูกค้า</p>
          <p>{customer.name} {customer.phone && `· ${customer.phone}`} {customer.email && `· ${customer.email}`}</p>
          {customer.address && <p className="whitespace-pre-line">{customer.address}</p>}
        </div>
      )}
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b border-black/30 text-left"><th className="py-1.5">ไฟล์ชิ้นงาน</th><th>วัสดุ / สี</th><th className="text-right">จำนวน</th></tr>
        </thead>
        <tbody>
          {models.map((m: any) => (
            <tr key={m.id} className="border-b border-black/10">
              <td className="py-1.5">{m.name}</td>
              <td>{m.material} · {(m.colors ?? [m.colorId]).join(' + ')} · infill {infill}%</td>
              <td className="text-right">{m.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full border-collapse mb-4">
        <thead><tr className="border-b border-black/30 text-left"><th className="py-1.5">รายการ</th><th>รายละเอียด</th><th className="text-right">จำนวนเงิน (บาท)</th></tr></thead>
        <tbody>
          {(quote?.items ?? []).map(it => (
            <tr key={it.key} className="border-b border-black/10">
              <td className="py-1.5">{it.label}</td><td>{it.detail}</td><td className="text-right">{it.amount.toLocaleString()}</td>
            </tr>
          ))}
          <tr><td className="py-2 font-bold" colSpan={2}>รวมทั้งสิ้น (ประมาณการ)</td><td className="text-right font-bold">{Number(total).toLocaleString()}</td></tr>
        </tbody>
      </table>
      {quote && <p>คาดว่าจะได้รับงาน: <b>{thaiDate(quote.expectedDate)}</b> ({isPickup ? 'รับที่ร้าน' : 'จัดส่งพัสดุ'}{quote.rushApplied ? ' · งานด่วน' : ''})</p>}
      <p className="mt-3 text-black/70">
        หมายเหตุ: ราคานี้คำนวณจากไฟล์โดยอัตโนมัติ อาจคลาดเคลื่อนได้ ร้านจะตรวจไฟล์และยืนยันราคาจริงก่อนชำระเงิน
      </p>
      <p className="mt-1 text-black/70">ชำระเงิน: PromptPay / โอนเข้าบัญชี {cfg.payment.bankName} {cfg.payment.bankAccount} ({cfg.payment.accountName}){cfg.payment.shopeeEnabled ? ' หรือสั่งผ่าน Shopee' : ''}</p>
    </div>
  )
}
