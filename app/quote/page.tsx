"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store'
import { supabase, isPlaceholder } from '@/lib/supabase/client'
import { formatTime } from '@/lib/priceCalculator'
import {
  FileText, ChevronLeft, User, MapPin, Phone, Mail,
  Shield, Truck, Clock, Weight, Box, CheckCircle2,
  Layers, ArrowRight, Loader2, AlertCircle, Zap
} from 'lucide-react'

const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#3b82f6', PETG: '#8b5cf6', ABS: '#f59e0b',
  ASA: '#10b981', TPU: '#ec4899', CarbonFiber: '#6b7280', Nylon: '#f97316',
}

function InputField({
  label, icon: Icon, type = 'text', value, onChange, placeholder, required
}: {
  label: string; icon: any; type?: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const filled = value.length > 0
  return (
    <div className="group">
      <label className={`text-[9px] font-header tracking-[0.35em] uppercase mb-2 block transition-colors ${focused ? 'text-blue-400' : 'text-white/25'}`}>
        {label}{required && <span className="text-blue-400/60 ml-1">*</span>}
      </label>
      <div className={`relative flex items-center border rounded-2xl transition-all duration-200 ${focused ? 'border-blue-400/40 bg-blue-500/5' : filled ? 'border-white/12 bg-white/[0.03]' : 'border-white/6 bg-white/[0.02]'}`}>
        <Icon size={15} className={`absolute left-4 transition-colors ${focused ? 'text-blue-400' : 'text-white/20'}`} />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-11 pr-4 py-4 font-body text-sm text-white placeholder:text-white/15 outline-none"
        />
        {filled && <CheckCircle2 size={14} className="absolute right-4 text-emerald-400/60" />}
      </div>
    </div>
  )
}

function TextareaField({
  label, icon: Icon, value, onChange, placeholder, required
}: {
  label: string; icon: any; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const filled = value.length > 0
  return (
    <div>
      <label className={`text-[9px] font-header tracking-[0.35em] uppercase mb-2 block transition-colors ${focused ? 'text-blue-400' : 'text-white/25'}`}>
        {label}{required && <span className="text-blue-400/60 ml-1">*</span>}
      </label>
      <div className={`relative border rounded-2xl transition-all duration-200 ${focused ? 'border-blue-400/40 bg-blue-500/5' : filled ? 'border-white/12 bg-white/[0.03]' : 'border-white/6 bg-white/[0.02]'}`}>
        <Icon size={15} className={`absolute left-4 top-4 transition-colors ${focused ? 'text-blue-400' : 'text-white/20'}`} />
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent pl-11 pr-4 py-4 font-body text-sm text-white placeholder:text-white/15 outline-none resize-none"
        />
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
  const totalQty = models.reduce((a: number, m: any) => a + m.quantity, 0)
  const isValid = customer.name.trim() && customer.phone.trim() && customer.address.trim()

  const handleConfirm = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      let orderId = crypto.randomUUID()
      const fileNames = models.map((m: any) => m.name).join(', ')
      const materials = models.map((m: any) => m.material).join(', ')

      if (!isPlaceholder) {
        const { data, error: dbErr } = await supabase.from('orders').insert({
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_address: customer.address,
          file_name: fileNames.slice(0, 255),
          technology,
          material: materials.slice(0, 255),
          color: models[0]?.colorId || 'various',
          infill,
          layer_height: layerHeight,
          quantity: totalQty,
          volume_cm3: models.reduce((a: number, m: any) => a + m.volumeCm3, 0),
          weight_g: result.weightG,
          total_price: result.totalPrice,
          base_price: result.totalPrice,
          status: 'pending'
        }).select().single()
        if (dbErr) throw dbErr
        orderId = data.id
      } else {
        const localOrder = {
          id: orderId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          customer,
          items: { fileName: fileNames, technology, material: materials, color: 'various', infill, layerHeight, quantity: totalQty },
          pricing: { total: result.totalPrice, weightG: result.weightG },
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
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 flex items-center justify-between bg-[#080810]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <Link href="/upload" className="flex items-center gap-2 text-[10px] font-header tracking-[0.3em] uppercase text-white/25 hover:text-white/60 transition-colors">
          <ChevronLeft size={14} /> Back
        </Link>
        <Link href="/" className="font-header text-2xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/15">HUB</span>
        </Link>
        {/* Step indicator */}
        <div className="hidden md:flex items-center gap-3 text-[10px] font-header tracking-[0.3em] uppercase">
          <span className="text-white/20">01 Upload</span>
          <div className="w-8 h-px bg-white/10" />
          <span className="text-blue-400">02 Quote</span>
          <div className="w-8 h-px bg-white/10" />
          <span className="text-white/20">03 Checkout</span>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 pt-28">

        {/* Header */}
        <div className="py-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-header tracking-[0.4em] uppercase text-white/30">Order Summary</span>
          </div>
          <h1 className="font-header text-[clamp(2rem,5vw,3.5rem)] tracking-tighter leading-[0.9]">
            Confirm Your<br />Order
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── LEFT: Items + Form ── */}
          <div className="lg:col-span-7 space-y-8">

            {/* Order items */}
            <div className="space-y-3">
              <p className="text-[9px] font-header tracking-[0.4em] uppercase text-white/20 flex items-center gap-2">
                <Box size={11} /> Items · {models.length} {models.length === 1 ? 'file' : 'files'} · {totalQty} pcs
              </p>

              <div className="space-y-2">
                {models.map((model: any) => (
                  <div key={model.id} className="bg-white/[0.02] border border-white/6 rounded-2xl p-4 flex items-center gap-4">
                    {/* File icon */}
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/8 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-white/20" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-header text-sm tracking-tight truncate mb-1">{model.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[9px] font-header tracking-wider uppercase px-2 py-0.5 rounded-full border"
                          style={{
                            color: MATERIAL_COLORS[model.material] || '#fff',
                            borderColor: `${MATERIAL_COLORS[model.material] || '#fff'}30`,
                            background: `${MATERIAL_COLORS[model.material] || '#fff'}10`,
                          }}
                        >
                          {model.material}
                        </span>
                        <span className="text-[9px] text-white/25 font-body capitalize">{model.colorId}</span>
                        {model.dimensions?.x > 0 && (
                          <span className="text-[9px] text-white/20 font-body">
                            {model.dimensions.x.toFixed(0)}×{model.dimensions.y.toFixed(0)}×{model.dimensions.z.toFixed(0)} mm
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Qty badge */}
                    <div className="shrink-0 text-right">
                      <div className="bg-white/5 border border-white/8 rounded-lg px-3 py-1.5">
                        <p className="font-header text-xs">×{model.quantity}</p>
                      </div>
                      <p className="text-[8px] text-white/20 mt-1">{model.volumeCm3.toFixed(1)} cm³</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print summary strip */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Clock, label: "Print Time", value: formatTime(result.printTimeMin) },
                { icon: Weight, label: "Total Weight", value: `${result.weightG.toFixed(0)}g` },
                { icon: Layers, label: `Infill · ${infill}%`, value: layerHeight === 0.12 ? 'Fine' : layerHeight === 0.2 ? 'Standard' : 'Draft' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.02] border border-white/6 rounded-2xl p-4 text-center">
                  <s.icon size={14} className="mx-auto mb-2 text-white/20" />
                  <p className="font-header text-base tracking-tight">{s.value}</p>
                  <p className="text-[8px] font-header tracking-widest uppercase text-white/25 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Mobile price (shown only on small screens) */}
            <div className="lg:hidden bg-white text-black rounded-3xl p-6">
              <p className="font-header text-[9px] tracking-[0.4em] uppercase text-black/40 mb-2">Order Total</p>
              <p className="font-header text-5xl tracking-tighter">฿{result.totalPrice.toLocaleString()}</p>
            </div>

            {/* Shipping form */}
            <div className="space-y-5 pt-6 border-t border-white/6">
              <p className="text-[9px] font-header tracking-[0.4em] uppercase text-white/20 flex items-center gap-2">
                <Truck size={11} /> Shipping Information
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Full Name" icon={User} value={customer.name} onChange={v => setCustomer(p => ({ ...p, name: v }))} placeholder="John Doe" required />
                <InputField label="Phone Number" icon={Phone} type="tel" value={customer.phone} onChange={v => setCustomer(p => ({ ...p, phone: v }))} placeholder="08x-xxx-xxxx" required />
              </div>

              <InputField label="Email Address" icon={Mail} type="email" value={customer.email} onChange={v => setCustomer(p => ({ ...p, email: v }))} placeholder="john@example.com" />

              <TextareaField label="Delivery Address" icon={MapPin} value={customer.address} onChange={v => setCustomer(p => ({ ...p, address: v }))} placeholder="123 Printing Street, Bangkok 10xxx" required />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-red-500/8 border border-red-500/20 rounded-2xl">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Mobile CTA */}
            <button
              onClick={handleConfirm}
              disabled={!isValid || loading}
              className="w-full lg:hidden py-5 rounded-2xl font-header text-base uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-3 bg-white text-black shadow-2xl active:scale-[0.98]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {loading ? 'Placing Order…' : 'Place Order'}
            </button>
          </div>

          {/* ── RIGHT: Price & CTA (sticky) ── */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 space-y-4">

            {/* Price card */}
            <div className="bg-white text-black rounded-3xl p-8 shadow-2xl">
              <p className="font-header text-[9px] tracking-[0.4em] uppercase text-black/35 mb-3">Order Total</p>
              <p className="font-header text-7xl tracking-tighter leading-none">฿{result.totalPrice.toLocaleString()}</p>

              {/* Breakdown */}
              <div className="mt-6 space-y-2 border-t border-black/6 pt-5">
                {models.map((model: any) => (
                  <div key={model.id} className="flex items-center justify-between">
                    <span className="text-xs text-black/40 truncate max-w-[60%]">{model.name} ×{model.quantity}</span>
                    <span className="font-header text-xs text-black/60">{model.material}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-black/6">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Est. Weight</span>
                  <span className="font-header text-sm">{result.weightG.toFixed(1)}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] font-header tracking-widest uppercase text-black/30">Print Time</span>
                  <span className="font-header text-sm">{formatTime(result.printTimeMin)}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="w-full mt-8 py-5 rounded-2xl bg-black text-white font-header text-base uppercase tracking-[0.2em] transition-all disabled:opacity-25 hover:bg-neutral-800 active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl"
              >
                {loading ? (
                  <><Loader2 size={17} className="animate-spin" /> Processing…</>
                ) : (
                  <><Zap size={17} /> Place Order</>
                )}
              </button>

              {!isValid && (
                <p className="text-center text-[9px] font-header tracking-widest uppercase text-black/30 mt-3">
                  Complete the form to continue
                </p>
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: "Secure", desc: "Encrypted checkout" },
                { icon: Truck, label: "Fast Ship", desc: "3–7 business days" },
                { icon: CheckCircle2, label: "Quality", desc: "QC checked prints" },
                { icon: Clock, label: "Updates", desc: "Real-time tracking" },
              ].map(b => (
                <div key={b.label} className="bg-white/[0.02] border border-white/6 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center shrink-0">
                    <b.icon size={13} className="text-white/30" />
                  </div>
                  <div>
                    <p className="font-header text-[10px] tracking-wide uppercase text-white/60 leading-none">{b.label}</p>
                    <p className="text-[8px] text-white/20 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-[8px] font-header tracking-[0.2em] uppercase text-white/15 px-4">
              By placing an order you agree to our terms & conditions
            </p>
          </div>
        </div>
      </main>

      {/* Mobile sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-[100] bg-[#080810]/90 backdrop-blur-xl border-t border-white/6 px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-[8px] font-header tracking-widest uppercase text-white/20 mb-0.5">Total</p>
            <p className="font-header text-2xl tracking-tighter">฿{result.totalPrice.toLocaleString()}</p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="flex-1 py-4 rounded-2xl font-header text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-30 flex items-center justify-center gap-2 bg-white text-black shadow-2xl active:scale-[0.98]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Processing…' : 'Place Order →'}
          </button>
        </div>
      </div>
    </div>
  )
}
