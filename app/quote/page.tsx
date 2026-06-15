"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store'
import { supabase, isPlaceholder } from '@/lib/supabase/client'
import { formatTimeFull, formatTime } from '@/lib/priceCalculator'
import {
  FileText, ChevronLeft, User, MapPin, Phone, Mail,
  Shield, Truck, Clock, Weight, CheckCircle2,
  Layers, Loader2, AlertCircle, Zap,
  Package, Store, ArrowRight
} from 'lucide-react'

const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#3b82f6', PETG: '#8b5cf6', ABS: '#f59e0b',
  ASA: '#10b981', TPU: '#ec4899',
}

function layerLabel(lh: number) {
  if (lh <= 0.08) return 'Fine (0.08mm)'
  if (lh <= 0.16) return 'Normal (0.16mm)'
  return 'Coarse (0.24mm)'
}

function InputField({ label, icon: Icon, type = 'text', value, onChange, placeholder, required }: {
  label: string; icon: any; type?: string; value: string
  onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const filled = value.length > 0
  return (
    <div>
      <label className={`text-[9px] font-header tracking-[0.35em] uppercase mb-2 block transition-colors ${focused ? 'text-blue-400' : 'text-white/25'}`}>
        {label}{required && <span className="text-blue-400/60 ml-1">*</span>}
      </label>
      <div className={`relative flex items-center border rounded-2xl transition-all duration-200
        ${focused ? 'border-blue-400/40 bg-blue-500/5' : filled ? 'border-white/12 bg-white/[0.03]' : 'border-white/6 bg-white/[0.02] hover:border-white/12'}`}>
        <Icon size={14} className={`absolute left-4 transition-colors ${focused ? 'text-blue-400' : 'text-white/20'}`} />
        <input type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-11 pr-10 py-4 text-sm text-white placeholder:text-white/15 outline-none" />
        {filled && (
          <div className="absolute right-3.5 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={10} className="text-emerald-400" />
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
      <label className={`text-[9px] font-header tracking-[0.35em] uppercase mb-2 block transition-colors ${focused ? 'text-blue-400' : 'text-white/25'}`}>
        {label}{required && <span className="text-blue-400/60 ml-1">*</span>}
      </label>
      <div className={`relative border rounded-2xl transition-all duration-200
        ${focused ? 'border-blue-400/40 bg-blue-500/5' : value ? 'border-white/12 bg-white/[0.03]' : 'border-white/6 bg-white/[0.02] hover:border-white/12'}`}>
        <Icon size={14} className={`absolute left-4 top-4 transition-colors ${focused ? 'text-blue-400' : 'text-white/20'}`} />
        <textarea rows={3} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/15 outline-none resize-none" />
      </div>
    </div>
  )
}

export default function QuotePage() {
  const router = useRouter()
  const { estimateData, _hasHydrated } = useOrderStore()
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (_hasHydrated && !estimateData) router.replace('/upload')
  }, [estimateData, _hasHydrated, router])

  if (!_hasHydrated) return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-white/20" />
    </div>
  )
  if (!estimateData) return null

  const { models, technology, infill, layerHeight, result } = estimateData
  const totalQty  = models.reduce((a: number, m: any) => a + m.quantity, 0)
  const isValid   = !!(customer.name.trim() && customer.phone.trim() && customer.address.trim())

  // Support both old result shape (totalPrice only) and new shape (subtotal + shippingCost)
  const subtotal     = result.subtotal     ?? result.totalPrice
  const shippingCost = result.shippingCost ?? 0
  const totalPrice   = result.totalPrice
  const weightG      = result.weightG
  const printDisplay = result.printTimeSec
    ? formatTimeFull(result.printTimeSec)
    : formatTime(result.printTimeMin ?? 0)

  const handleConfirm = async () => {
    if (!isValid) return
    setLoading(true); setError('')
    try {
      let orderId = crypto.randomUUID()
      const fileNames = models.map((m: any) => m.name).join(', ')
      const materials = models.map((m: any) => m.material).join(', ')

      if (!isPlaceholder) {
        const { data, error: dbErr } = await supabase.from('orders').insert({
          customer_name: customer.name, customer_email: customer.email,
          customer_phone: customer.phone, customer_address: customer.address,
          file_name: fileNames.slice(0, 255), technology,
          material: materials.slice(0, 255), color: models[0]?.colorId || 'various',
          infill, layer_height: layerHeight, quantity: totalQty,
          volume_cm3: models.reduce((a: number, m: any) => a + m.volumeCm3, 0),
          weight_g: weightG, total_price: totalPrice,
          base_price: totalPrice, status: 'pending'
        }).select().single()
        if (dbErr) throw dbErr
        orderId = data.id
      } else {
        const localOrder = {
          id: orderId, createdAt: new Date().toISOString(), status: 'pending', customer,
          items: { fileName: fileNames, technology, material: materials, color: 'various', infill, layerHeight, quantity: totalQty },
          pricing: { total: totalPrice, subtotal, shippingCost, weightG },
          delivery: { trackingNumber: null }
        }
        const existing = JSON.parse(localStorage.getItem('pb3d_orders') || '[]')
        localStorage.setItem('pb3d_orders', JSON.stringify([localOrder, ...existing]))
      }
      router.push(`/checkout/${orderId}`)
    } catch {
      setError('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white font-body selection:bg-blue-500/20 pb-32">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 px-6 md:px-10 flex items-center justify-between bg-[#080810]/85 backdrop-blur-xl border-b border-white/[0.05]">
        <Link href="/upload" className="flex items-center gap-2 text-[10px] font-header tracking-[0.3em] uppercase text-white/25 hover:text-white/60 transition-colors">
          <ChevronLeft size={13} /> Back
        </Link>
        <Link href="/" className="font-header text-xl tracking-tighter uppercase">
          PB3D<span className="text-white/15">HUB</span>
        </Link>
        <div className="hidden md:flex items-center gap-2 text-[9px] font-header tracking-[0.3em] uppercase">
          <span className="text-white/20 flex items-center gap-1.5"><CheckCircle2 size={9} className="text-emerald-400/60" />Upload</span>
          <span className="text-white/10 mx-1">›</span>
          <span className="text-blue-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Quote</span>
          <span className="text-white/10 mx-1">›</span>
          <span className="text-white/20">Checkout</span>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 pt-24">

        {/* Header */}
        <div className="py-8">
          <h1 className="font-header text-[clamp(1.8rem,5vw,3rem)] tracking-tighter leading-[0.9]">Confirm Order</h1>
          <p className="text-white/30 text-sm mt-2">Review your parts and fill in shipping details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT: Parts + Form ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Parts list */}
            <section className="space-y-3">
              <p className="text-[9px] font-header tracking-[0.4em] uppercase text-white/20 flex items-center gap-2">
                <Package size={10} />Parts · {models.length} {models.length === 1 ? 'file' : 'files'} · {totalQty} pcs
              </p>
              <div className="space-y-2">
                {models.map((model: any) => {
                  const col = MATERIAL_COLORS[model.material] || '#fff'
                  return (
                    <div key={model.id} className="bg-white/[0.02] border border-white/6 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${col}12`, border: `1px solid ${col}25` }}>
                        <FileText size={16} style={{ color: col, opacity: 0.7 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-header text-sm tracking-tight truncate mb-1">{model.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-header tracking-wider uppercase px-2 py-0.5 rounded-full border"
                            style={{ color: col, borderColor: `${col}30`, background: `${col}10` }}>
                            {model.material}
                          </span>
                          <span className="text-[9px] text-white/25 capitalize">{model.colorId}</span>
                          {model.dimensions?.x > 0 && (
                            <span className="text-[9px] text-white/15">
                              {model.dimensions.x.toFixed(0)}×{model.dimensions.y.toFixed(0)}×{model.dimensions.z.toFixed(0)} mm
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-1.5">
                          <p className="font-header text-xs">×{model.quantity}</p>
                        </div>
                        <p className="text-[8px] text-white/20 mt-1">{model.volumeCm3?.toFixed(1)} cm³</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Print specs */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Clock,   label: 'Print Time', value: printDisplay },
                { icon: Weight,  label: 'Weight',     value: `${weightG?.toFixed(0)}g` },
                { icon: Layers,  label: 'Resolution', value: layerLabel(layerHeight) },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.02] border border-white/6 rounded-2xl p-4 text-center">
                  <s.icon size={13} className="mx-auto mb-2 text-white/20" />
                  <p className="font-header text-xs tracking-tight">{s.value}</p>
                  <p className="text-[8px] font-header tracking-widest uppercase text-white/20 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Mobile price card */}
            <div className="lg:hidden bg-white/[0.03] border border-white/8 rounded-3xl p-6 space-y-3">
              <p className="text-[9px] font-header tracking-[0.4em] uppercase text-white/25">Order Total</p>
              <p className="font-header text-5xl tracking-tighter">฿{totalPrice?.toLocaleString()}</p>
              <div className="space-y-1.5 pt-3 border-t border-white/8 text-xs text-white/40">
                <div className="flex justify-between">
                  <span>Subtotal</span><span className="text-white font-header">฿{subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? 'text-emerald-400 font-header' : 'text-white font-header'}>
                    {shippingCost === 0 ? 'Free (Pickup)' : `฿${shippingCost}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping form */}
            <section className="space-y-4 pt-4 border-t border-white/6">
              <p className="text-[9px] font-header tracking-[0.4em] uppercase text-white/20 flex items-center gap-2">
                <Truck size={10} />Shipping Details
              </p>
              <div className="bg-white/[0.02] border border-white/6 rounded-3xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Full Name" icon={User} value={customer.name}
                    onChange={v => setCustomer(p => ({ ...p, name: v }))} placeholder="John Doe" required />
                  <InputField label="Phone" icon={Phone} type="tel" value={customer.phone}
                    onChange={v => setCustomer(p => ({ ...p, phone: v }))} placeholder="08x-xxx-xxxx" required />
                </div>
                <InputField label="Email" icon={Mail} type="email" value={customer.email}
                  onChange={v => setCustomer(p => ({ ...p, email: v }))} placeholder="john@example.com" />
                <TextareaField label="Delivery Address" icon={MapPin} value={customer.address}
                  onChange={v => setCustomer(p => ({ ...p, address: v }))}
                  placeholder="123 Street, Bangkok 10xxx" required />
              </div>
            </section>

            {error && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-red-500/8 border border-red-500/20 rounded-2xl">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Sticky price + CTA ── */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-20 space-y-4">

            {/* Price card */}
            <div className="bg-white text-black rounded-3xl p-7 shadow-2xl space-y-5">
              <div>
                <p className="font-header text-[9px] tracking-[0.4em] uppercase text-black/35 mb-3">Order Total</p>
                <p className="font-header text-6xl tracking-tighter leading-none">฿{totalPrice?.toLocaleString()}</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 pt-4 border-t border-black/8 text-sm">
                {models.map((model: any) => (
                  <div key={model.id} className="flex items-center justify-between">
                    <span className="text-black/40 text-xs truncate max-w-[60%]">{model.name} ×{model.quantity}</span>
                    <span className="font-header text-xs text-black/60">{model.material}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-black/8">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Subtotal</span>
                  <span className="font-header text-sm">฿{subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30 flex items-center gap-1.5">
                    {shippingCost === 0 ? <Store size={9} /> : <Truck size={9} />}
                    Shipping
                  </span>
                  <span className={`font-header text-sm ${shippingCost === 0 ? 'text-emerald-600' : ''}`}>
                    {shippingCost === 0 ? 'Free' : `฿${shippingCost}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Weight</span>
                  <span className="font-header text-sm">{weightG?.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Print Time</span>
                  <span className="font-header text-sm">{printDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Resolution</span>
                  <span className="font-header text-sm">{layerLabel(layerHeight)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Infill</span>
                  <span className="font-header text-sm">{infill}%</span>
                </div>
              </div>

              {/* CTA */}
              <button onClick={handleConfirm} disabled={!isValid || loading}
                className="w-full py-5 rounded-2xl bg-black text-white font-header text-base uppercase tracking-[0.2em] transition-all disabled:opacity-25 hover:bg-neutral-800 active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl">
                {loading
                  ? <><Loader2 size={17} className="animate-spin" />Processing…</>
                  : <><Zap size={17} />Place Order</>
                }
              </button>

              {!isValid && (
                <p className="text-center text-[9px] font-header tracking-widest uppercase text-black/30">
                  Complete required fields to continue
                </p>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Shield,      label: 'Secure',    desc: 'Encrypted checkout' },
                { icon: Truck,       label: 'Tracked',   desc: 'Real-time updates' },
                { icon: CheckCircle2,label: 'QC Check',  desc: 'Quality verified' },
                { icon: ArrowRight,  label: 'Fast',      desc: '3–7 business days' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                    <b.icon size={12} className="text-white/30" />
                  </div>
                  <div>
                    <p className="font-header text-[10px] tracking-wide uppercase text-white/50 leading-none">{b.label}</p>
                    <p className="text-[8px] text-white/20 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-[8px] font-header tracking-[0.2em] uppercase text-white/12 px-4">
              By placing an order you agree to our terms & privacy policy
            </p>
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-[100] bg-[#080810]/95 backdrop-blur-xl border-t border-white/8 px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-[8px] font-header tracking-widest uppercase text-white/20 mb-0.5">Total</p>
            <p className="font-header text-2xl tracking-tighter">฿{totalPrice?.toLocaleString()}</p>
          </div>
          <button onClick={handleConfirm} disabled={!isValid || loading}
            className="flex-1 py-4 rounded-2xl font-header text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-2 bg-white text-black shadow-2xl active:scale-[0.98]">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={14} />}
            {loading ? 'Processing…' : isValid ? 'Place Order →' : 'Complete Form'}
          </button>
        </div>
      </div>
    </div>
  )
}
