"use client"

import ThemeToggle from '@/components/ThemeToggle'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, CheckCircle, Copy, Loader2, Clock, ShoppingBag, QrCode, ExternalLink, MessageCircle, CalendarDays, XCircle } from 'lucide-react'
import { MAX_SLIP_BYTES, SLIP_TYPES, validateSlip, STATUS_LABELS, TIMELINE, type OrderStatus } from '@/lib/orderInput'
import { DEFAULT_QUOTE_CONFIG, type QuoteConfig } from '@/lib/quoteConfig'
import { thaiDate } from '@/lib/quotePricing'

const baht = (n: unknown) => `฿${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Order status page: progress, the confirmed quote, and payment once the shop has confirmed the price. */
export default function CheckoutPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [cfg, setCfg] = useState<QuoteConfig>(DEFAULT_QUOTE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<'promptpay' | 'shopee'>('promptpay')
  const [qr, setQr] = useState<string | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [slipError, setSlipError] = useState('')
  const [shopeeRef, setShopeeRef] = useState('')
  const [shopeeMsg, setShopeeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Same rules as the server (/api/orders/[id]/slip) so the picker never accepts a file the upload will reject
  const SLIP_ACCEPT = Object.keys(SLIP_TYPES).join(',')
  const isPdf = slipFile?.type === 'application/pdf'

  const fetchOrder = useCallback(async (first = false) => {
    try {
      const res = await fetch(`/api/orders/${params.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const o = (await res.json()).order
      if (o) setOrder(o)
      else if (first) router.push('/')
    } catch (error) {
      console.error('Error fetching order', error)
      if (first) router.push('/')
    } finally {
      if (first) setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchOrder(true)
    fetch('/api/quote-config').then(r => r.ok ? r.json() : null).then(d => { if (d?.config) setCfg(d.config) }).catch(() => {})
    // keep the status fresh while the customer waits for the shop
    const t = setInterval(() => fetchOrder(false), 30_000)
    return () => clearInterval(t)
  }, [fetchOrder])

  const status: OrderStatus | undefined = order?.status
  const canPay = status === 'pending' || status === 'awaiting_verification'

  useEffect(() => {
    if (!canPay || !cfg.payment.promptpayId) { setQr(null); return }
    fetch(`/api/orders/${params.id}/promptpay`).then(r => r.ok ? r.json() : null).then(d => setQr(d?.svg ?? null)).catch(() => setQr(null))
  }, [canPay, cfg.payment.promptpayId, params.id, order?.total_price])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow choosing the same file again after delete
    if (!file) return
    const check = validateSlip(file)
    if (!check.ok) {
      setSlipError(file.size > MAX_SLIP_BYTES ? 'ไฟล์ใหญ่เกิน 4MB กรุณาเลือกไฟล์ใหม่' : 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP, HEIC หรือ PDF')
      return
    }
    setSlipError('')
    setSlipFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setSlipPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmitSlip = async () => {
    if (!slipFile) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('file', slipFile)
      const res = await fetch(`/api/orders/${params.id}/slip`, { method: 'POST', body: fd })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      router.push(`/checkout/${params.id}/success`)
    } catch (error: any) {
      setSlipError(error?.message && error.message !== 'Failed to fetch' ? `อัปโหลดสลิปไม่สำเร็จ: ${error.message}` : 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShopee = async () => {
    setSubmitting(true); setShopeeMsg(null)
    try {
      const res = await fetch(`/api/orders/${params.id}/shopee`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopeeRef }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`)
      router.push(`/checkout/${params.id}/success`)
    } catch (e: any) { setShopeeMsg({ ok: false, text: e.message }) }
    setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading...</div>
  if (!order) return null

  const amount = Number(order.total_price ?? 0)
  let items: { label: string; detail?: string; amount: number }[] = []
  try { items = JSON.parse(order.price_items || '[]') } catch {}
  const shopeeUnits = Math.max(1, Math.ceil(amount / cfg.payment.shopeeUnitPrice))
  const stepIdx = status === 'cancelled' ? -1 : TIMELINE.indexOf(status as OrderStatus)
  const no = params.id.split('-')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground/20 pb-32">
      <nav className="px-5 sm:px-8 py-6 sm:py-8 flex items-center justify-between border-b border-foreground/5">
        <Link href="/" className="font-header text-4xl tracking-tighter uppercase leading-none">
          PB3D<span className="text-foreground/20">HUB</span>
        </Link>
        <ThemeToggle />
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/45">คำสั่งซื้อ</p>
            <h1 className="font-semibold tracking-tight text-3xl sm:text-4xl">#{no}</h1>
            <p className="text-sm text-foreground/45 mt-1">เก็บลิงก์หน้านี้ไว้ดูสถานะ หรือค้นหาจากเลขคำสั่งซื้อ + เบอร์โทรที่ <Link href="/track" className="underline">หน้าเช็กสถานะ</Link></p>
          </div>
          <div className="text-right" data-testid="order-status">
            <p className="text-xs text-foreground/45">สถานะ</p>
            <p className={`text-lg font-semibold ${status === 'cancelled' ? 'text-red-400' : 'text-blue-500'}`}>{STATUS_LABELS[status as OrderStatus] ?? status}</p>
          </div>
        </div>

        {/* Timeline */}
        {status !== 'cancelled' ? (
          <ol className="grid grid-cols-4 sm:grid-cols-8 gap-2" data-testid="status-timeline">
            {TIMELINE.map((s, i) => (
              <li key={s} className="flex flex-col gap-1.5" aria-current={i === stepIdx ? 'step' : undefined}>
                <div className={`h-1.5 rounded-full ${i < stepIdx ? 'bg-foreground/40' : i === stepIdx ? 'bg-blue-500' : 'bg-foreground/10'}`} />
                <span className={`text-[11px] leading-tight ${i === stepIdx ? 'text-blue-500 font-semibold' : i < stepIdx ? 'text-foreground/55' : 'text-foreground/30'}`}>{STATUS_LABELS[s]}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="flex items-center gap-2 text-red-400"><XCircle size={16} />คำสั่งซื้อนี้ถูกยกเลิก หากมีคำถามติดต่อร้านทาง LINE</p>
        )}

        {order.expected_date && status !== 'delivered' && status !== 'cancelled' && (
          <p className="flex items-center gap-2 text-sm text-emerald-500" data-testid="status-expected-date">
            <CalendarDays size={15} />คาดว่าจะได้รับ {thaiDate(order.expected_date)}{order.rush ? ' (งานด่วน)' : ''}
          </p>
        )}
        {order.tracking_number && (
          <p className="text-sm" data-testid="status-tracking">เลขพัสดุ: <b className="font-mono">{order.tracking_number}</b></p>
        )}
        {order.shop_note && (
          <p className="text-sm bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3" data-testid="shop-note">ข้อความจากร้าน: {order.shop_note}</p>
        )}

        {/* Order summary */}
        <section data-testid="order-summary" className="rounded-[2rem] border border-foreground/10 bg-foreground/[0.03] p-6 sm:p-8">
          <h2 className="font-semibold tracking-tight text-2xl mb-5">สรุปคำสั่งซื้อ</h2>
          <dl className="grid md:grid-cols-2 gap-x-10 text-sm">
            {[
              ['ผู้สั่งซื้อ', order.customer_name],
              ['เบอร์โทร', order.customer_phone_masked],
              ['ไฟล์', order.file_name],
              ['วัสดุ / สี', [order.material, order.color].filter(Boolean).join(' · ')],
              ['จำนวน', order.quantity ? `${order.quantity} ชิ้น` : ''],
              ['Infill / Layer', order.infill !== undefined && order.infill !== null ? `${order.infill}% · ${Number(order.layer_height).toFixed(2)} mm` : ''],
              ['บริการเสริม', order.addons],
              ['รับสินค้า', order.shipping_method === 'postal' ? 'จัดส่งพัสดุ' : order.shipping_method === 'pickup' ? 'รับที่ร้าน' : ''],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-foreground/10 py-3">
                <dt className="text-foreground/50 shrink-0">{k}</dt>
                <dd className="font-medium text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>
          {items.length > 0 && (
            <div className="mt-5 space-y-1.5 text-sm" data-testid="status-items">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-foreground/60">{it.label}</span><span>{baht(it.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex justify-between items-baseline">
            <span className="text-foreground/50 text-sm">{status === 'reviewing' ? 'ราคาประมาณการ' : 'ยอดชำระ'}</span>
            <span className="font-semibold text-2xl" data-testid="status-total">{baht(amount)}</span>
          </div>
        </section>

        {/* Waiting for the shop */}
        {status === 'reviewing' && (
          <section className="rounded-[2rem] border border-sky-400/30 bg-sky-400/[0.06] p-6 sm:p-8 space-y-3" data-testid="awaiting-review">
            <p className="flex items-center gap-2 font-semibold text-lg"><Clock size={18} />ร้านกำลังตรวจไฟล์และยืนยันราคา</p>
            <p className="text-sm text-foreground/60">
              ราคาที่เห็นเป็นราคาประมาณการจากไฟล์ ร้านจะตรวจไฟล์แล้วยืนยันราคาจริงก่อน
              {' '}เมื่อยืนยันแล้วจะแจ้งทางอีเมล (ถ้าให้อีเมลไว้) และหน้านี้จะเปิดให้ชำระเงิน
            </p>
            {cfg.contact.lineUrl && (
              <a href={cfg.contact.lineUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-500 border border-emerald-500/40 rounded-xl px-4 py-2">
                <MessageCircle size={14} />ทักร้านทาง LINE
              </a>
            )}
          </section>
        )}

        {/* Payment */}
        {canPay && (
          <section className="space-y-5" data-testid="payment">
            <div className="flex flex-wrap gap-2" role="tablist">
              <button role="tab" aria-selected={method === 'promptpay'} onClick={() => setMethod('promptpay')} data-testid="pay-promptpay"
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-medium ${method === 'promptpay' ? 'bg-foreground text-background border-foreground' : 'border-foreground/15 text-foreground/60'}`}>
                <QrCode size={15} />PromptPay / โอนเงิน
              </button>
              {cfg.payment.shopeeEnabled && (
                <button role="tab" aria-selected={method === 'shopee'} onClick={() => setMethod('shopee')} data-testid="pay-shopee"
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-medium ${method === 'shopee' ? 'bg-orange-500 text-white border-orange-500' : 'border-foreground/15 text-foreground/60'}`}>
                  <ShoppingBag size={15} />สั่งผ่าน Shopee
                </button>
              )}
            </div>

            {method === 'promptpay' ? (
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-foreground/5 border border-foreground/10 rounded-[2rem] p-6 sm:p-10 space-y-6">
                  <p className="font-header text-4xl sm:text-5xl font-bold tracking-tighter break-all">{baht(amount)}</p>
                  {qr && (
                    <div className="flex flex-col items-center gap-2" data-testid="promptpay-qr">
                      <div className="bg-white p-3 rounded-2xl w-60 h-60 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
                      <p className="text-xs text-foreground/50">สแกนด้วยแอปธนาคารได้เลย ยอดเงินใส่ไว้ให้แล้ว</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 font-medium">
                    <div className="flex items-center justify-between py-3 border-b border-foreground/10">
                      <p className="text-sm text-foreground/60">ธนาคาร</p><p className="text-base font-semibold">{cfg.payment.bankName}</p>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-foreground/10">
                      <p className="text-sm text-foreground/60">ชื่อบัญชี</p><p className="text-base font-semibold">{cfg.payment.accountName}</p>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <p className="text-sm text-foreground/60">เลขที่บัญชี</p>
                      <div className="flex items-center gap-3">
                        <p className="text-xl font-bold tracking-widest">{cfg.payment.bankAccount}</p>
                        <button onClick={() => copyToClipboard(cfg.payment.bankAccount, 'account')} aria-label="คัดลอกเลขบัญชี"
                          className="p-2 hover:bg-foreground/10 rounded-lg text-foreground/40 hover:text-foreground">
                          {copiedField === 'account' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slip Upload */}
                <div className="bg-foreground/[0.02] border border-foreground/10 rounded-[2rem] p-6 sm:p-10 flex flex-col">
                  <h2 className="font-semibold tracking-tight text-2xl mb-2">แนบสลิป</h2>
                  <p className="text-xs text-foreground/40 mb-6">JPG, PNG, WEBP, HEIC, PDF • ไม่เกิน 4MB</p>
                  <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-foreground/10 rounded-[2rem] p-8 relative overflow-hidden group hover:border-foreground/30 transition-all">
                    <input ref={fileInputRef} data-testid="slip-input" type="file" accept={SLIP_ACCEPT} onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    {slipPreview ? (
                      <div className="absolute inset-0 bg-neutral-900">
                        {isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-foreground/70">
                            <Upload className="w-10 h-10" /><span className="text-sm break-all px-6 text-center">{slipFile?.name}</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={slipPreview} alt="Slip preview" className="w-full h-full object-contain" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-30">
                          <button onClick={(e) => { e.preventDefault(); fileInputRef.current?.click() }} className="text-sm bg-foreground text-background px-5 py-2.5 rounded-xl">Replace</button>
                          <button onClick={(e) => { e.preventDefault(); setSlipFile(null); setSlipPreview(null) }} className="text-sm bg-red-500 text-white px-5 py-2.5 rounded-xl">Delete</button>
                        </div>
                        <div className="absolute top-4 right-4 bg-green-500 rounded-full p-1"><CheckCircle className="w-4 h-4 text-white" /></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-foreground/30 group-hover:text-foreground/60">
                        <Upload className="w-10 h-10 mb-3" /><span className="text-xs">คลิกหรือลากรูปสลิปมาวาง</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto pt-6">
                    {slipError && <p role="alert" className="text-red-400 text-xs mb-4">{slipError}</p>}
                    {status === 'awaiting_verification' && (
                      <p className="text-emerald-400 text-xs mb-4">ได้รับหลักฐานการชำระแล้ว รอร้านตรวจสอบ อัปโหลดใหม่ได้หากต้องการเปลี่ยน</p>
                    )}
                    <button onClick={handleSubmitSlip} disabled={!slipPreview || submitting}
                      className={`w-full py-5 rounded-xl font-header text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 ${
                        !slipPreview || submitting ? 'bg-foreground/10 text-foreground/40 cursor-not-allowed' : 'bg-foreground text-background hover:bg-foreground/80 font-semibold'}`}>
                      {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : 'Confirm Payment'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-orange-400/30 bg-orange-500/[0.06] p-6 sm:p-10 space-y-4 max-w-2xl" data-testid="shopee-payment">
                <p className="text-lg">กดสั่งสินค้า <b>“บริการพิมพ์ 3D ชิ้นละ ฿{cfg.payment.shopeeUnitPrice}”</b> จำนวน <b className="text-orange-500 text-2xl" data-testid="shopee-pay-units">{shopeeUnits} ชิ้น</b></p>
                <p className="text-sm text-foreground/55">{baht(amount)} ÷ {cfg.payment.shopeeUnitPrice} = {shopeeUnits} ชิ้น (ยอดใน Shopee ฿{(shopeeUnits * cfg.payment.shopeeUnitPrice).toLocaleString()} ค่าส่งตามที่ Shopee คิด)</p>
                {cfg.payment.shopeeUrl && (
                  <a href={cfg.payment.shopeeUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl px-5 py-3">
                    ไปที่ Shopee <ExternalLink size={14} />
                  </a>
                )}
                <div className="pt-2 space-y-2">
                  <label className="text-sm text-foreground/60 block" htmlFor="shopee-ref">สั่งแล้ว ใส่เลขคำสั่งซื้อ Shopee เพื่อให้ร้านจับคู่กับงานนี้</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input id="shopee-ref" value={shopeeRef} onChange={e => setShopeeRef(e.target.value)} placeholder="เช่น 2611280ABCDEF" data-testid="shopee-ref"
                      className="flex-1 bg-foreground/[0.04] border border-foreground/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400/60" />
                    <button onClick={handleShopee} disabled={shopeeRef.trim().length < 4 || submitting} data-testid="shopee-submit"
                      className="px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40">
                      {submitting ? 'กำลังส่ง…' : 'แจ้งร้านว่าสั่งแล้ว'}
                    </button>
                  </div>
                  {shopeeMsg && <p className={`text-xs ${shopeeMsg.ok ? 'text-emerald-400' : 'text-red-400'}`} role="alert">{shopeeMsg.text}</p>}
                  {order.payment_method === 'shopee' && order.shopee_ref && <p className="text-xs text-emerald-400">แจ้งเลข Shopee แล้ว: {order.shopee_ref}</p>}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
