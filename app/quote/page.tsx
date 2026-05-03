"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store'
import { supabase, isPlaceholder } from '@/lib/supabase/client'
import { FileText, ChevronLeft, Package, User, MapPin, Phone, Mail } from 'lucide-react'

export default function QuotePage() {
  const router = useRouter()
  const { estimateData, setEstimateData, _hasHydrated } = useOrderStore()
  
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '' })
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (_hasHydrated && !estimateData) {
      router.replace('/upload')
    }
  }, [estimateData, _hasHydrated, router])

  if (!_hasHydrated) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>
  if (!estimateData) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Redirecting...</div>

  const handleConfirm = async () => {
    setLoading(true)
    try {
      let orderId = crypto.randomUUID()
      
      // For Multi-upload: we join names and store the overall total
      const fileNames = estimateData.models.map((m: any) => m.name).join(', ')
      const materials = estimateData.models.map((m: any) => m.material).join(', ')
      const totalQuantity = estimateData.models.reduce((acc: number, m: any) => acc + m.quantity, 0)

      if (!isPlaceholder) {
        const { data, error } = await supabase.from('orders').insert({
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_address: customer.address,
          file_name: fileNames.slice(0, 255), // DB constraint usually 255
          technology: estimateData.technology,
          material: materials.slice(0, 255),
          color: estimateData.models[0]?.colorId || 'various',
          infill: estimateData.infill,
          layer_height: estimateData.layerHeight,
          quantity: totalQuantity,
          volume_cm3: estimateData.models.reduce((acc: number, m: any) => acc + m.volumeCm3, 0),
          weight_g: estimateData.result.weightG,
          total_price: estimateData.result.totalPrice,
          base_price: estimateData.result.totalPrice, // for multi, base = total for now
          status: 'pending'
        }).select().single()
        
        if (error) throw error
        orderId = data.id
      } else {
        const localOrder = {
          id: orderId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          customer,
          items: {
            fileName: fileNames,
            technology: estimateData.technology,
            material: materials,
            color: 'various',
            infill: estimateData.infill,
            layerHeight: estimateData.layerHeight,
            quantity: totalQuantity
          },
          pricing: {
            total: estimateData.result.totalPrice,
            weightG: estimateData.result.weightG
          },
          delivery: { trackingNumber: null }
        }
        const existing = JSON.parse(localStorage.getItem('pb3d_orders') || '[]')
        localStorage.setItem('pb3d_orders', JSON.stringify([localOrder, ...existing]))
      }

      router.push(`/checkout/${orderId}`)
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Failed to create order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isValid = customer.name && customer.phone && customer.address

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 pb-32">
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-8 flex items-center justify-between mix-blend-difference">
        <Link href="/upload" className="flex items-center gap-2 font-header text-xs tracking-[0.3em] uppercase opacity-40 hover:opacity-100 transition-opacity">
          <ChevronLeft size={16} />
          Back to Upload
        </Link>
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
        <div className="w-24 md:w-32" /> {/* Spacer */}
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-40">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-16 items-start">
          
          {/* Order Details Column */}
          <div className="lg:col-span-7 space-y-12">
            <div>
              <h1 className="font-header text-[clamp(2.5rem,8vw,5rem)] uppercase tracking-tighter leading-[0.9] mb-4">Confirm<br/>Your Order</h1>
              <p className="font-body text-sm text-white/40 tracking-widest uppercase">Review items and provide shipping details</p>
            </div>

            {/* Item List */}
            <div className="space-y-4">
              <h3 className="font-header text-xs tracking-[0.4em] opacity-30 uppercase flex items-center gap-2">
                <Package size={14} />
                Shopping Bag ({estimateData.models.length} items)
              </h3>
              <div className="space-y-3">
                {estimateData.models.map((model: any) => (
                  <div key={model.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                        <FileText size={24} className="opacity-20" />
                      </div>
                      <div>
                        <p className="font-header text-lg tracking-tight mb-1 truncate max-w-[200px] sm:max-w-md">{model.name}</p>
                        <p className="text-[10px] font-header tracking-widest opacity-30 uppercase">
                          {model.material} · {model.colorId} · QTY: {model.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="font-header text-[10px] tracking-widest opacity-20 uppercase mb-1">Dimensions</p>
                      <p className="font-header text-xs opacity-40">{model.dimensions.x.toFixed(0)}x{model.dimensions.y.toFixed(0)}x{model.dimensions.z.toFixed(0)} mm</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Section (Mobile Layout Support) */}
            <div className="bg-white text-black p-12 rounded-[3rem] shadow-2xl lg:hidden">
                <p className="font-header text-[10px] tracking-[0.4em] opacity-30 mb-2 uppercase">Amount to pay</p>
                <p className="font-header text-7xl tracking-tighter">฿{estimateData.result.totalPrice.toLocaleString()}</p>
            </div>

            {/* Shipping Form */}
            <div className="space-y-10 pt-10 border-t border-white/10">
              <h3 className="font-header text-xs tracking-[0.4em] opacity-30 uppercase flex items-center gap-2">
                <MapPin size={14} />
                Shipping Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="font-header text-[9px] tracking-[0.3em] uppercase opacity-30 mb-3 block group-focus-within:opacity-100 transition-opacity">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                    <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-16 pr-6 py-5 focus:outline-none focus:border-white/20 transition-all font-body text-base" placeholder="John Doe" />
                  </div>
                </div>
                <div className="group">
                  <label className="font-header text-[9px] tracking-[0.3em] uppercase opacity-30 mb-3 block group-focus-within:opacity-100 transition-opacity">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                    <input type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-16 pr-6 py-5 focus:outline-none focus:border-white/20 transition-all font-body text-base" placeholder="08x-xxx-xxxx" />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="font-header text-[9px] tracking-[0.3em] uppercase opacity-30 mb-3 block group-focus-within:opacity-100 transition-opacity">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                  <input type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-16 pr-6 py-5 focus:outline-none focus:border-white/20 transition-all font-body text-base" placeholder="john@example.com" />
                </div>
              </div>

              <div className="group">
                <label className="font-header text-[9px] tracking-[0.3em] uppercase opacity-30 mb-3 block group-focus-within:opacity-100 transition-opacity">Full Address</label>
                <textarea rows={4} value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-[2rem] px-8 py-6 focus:outline-none focus:border-white/20 transition-all font-body text-base resize-none" placeholder="123 Printing Street, Bangkok, 10xxx" />
              </div>
            </div>
          </div>

          {/* Checkout Column (Sticky) */}
          <div className="lg:col-span-5 w-full lg:sticky lg:top-32 hidden lg:block">
            <div className="bg-white text-black p-12 rounded-[3.5rem] shadow-2xl space-y-12">
              <div>
                <p className="font-header text-[10px] tracking-[0.4em] opacity-30 mb-4 uppercase">Order Total</p>
                <p className="font-header text-8xl tracking-tighter leading-none">฿{estimateData.result.totalPrice.toLocaleString()}</p>
                <div className="mt-8 flex justify-between font-header text-[10px] tracking-widest opacity-30 border-t border-black/5 pt-8">
                  <span>EST. WEIGHT</span>
                  <span>{estimateData.result.weightG.toFixed(1)} G</span>
                </div>
              </div>

              <button 
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="w-full py-7 rounded-2xl bg-black text-white font-header text-2xl font-semibold uppercase tracking-[0.2em] transition-all disabled:opacity-20 hover:bg-gray-900 active:scale-[0.98] shadow-xl">
                {loading ? 'Processing...' : 'Place Order →'}
              </button>

              <div className="text-center">
                <p className="text-[9px] font-black tracking-[0.2em] opacity-20 uppercase">By placing an order, you agree to our terms & conditions</p>
              </div>
            </div>
          </div>

          {/* Bottom CTA for Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-xl border-t border-white/10 z-[100] lg:hidden">
             <button 
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="w-full py-6 rounded-xl bg-white text-black font-header text-xl font-semibold uppercase tracking-widest transition-all disabled:opacity-20 shadow-2xl">
                {loading ? 'Processing...' : 'Place Order →'}
              </button>
          </div>
        </div>
      </main>
    </div>
  )
}
