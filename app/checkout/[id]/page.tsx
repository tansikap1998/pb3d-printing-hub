"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, CheckCircle, Copy, ArrowLeft, Loader2 } from 'lucide-react'
import { supabase, isPlaceholder } from '@/lib/supabase/client'
import { Stepper } from '@/components/Stepper'

const BANK_ACCOUNT = "5981153600"
const ACCOUNT_NAME = "รัชณีย์กร บุญหล้า"

export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30 * 60)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  useEffect(() => {
    const fetchOrder = async () => {
      try {
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

      router.push(`/checkout/${params.id}/success`)
    } catch (error) {
      console.error('Error submitting slip:', error)
      alert('Failed to upload slip. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>
  if (!order) return null

  const amount = order.pricing?.total || order.total_price

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 pb-32">
      <nav className="px-8 py-8 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-white/20">HUB</span>
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-16">
        <Stepper 
          steps={["Upload", "Configure", "Checkout", "Confirmed"]} 
          currentStep={2} 
        />

        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <Link href="/upload" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-base font-header uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" />
            Back to edit order
          </Link>
          <div className="text-center">
            <h1 className="font-header text-4xl uppercase tracking-tighter mb-2">Checkout</h1>
            <p className="font-header text-sm text-white/40 tracking-[0.2em] uppercase">Order #{params.id.split('-')[0]}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="font-header text-[10px] tracking-widest uppercase text-orange-500">
              Please complete payment within {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Payment Details */}
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 shadow-xl">
              <h2 className="font-header text-sm uppercase tracking-[0.3em] text-white/60 mb-2">โอนเงินผ่านบัญชีธนาคาร</h2>
              <p className="font-header text-5xl md:text-6xl font-bold tracking-tighter mb-8">฿{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="grid grid-cols-1 gap-6 font-medium">
                <div className="flex items-center justify-between py-4 border-b border-white/10">
                  <p className="text-sm text-white/60 uppercase tracking-widest">ธนาคาร</p>
                  <p className="text-base font-semibold">กรุงศรีอยุธยา (Krungsri)</p>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-white/10">
                  <p className="text-sm text-white/60 uppercase tracking-widest">ชื่อบัญชี</p>
                  <p className="text-base font-semibold">{ACCOUNT_NAME}</p>
                </div>
                <div className="flex items-center justify-between py-4">
                  <p className="text-sm text-white/60 uppercase tracking-widest">เลขที่บัญชี</p>
                  <div className="flex items-center gap-3 relative">
                    <p className="text-xl font-bold tracking-widest">{BANK_ACCOUNT}</p>
                    <button
                      onClick={() => copyToClipboard(BANK_ACCOUNT, "account")}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                    >
                      {copiedField === 'account' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copiedField === 'account' && (
                      <span className="absolute -top-8 right-0 bg-white text-black text-[10px] px-2 py-1 rounded font-header uppercase tracking-widest">Copied</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slip Upload */}
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 flex flex-col shadow-2xl">
            <h2 className="font-header text-2xl uppercase tracking-tighter mb-2">Upload Slip</h2>
            <p className="font-body text-xs text-white/40 mb-8">JPG, PNG, PDF • Max 5MB</p>
            
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-white/30 transition-all duration-300">
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
              
              {slipPreview ? (
                <div className="absolute inset-0 bg-neutral-900">
                  <img src={slipPreview} alt="Slip preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-30">
                    <button className="font-header text-base tracking-widest uppercase bg-white text-black px-6 py-3 rounded-xl">Replace</button>
                    <button onClick={(e) => { e.preventDefault(); setSlipFile(null); setSlipPreview(null); }} className="font-header text-base tracking-widest uppercase bg-red-500 text-white px-6 py-3 rounded-xl">Delete</button>
                  </div>
                  <div className="absolute top-4 right-4 bg-green-500 rounded-full p-1 shadow-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-white/20 group-hover:text-white/60 transition-colors">
                  <div className="p-4 bg-white/5 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10" />
                  </div>
                  <span className="font-header text-[10px] tracking-widest uppercase">Click or drag image here</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-8">
              {!slipPreview && (
                <p className="text-orange-500 text-[10px] font-header uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-1 bg-orange-500 rounded-full" />
                  * Please upload slip before confirming
                </p>
              )}
              <button 
                onClick={handleSubmitSlip}
                disabled={!slipPreview || submitting}
                className={`w-full py-5 rounded-xl font-header text-xl uppercase tracking-[0.4em] transition-all duration-300 shadow-2xl flex items-center justify-center gap-4 ${
                  !slipPreview || submitting 
                    ? 'bg-white/10 text-white/40 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-gray-300 font-semibold active:scale-[0.98]'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
