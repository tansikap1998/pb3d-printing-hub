"use client"
import { useEffect, useState } from "react"
import { Loader2, Save, Plus, Trash2, SlidersHorizontal, AlertCircle } from "lucide-react"
import { DEFAULT_QUOTE_CONFIG, type QuoteConfig } from "@/lib/quoteConfig"

const inputCls =
  "w-full bg-foreground/[0.04] border border-foreground/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-blue-400/50"
const card = "bg-foreground/[0.025] border border-foreground/8 rounded-3xl p-5 space-y-4"

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-foreground/50 mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-foreground/35 mt-1 block">{hint}</span>}
    </label>
  )
}
function Num({ value, onChange, testId, step = "any" }: { value: number; onChange: (v: number) => void; testId?: string; step?: string }) {
  return <input type="number" min={0} step={step} value={value} data-testid={testId} className={inputCls}
    onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
}
function Toggle({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-blue-500" data-testid={testId} />
      {label}
    </label>
  )
}

/** Admin tab "ตั้งค่าราคาลูกค้า": everything the customer quote uses, saved to the Settings tab. */
export default function QuoteSettings() {
  const [cfg, setCfg] = useState<QuoteConfig>(DEFAULT_QUOTE_CONFIG)
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [infillText, setInfillText] = useState("")

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/quote-config", { cache: "no-store" })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
        setCfg(d.config); setSource(d.source); setInfillText(d.config.infillOptions.join(", "))
      } catch (e: any) { setMsg({ ok: false, text: `โหลดไม่สำเร็จ (${e.message}) — แสดงค่าเริ่มต้น` }); setInfillText(DEFAULT_QUOTE_CONFIG.infillOptions.join(", ")) }
      setLoading(false)
    })()
  }, [])

  const up = (f: (c: QuoteConfig) => QuoteConfig) => { setCfg(c => f(structuredClone(c))); setMsg(null) }

  const save = async () => {
    setSaving(true); setMsg(null)
    const infillOptions = infillText.split(/[,\s]+/).map(Number).filter(x => Number.isFinite(x) && x > 0)
    try {
      const r = await fetch("/api/admin/quote-config", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: { ...cfg, infillOptions } }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setCfg(d.config); setInfillText(d.config.infillOptions.join(", ")); setSource("sheet")
      setMsg({ ok: true, text: "บันทึกแล้ว ลูกค้าจะเห็นราคาใหม่ภายใน 1 นาที" })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    setSaving(false)
  }

  if (loading) return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-foreground/30" /></div>

  return (
    <div className="space-y-6" data-testid="quote-settings">
      <div>
        <h2 className="font-semibold tracking-tight text-2xl flex items-center gap-2"><SlidersHorizontal size={20} />ตั้งค่าราคาลูกค้า</h2>
        <p className="text-foreground/50 text-sm mt-1">
          เรทราคา วัสดุ สี บริการเสริม งานด่วน และช่องทางชำระเงินที่ลูกค้าเห็นในหน้าอัปโหลดและใบเสนอราคา บันทึกลงแท็บ Settings ของ Google Sheet
        </p>
        {source === "default" && <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5"><AlertCircle size={13} />ยังไม่เคยบันทึก: ตอนนี้ใช้ค่าเริ่มต้น</p>}
      </div>

      {/* Materials */}
      <section className={card}>
        <p className="text-sm font-medium">วัสดุและเรทราคา</p>
        <p className="text-xs text-foreground/45">ค่าพิมพ์ = กรัมแรกตาม &quot;เรท/กรัม&quot; จนถึง &quot;ลดราคาเมื่อเกิน&quot; แล้วส่วนที่เกินคิด &quot;เรทส่วนเกิน&quot; + ชั่วโมงพิมพ์ × ค่าเครื่อง</p>
        <div className="space-y-4">
          {cfg.materials.map((m, i) => (
            <div key={m.id} className="rounded-2xl border border-foreground/8 p-4 space-y-3" data-testid={`qs-material-${m.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Toggle on={m.enabled} onChange={v => up(c => { c.materials[i].enabled = v; return c })} label={`เปิดขาย ${m.id}`} testId={`qs-material-enabled-${m.id}`} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="ชื่อที่ลูกค้าเห็น"><input className={inputCls} value={m.name} onChange={e => up(c => { c.materials[i].name = e.target.value; return c })} /></Field>
                <div className="sm:col-span-2"><Field label="เหมาะกับงานแบบไหน"><input className={inputCls} value={m.desc} onChange={e => up(c => { c.materials[i].desc = e.target.value; return c })} /></Field></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="เรท/กรัม (฿)"><Num value={m.perG} testId={`qs-perg-${m.id}`} onChange={v => up(c => { c.materials[i].perG = v; return c })} /></Field>
                <Field label="ลดราคาเมื่อเกิน (g)" hint="0 = ไม่มี"><Num value={m.bulkFromG} onChange={v => up(c => { c.materials[i].bulkFromG = v; return c })} /></Field>
                <Field label="เรทส่วนเกิน (฿/g)"><Num value={m.bulkPerG} onChange={v => up(c => { c.materials[i].bulkPerG = v; return c })} /></Field>
                <Field label="ค่าเครื่อง (฿/ชม.)" hint="0 = คิดตามน้ำหนักอย่างเดียว"><Num value={m.machinePerHour} onChange={v => up(c => { c.materials[i].machinePerHour = v; return c })} /></Field>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="ขั้นต่ำต่อออเดอร์ (฿)"><Num value={cfg.minOrder} testId="qs-min-order" onChange={v => up(c => { c.minOrder = v; return c })} /></Field>
          <Field label="ค่าส่งพัสดุ (฿)"><Num value={cfg.shipping.postal} onChange={v => up(c => { c.shipping.postal = v; return c })} /></Field>
          <Field label="ตัวเลือก infill (%)" hint="คั่นด้วยจุลภาค"><input className={inputCls} value={infillText} data-testid="qs-infill" onChange={e => { setInfillText(e.target.value); setMsg(null) }} /></Field>
          <Field label="infill ตั้งต้น (%)"><Num value={cfg.defaultInfill} onChange={v => up(c => { c.defaultInfill = v; return c })} /></Field>
        </div>
      </section>

      {/* Colours */}
      <section className={card}>
        <p className="text-sm font-medium">สี (ปิดสีที่ของหมดได้)</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {cfg.colors.map((col, i) => (
            <div key={i} className="flex items-center gap-2" data-testid={`qs-color-${col.id}`}>
              <input type="checkbox" checked={col.enabled} className="w-4 h-4 accent-blue-500" aria-label={`เปิดสี ${col.name}`} data-testid={`qs-color-enabled-${col.id}`}
                onChange={e => up(c => { c.colors[i].enabled = e.target.checked; return c })} />
              <input type="color" value={col.hex} className="w-9 h-9 rounded-lg bg-transparent" aria-label="สี"
                onChange={e => up(c => { c.colors[i].hex = e.target.value; return c })} />
              <input className={inputCls} value={col.name} onChange={e => up(c => { c.colors[i].name = e.target.value; return c })} />
              <button type="button" aria-label="ลบสี" onClick={() => up(c => { c.colors.splice(i, 1); return c })} disabled={cfg.colors.length <= 1}
                className="p-2 rounded-xl border border-foreground/10 text-foreground/50 hover:text-red-400 disabled:opacity-30"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="text-xs text-blue-400 flex items-center gap-1"
          onClick={() => up(c => { c.colors.push({ id: `c${Date.now().toString(36)}`, name: "สีใหม่", hex: "#cccccc", enabled: true }); return c })}>
          <Plus size={12} />เพิ่มสี
        </button>
      </section>

      {/* Add-ons & rush */}
      <section className={card}>
        <p className="text-sm font-medium">บริการเสริมและงานด่วน</p>
        {(["sanding", "painting"] as const).map(k => {
          const a = cfg.addons[k]
          return (
            <div key={k} className="rounded-2xl border border-foreground/8 p-4 space-y-3" data-testid={`qs-addon-${k}`}>
              <Toggle on={a.enabled} onChange={v => up(c => { c.addons[k].enabled = v; return c })} label={`เปิดให้เลือก ${a.label}`} />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Field label="ชื่อ"><input className={inputCls} value={a.label} onChange={e => up(c => { c.addons[k].label = e.target.value; return c })} /></Field>
                <div className="col-span-2 sm:col-span-1"><Field label="คำอธิบาย"><input className={inputCls} value={a.desc} onChange={e => up(c => { c.addons[k].desc = e.target.value; return c })} /></Field></div>
                <Field label="% ของค่าพิมพ์"><Num value={a.pct} testId={`qs-${k}-pct`} onChange={v => up(c => { c.addons[k].pct = v; return c })} /></Field>
                <Field label="ขั้นต่ำต่อชิ้น (฿)"><Num value={a.minPerPiece} onChange={v => up(c => { c.addons[k].minPerPiece = v; return c })} /></Field>
                <Field label="เพิ่มวัน"><Num value={a.extraDays} step="1" onChange={v => up(c => { c.addons[k].extraDays = v; return c })} /></Field>
              </div>
            </div>
          )
        })}
        <div className="rounded-2xl border border-foreground/8 p-4 space-y-3">
          <Toggle on={cfg.addons.multiColor.enabled} onChange={v => up(c => { c.addons.multiColor.enabled = v; return c })} label="เปิดให้เลือกหลายสีต่อชิ้น" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="ค่าสีเพิ่ม ต่อสี ต่อชิ้น (฿)"><Num value={cfg.addons.multiColor.perExtraColor} onChange={v => up(c => { c.addons.multiColor.perExtraColor = v; return c })} /></Field>
          </div>
        </div>
        <div className="rounded-2xl border border-foreground/8 p-4 space-y-3">
          <Toggle on={cfg.rush.enabled} onChange={v => up(c => { c.rush.enabled = v; return c })} label="เปิดงานด่วน" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="ชื่อ"><input className={inputCls} value={cfg.rush.label} onChange={e => up(c => { c.rush.label = e.target.value; return c })} /></Field>
            <Field label="บวกเพิ่ม (%)"><Num value={cfg.rush.pct} testId="qs-rush-pct" onChange={v => up(c => { c.rush.pct = v; return c })} /></Field>
            <Field label="รับเฉพาะงานพิมพ์ไม่เกิน (ชม.)" hint="งานที่นานกว่านี้เลือกด่วนไม่ได้"><Num value={cfg.rush.maxPrintHours} onChange={v => up(c => { c.rush.maxPrintHours = v; return c })} /></Field>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="ตรวจไฟล์ + คิว (วัน)"><Num value={cfg.leadTime.reviewDays} step="1" onChange={v => up(c => { c.leadTime.reviewDays = v; return c })} /></Field>
          <Field label="พิมพ์ได้ต่อวัน (ชม.)"><Num value={cfg.leadTime.printHoursPerDay} onChange={v => up(c => { c.leadTime.printHoursPerDay = v; return c })} /></Field>
          <Field label="ขนส่ง (วัน)"><Num value={cfg.leadTime.postalDays} step="1" onChange={v => up(c => { c.leadTime.postalDays = v; return c })} /></Field>
        </div>
      </section>

      {/* Payment & contact */}
      <section className={card}>
        <p className="text-sm font-medium">ชำระเงินและการติดต่อ</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="PromptPay (เบอร์โทรหรือเลขบัตรประชาชน)" hint="เว้นว่าง = ไม่แสดง QR"><input className={inputCls} value={cfg.payment.promptpayId} data-testid="qs-promptpay" onChange={e => up(c => { c.payment.promptpayId = e.target.value; return c })} /></Field>
          <Field label="ธนาคาร"><input className={inputCls} value={cfg.payment.bankName} onChange={e => up(c => { c.payment.bankName = e.target.value; return c })} /></Field>
          <Field label="เลขบัญชี"><input className={inputCls} value={cfg.payment.bankAccount} onChange={e => up(c => { c.payment.bankAccount = e.target.value; return c })} /></Field>
          <Field label="ชื่อบัญชี"><input className={inputCls} value={cfg.payment.accountName} onChange={e => up(c => { c.payment.accountName = e.target.value; return c })} /></Field>
        </div>
        <Toggle on={cfg.payment.shopeeEnabled} onChange={v => up(c => { c.payment.shopeeEnabled = v; return c })} label="ให้ลูกค้าเลือกจ่ายผ่าน Shopee ได้" />
        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <Field label="ลิงก์สินค้าบริการพิมพ์ใน Shopee"><input className={inputCls} value={cfg.payment.shopeeUrl} onChange={e => up(c => { c.payment.shopeeUrl = e.target.value; return c })} /></Field>
          <Field label="ราคาต่อชิ้นใน Shopee (฿)"><Num value={cfg.payment.shopeeUnitPrice} onChange={v => up(c => { c.payment.shopeeUnitPrice = v; return c })} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="อีเมลร้าน (รับแจ้งเตือนออเดอร์ใหม่)"><input className={inputCls} type="email" value={cfg.contact.shopEmail} data-testid="qs-shop-email" onChange={e => up(c => { c.contact.shopEmail = e.target.value; return c })} /></Field>
          <Field label="ลิงก์ LINE OA"><input className={inputCls} value={cfg.contact.lineUrl} onChange={e => up(c => { c.contact.lineUrl = e.target.value; return c })} /></Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} data-testid="qs-save"
          className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium rounded-xl px-5 py-2.5 disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}บันทึกการตั้งค่า
        </button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
