"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOrderStore } from '@/lib/store'
import { supabase, isPlaceholder } from '@/lib/supabase/client'

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

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, estimateData.quantity + delta)
    const newTotal = (estimateData.result.totalPrice / estimateData.quantity) * newQuantity
    setEstimateData({
      ...estimateData,
      quantity: newQuantity,
      result: { ...estimateData.result, totalPrice: newTotal }
    })
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      let orderId = crypto.randomUUID()
      
      // Attempt to save to Supabase
      if (!isPlaceholder) {
        const { data, error } = await supabase.from('orders').insert({
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_address: customer.address,
          file_name: estimateData.models[0]?.name || 'unknown.stl',
          technology: estimateData.technology,
          material: estimateData.material,
          color: estimateData.colorId,
          infill: estimateData.infill,
          layer_height: estimateData.layerHeight,
          quantity: estimateData.quantity,
          volume_cm3: estimateData.models[0]?.volumeCm3,
          weight_g: estimateData.result.weightG,
          total_price: estimateData.result.totalPrice,
          base_price: estimateData.result.totalPrice / estimateData.quantity,
          status: 'pending'
        }).select().single()
        
        if (error) throw error
        orderId = data.id
      } else {
        // Fallback for local testing without Supabase
        const localOrder = {
          id: orderId,
          createdAt: new Date().toISOString(),
          status: 'pending',
          customer,
          items: {
            fileName: estimateData.models[0]?.name,
            technology: estimateData.technology,
            material: estimateData.material,
            color: estimateData.colorId,
            infill: estimateData.infill,
            layerHeight: estimateData.layerHeight,
            quantity: estimateData.quantity
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
      <nav className="px-8 py-8 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-16">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-16">
          {/* Summary Section */}
          <div className="lg:col-span-5 space-y-8 order-2 lg:order-1">
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-10">
              <h2 className="font-header text-2xl uppercase tracking-tighter mb-8">Quote Summary</h2>
              
              <div className="space-y-6 font-header text-sm tracking-widest uppercase">
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="opacity-40">File</span>
                  <span className="truncate max-w-[200px]">{estimateData.models[0]?.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="opacity-40">Material</span>
                  <span>{estimateData.material}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="opacity-40">Color</span>
                  <div className="flex items-center gap-2">
                    {estimateData.colorId}
                    <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: estimateData.colorId === 'white' ? '#fff' : estimateData.colorId === 'black' ? '#000' : estimateData.colorId }} />
                  </div>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                  <span className="opacity-40">Layer / Infill</span>
                  <span>{estimateData.layerHeight}mm / {estimateData.infill}%</span>
                </div>
                
                <div className="flex justify-between items-center py-4">
                  <span className="opacity-40">Quantity</span>
                  <div className="flex items-center gap-6 bg-white/5 rounded-full px-4 py-2">
                    <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-xl">-</button>
                    <span className="w-6 text-center text-xl">{estimateData.quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-xl">+</button>
                  </div>
                </div>
              </div>

              <div className="mt-12 p-8 bg-white/5 rounded-[2rem] text-center">
                <p className="font-header text-[10px] tracking-[0.4em] opacity-40 mb-2 uppercase">Total Price</p>
                <p className="font-header text-5xl tracking-tighter">฿{estimateData.result.totalPrice.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-7 space-y-12 order-1 lg:order-2">
            <div>
              <h1 className="font-header text-4xl uppercase tracking-tighter mb-2">Customer Details</h1>
              <p className="font-body text-sm text-white/40 tracking-wide">Please enter your shipping and contact information.</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40 mb-3 block">Full Name *</label>
                  <input type="text" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-white/40 transition-colors font-body" placeholder="John Doe" />
                </div>
                <div>
                  <label className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40 mb-3 block">Phone Number *</label>
                  <input type="tel" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-white/40 transition-colors font-body" placeholder="08x-xxx-xxxx" />
                </div>
              </div>
              
              <div>
                <label className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40 mb-3 block">Email (Optional)</label>
                <input type="email" value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-white/40 transition-colors font-body" placeholder="john@example.com" />
              </div>

              <div>
                <label className="font-header text-[10px] tracking-[0.3em] uppercase opacity-40 mb-3 block">Shipping Address *</label>
                <textarea rows={3} value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-white/40 transition-colors font-body resize-none" placeholder="123 Main St..." />
              </div>
            </div>

            <button 
              onClick={handleConfirm}
              disabled={!isValid || loading}
              className="w-full py-5 rounded-xl bg-white text-black font-header text-xl font-semibold uppercase tracking-[0.4em] transition-all disabled:opacity-20 hover:bg-white/90 active:scale-[0.98]">
              {loading ? 'Processing...' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
