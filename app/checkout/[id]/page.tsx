"use client"

import ThemeToggle from '@/components/ThemeToggle'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, CheckCircle, Copy, ArrowLeft, Loader2 } from 'lucide-react'
import { MAX_SLIP_BYTES, SLIP_TYPES, validateSlip } from '@/lib/orderInput'
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
  const [slipError, setSlipError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Same rules as the server (/api/orders/[id]/slip) so the picker never accepts a file the upload will reject
  const SLIP_ACCEPT = Object.keys(SLIP_TYPES).join(',')
  const isPdf = slipFile?.type === 'application/pdf'

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
        const res = await fetch(`/api/orders/${params.id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const fetchedOrder = (await res.json()).order

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
    e.target.value = '' // allow choosing the same file again after delete
    if (file) {
      const check = validateSlip(file)
      if (!check.ok) {
        setSlipError(file.size > MAX_SLIP_BYTES ? 'ไฟล์ใหญ่เกิน 4MB กรุณาเลือกไฟล์ใหม่' : 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP, HEIC หรือ PDF')
        return
      }
      setSlipError('')
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
      // The server checks the order is still awaiting payment, stores the slip in a
      // private Google Drive folder and updates the order.
      const fd = new FormData()
      fd.append('file', slipFile!)
      const res = await fetch(`/api/orders/${params.id}/slip`, { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${res.status}`)
      }

      router.push(`/checkout/${params.id}/success`)
    } catch (error: any) {
      console.error('Error submitting slip:', error)
      setSlipError(error?.message && error.message !== 'Failed to fetch' ? `อัปโหลดสลิปไม่สำเร็จ: ${error.message}` : 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading...</div>
  if (!order) return null

  const amount = Number(order.pricing?.total ?? order.total_price ?? 0)
  const alreadySubmitted = order.status && order.status !== 'pending'

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground/20 pb-32">
      <nav className="px-5 sm:px-8 py-6 sm:py-8 flex items-center justify-between border-b border-foreground/5">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-foreground/20">HUB</span>
        </Link>
        <ThemeToggle />
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-16">
        <Stepper 
          steps={["Upload", "Configure", "Checkout", "Confirmed"]} 
          currentStep={2} 
        />

        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <Link href="/upload" className="flex items-center gap-2 text-foreground/40 hover:text-foreground transition-colors text-base font-header uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" />
            Back to edit order
          </Link>
          <div className="text-center">
            <h1 className="font-semibold tracking-tight text-4xl mb-2">Checkout</h1>
            <p className="font-header text-sm text-foreground/40 tracking-[0.2em] uppercase">Order #{params.id.split('-')[0]}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="font-header text-2xs tracking-widest uppercase text-orange-500">
              Please complete payment within {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Payment Details */}
          <div className="space-y-8">
            <div className="bg-foreground/5 border border-foreground/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-xl">
              <h2 className="text-sm font-semibold text-foreground/60 mb-2">โอนเงินผ่านบัญชีธนาคาร</h2>
              <p className="font-header text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-8 break-all">฿{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <div className="grid grid-cols-1 gap-6 font-medium">
                <div className="flex items-center justify-between py-4 border-b border-foreground/10">
                  <p className="text-sm text-foreground/60">ธนาคาร</p>
                  <p className="text-base font-semibold">กรุงศรีอยุธยา (Krungsri)</p>
                </div>
                <div className="flex items-center justify-between py-4 border-b border-foreground/10">
                  <p className="text-sm text-foreground/60">ชื่อบัญชี</p>
                  <p className="text-base font-semibold">{ACCOUNT_NAME}</p>
                </div>
                <div className="flex items-center justify-between py-4">
                  <p className="text-sm text-foreground/60">เลขที่บัญชี</p>
                  <div className="flex items-center gap-3 relative">
                    <p className="text-xl font-bold tracking-widest">{BANK_ACCOUNT}</p>
                    <button
                      onClick={() => copyToClipboard(BANK_ACCOUNT, "account")}
                      className="p-2 hover:bg-foreground/10 rounded-lg transition-colors text-foreground/40 hover:text-foreground"
                    >
                      {copiedField === 'account' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copiedField === 'account' && (
                      <span className="absolute -top-8 right-0 bg-foreground text-background text-2xs px-2 py-1 rounded font-header uppercase tracking-widest">Copied</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slip Upload */}
          <div className="bg-foreground/[0.02] border border-foreground/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 flex flex-col shadow-2xl">
            <h2 className="font-semibold tracking-tight text-2xl mb-2">Upload Slip</h2>
            <p className="font-body text-xs text-foreground/40 mb-8">JPG, PNG, WEBP, HEIC, PDF • Max 4MB</p>
            
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-foreground/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-foreground/30 transition-all duration-300">
              <input ref={fileInputRef} data-testid="slip-input" type="file" accept={SLIP_ACCEPT} onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
              
              {slipPreview ? (
                <div className="absolute inset-0 bg-neutral-900">
                  {isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-foreground/70">
                      <Upload className="w-10 h-10" />
                      <span className="text-sm break-all px-6 text-center">{slipFile?.name}</span>
                    </div>
                  ) : (
                    <img src={slipPreview} alt="Slip preview" className="w-full h-full object-contain" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-30">
                    <button onClick={(e) => { e.preventDefault(); fileInputRef.current?.click() }} className="font-header text-base tracking-widest uppercase bg-foreground text-background px-6 py-3 rounded-xl">Replace</button>
                    <button onClick={(e) => { e.preventDefault(); setSlipFile(null); setSlipPreview(null); }} className="font-header text-base tracking-widest uppercase bg-red-500 text-white px-6 py-3 rounded-xl">Delete</button>
                  </div>
                  <div className="absolute top-4 right-4 bg-green-500 rounded-full p-1 shadow-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-foreground/20 group-hover:text-foreground/60 transition-colors">
                  <div className="p-4 bg-foreground/5 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10" />
                  </div>
                  <span className="font-header text-2xs tracking-widest uppercase">Click or drag image here</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-8">
              {slipError && (
                <p role="alert" className="text-red-400 text-xs mb-4">{slipError}</p>
              )}
              {alreadySubmitted && (
                <p className="text-emerald-400 text-xs mb-4">ได้รับสลิปของคำสั่งซื้อนี้แล้ว — อัปโหลดใหม่ได้หากต้องการเปลี่ยน</p>
              )}
              {!slipPreview && (
                <p className="text-orange-500 text-2xs font-header uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-1 bg-orange-500 rounded-full" />
                  * Please upload slip before confirming
                </p>
              )}
              <button 
                onClick={handleSubmitSlip}
                disabled={!slipPreview || submitting}
                className={`w-full py-5 rounded-xl font-header text-xl uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-all duration-300 shadow-2xl flex items-center justify-center gap-4 ${
                  !slipPreview || submitting 
                    ? 'bg-foreground/10 text-foreground/40 cursor-not-allowed' 
                    : 'bg-foreground text-background hover:bg-foreground/80 font-semibold active:scale-[0.98]'
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
