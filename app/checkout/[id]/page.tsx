"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import generatePayload from 'promptpay-qr'
import { Upload, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// Replace this with the actual promptpay ID (Phone number or National ID)
const PROMPTPAY_ID = "0812345678" 

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [qrPayload, setQrPayload] = useState("")
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const isPlaceholder = supabase.supabaseUrl.includes('placeholder')
        let fetchedOrder = null

        if (!isPlaceholder) {
          const { data, error } = await supabase.from('orders').select('*').eq('id', params.id).single()
          if (error) throw error
          fetchedOrder = data
        } else {
          const existing = JSON.parse(localStorage.getItem('pb3d_orders') || '[]')
          fetchedOrder = existing.find((o: any) => o.id === params.id)
        }

        if (fetchedOrder) {
          setOrder(fetchedOrder)
          const amount = isPlaceholder ? fetchedOrder.pricing.total : fetchedOrder.total_price
          const payload = generatePayload(PROMPTPAY_ID, { amount })
          setQrPayload(payload)
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error("Error fetching order", error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [params.id, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSlipFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSlipPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitSlip = async () => {
    if (!slipFile && !slipPreview) return
    setSubmitting(true)
    
    try {
      const isPlaceholder = supabase.supabaseUrl.includes('placeholder')
      
      if (!isPlaceholder) {
        // 1. Upload to Supabase Storage
        const fileExt = slipFile!.name.split('.').pop()
        const fileName = `${params.id}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment_slips')
          .upload(fileName, slipFile!)
          
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('payment_slips').getPublicUrl(fileName)

        // 2. Update order status
        const { error: updateError } = await supabase.from('orders').update({
          status: 'awaiting_verification',
          slip_url: publicUrl
        }).eq('id', params.id)
        
        if (updateError) throw updateError
      } else {
        // Fallback local update
        const existing = JSON.parse(localStorage.getItem('pb3d_orders') || '[]')
        const updated = existing.map((o: any) => {
          if (o.id === params.id) {
            return { ...o, status: 'awaiting_verification', payment: { slip: slipPreview } }
          }
          return o
        })
        localStorage.setItem('pb3d_orders', JSON.stringify(updated))
      }

      setSuccess(true)
      
      // Auto email sending could be triggered here via an API route
      // await fetch('/api/email', { method: 'POST', body: JSON.stringify({ orderId: params.id }) })

    } catch (error) {
      console.error('Error submitting slip:', error)
      alert('Failed to upload slip. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>
  if (!order) return null

  if (success) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#F2F2F2] flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h1 className="font-header text-4xl uppercase tracking-tighter mb-4">Payment Received</h1>
        <p className="font-body text-white/60 mb-12 max-w-md">
          Thank you! Your payment slip has been uploaded successfully. We are reviewing it and will notify you via email once confirmed.
        </p>
        <Link href="/" className="px-8 py-4 bg-white text-black font-header text-sm uppercase tracking-widest rounded-xl hover:bg-white/90">
          Return to Home
        </Link>
      </div>
    )
  }

  const amount = order.pricing?.total || order.total_price

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 pb-32">
      <nav className="px-8 py-8 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-16">
        <div className="text-center mb-12">
          <h1 className="font-header text-4xl uppercase tracking-tighter mb-2">Checkout</h1>
          <p className="font-header text-sm text-white/40 tracking-[0.2em] uppercase">Order #{params.id.split('-')[0]}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Payment Details */}
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center flex flex-col items-center">
              <h2 className="font-header text-lg uppercase tracking-widest text-white/60 mb-6">PromptPay QR</h2>
              <div className="bg-white p-4 rounded-3xl mb-6">
                {/* Use a public QR code generator API for the promptpay payload */}
                {qrPayload && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrPayload}`} alt="PromptPay QR" className="w-48 h-48" />}
              </div>
              <p className="font-header text-3xl tracking-tighter">฿{amount.toFixed(2)}</p>
              <p className="font-header text-[10px] tracking-widest uppercase opacity-40 mt-2">Scan to pay instantly</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
              <h2 className="font-header text-lg uppercase tracking-widest text-white/60 mb-6">Bank Transfer</h2>
              <div className="space-y-4 font-header tracking-wide text-sm">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="opacity-40">Bank</span>
                  <span>Kasikorn Bank (KBank)</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="opacity-40">Account No.</span>
                  <span className="tracking-widest">123-4-56789-0</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="opacity-40">Name</span>
                  <span>Chalawan 3D Co., Ltd.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slip Upload */}
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 flex flex-col">
            <h2 className="font-header text-2xl uppercase tracking-tighter mb-2">Upload Slip</h2>
            <p className="font-body text-xs text-white/40 mb-8">Please upload a screenshot of your transfer slip to confirm your order.</p>
            
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-white/30 transition-colors">
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              
              {slipPreview ? (
                <div className="absolute inset-0 bg-black">
                  <img src={slipPreview} alt="Slip preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="font-header text-xs tracking-widest uppercase bg-white text-black px-4 py-2 rounded-full">Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white/20 group-hover:text-white/60 transition-colors">
                  <Upload className="w-12 h-12 mb-4" />
                  <span className="font-header text-[10px] tracking-widest uppercase">Click or drag image here</span>
                </div>
              )}
            </div>

            <button 
              onClick={handleSubmitSlip}
              disabled={!slipPreview || submitting}
              className="w-full mt-8 py-6 rounded-2xl bg-white text-black font-header text-sm uppercase tracking-[0.4em] transition-all disabled:opacity-20 hover:bg-white/90 active:scale-[0.98]">
              {submitting ? 'Submitting...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
