"use client"
import { useState } from "react"
import { Sparkles, Loader2, Copy, Check, AlertCircle, ShoppingBag } from "lucide-react"
import type { ShopeeDraft } from "./ShopeeAdmin"
import { listingText, packageWeight, type CopyOutput } from "@/lib/aiCopy"

const inputCls =
  "w-full bg-foreground/[0.04] border border-foreground/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-blue-400/50 transition-all"

const TONES = [
  ["friendly", "เป็นกันเอง"],
  ["premium", "พรีเมียม"],
  ["cute", "น่ารัก"],
  ["technical", "เน้นสเปก"],
] as const

function CopyBtn({ text, testId, label = "คัดลอก" }: { text: string; testId?: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch {}
      }}
      className="shrink-0 inline-flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground border border-foreground/10 rounded-lg px-2 py-1 transition-colors"
    >
      {done ? <Check size={12} /> : <Copy size={12} />}{done ? "คัดลอกแล้ว" : label}
    </button>
  )
}

/** "AI เขียนชื่อและรายละเอียดสินค้า" — uses the product facts from the calculator above. */
export default function AiCopywriter({ name, category, grams, prices, onSendToShopee }: {
  name: string; category: string; grams: number
  /** recommended price per sales channel name, from the calculator */
  prices: Record<string, number | null>
  onSendToShopee?: (d: ShopeeDraft) => void
}) {
  const channels = Object.keys(prices)
  const [material, setMaterial] = useState("PLA")
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")
  const [features, setFeatures] = useState("")
  const [channel, setChannel] = useState(channels[0] ?? "")
  const [tone, setTone] = useState<(typeof TONES)[number][0]>("friendly")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [copy, setCopy] = useState<CopyOutput | null>(null)
  const [pick, setPick] = useState(0) // chosen title for the Shopee box
  const [packagingG, setPackagingG] = useState("50")

  const generate = async () => {
    setBusy(true); setError("")
    try {
      const r = await fetch("/api/admin/ai-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, grams: grams || null, price: prices[channel] ?? null, material, color, size, features, channel, tone }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setCopy(d.copy); setPick(0)
    } catch (e: any) {
      setError(e.message)
    }
    setBusy(false)
  }

  // price shown on the home-page card: the Shopee channel's recommended price
  const shopeeKey = channels.find(c => /shopee/i.test(c))
  const shopeePrice = (shopeeKey ? prices[shopeeKey] : prices[channel]) ?? null

  return (
    <section className="bg-foreground/[0.025] border border-foreground/8 rounded-3xl p-5 space-y-4" data-testid="ai-copy">
      <div>
        <p className="text-sm font-medium flex items-center gap-2"><Sparkles size={15} />AI เขียนชื่อและรายละเอียดสินค้า</p>
        <p className="text-xs text-foreground/50 mt-1">
          ใช้ชื่อ หมวด น้ำหนัก และราคาแนะนำจากด้านบน เพิ่มจุดเด่นของสินค้าให้ AI เขียนได้ตรงขึ้น (AI ใช้เฉพาะข้อมูลที่กรอก ควรตรวจก่อนลงขาย)
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">วัสดุ</span>
          <input value={material} onChange={e => setMaterial(e.target.value)} className={inputCls} data-testid="ai-material" /></label>
        <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">สี</span>
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="เช่น ขาว / ดำ / สั่งสีได้" className={inputCls} /></label>
        <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">ขนาด</span>
          <input value={size} onChange={e => setSize(e.target.value)} placeholder="เช่น 8 × 6 × 10 cm" className={inputCls} /></label>
      </div>
      <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">จุดเด่น / รายละเอียดที่อยากให้ใส่</span>
        <textarea value={features} onChange={e => setFeatures(e.target.value)} rows={3} data-testid="ai-features"
          placeholder="เช่น ปรับองศาได้ 3 ระดับ, รองรับมือถือ 4-7 นิ้ว, สลักชื่อได้" className={inputCls} /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">ช่องทางขาย</span>
          <select value={channel} onChange={e => setChannel(e.target.value)} className={inputCls}>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <div><span className="text-xs text-foreground/50 mb-1.5 block">โทน</span>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTone(id)}
                className={`text-xs rounded-lg px-3 py-2 border transition-colors ${tone === id ? "border-blue-400/60 bg-blue-500/10 text-foreground" : "border-foreground/10 text-foreground/50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" onClick={generate} disabled={busy || (!name.trim() && !features.trim())} data-testid="ai-generate"
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {busy ? "กำลังเขียน… (ราว 10–30 วินาที)" : copy ? "เขียนใหม่" : "ให้ AI เขียน"}
      </button>
      {!name.trim() && !features.trim() && <p className="text-xs text-foreground/40">กรอกชื่อสินค้าด้านบน หรือจุดเด่น ก่อนกดให้ AI เขียน</p>}
      {error && <p className="text-xs text-red-400 flex items-start gap-1.5" data-testid="ai-error"><AlertCircle size={13} className="shrink-0 mt-0.5" />{error}</p>}

      {copy && (
        <div className="space-y-4 pt-2" data-testid="ai-result">
          <div>
            <p className="text-xs font-medium text-foreground/50 mb-2">ชื่อสินค้า (เลือกหนึ่ง)</p>
            <ul className="space-y-2">
              {copy.titles.map((t, i) => (
                <li key={i} className="flex flex-wrap items-start gap-2 rounded-xl border border-foreground/8 px-3 py-2 text-sm" data-testid="ai-title">
                  <span className="flex-1 min-w-[12rem] break-words">{t}</span>
                  <span className="text-[11px] text-foreground/30 shrink-0 mt-0.5">{Array.from(t).length}</span>
                  <CopyBtn text={t} />
                  {onSendToShopee && (
                    <button type="button" data-testid="ai-to-shopee" title="ใช้ชื่อนี้เพิ่มเป็นสินค้า Shopee บนหน้าแรก"
                      onClick={() => onSendToShopee({ name: t, price: shopeePrice, description: copy.short_description })}
                      className="shrink-0 inline-flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground border border-foreground/10 rounded-lg px-2 py-1 transition-colors">
                      <ShoppingBag size={12} />ส่งไปหน้าสินค้า Shopee
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-foreground/50">รายละเอียดสินค้า</p>
              <CopyBtn text={listingText(copy)} label="คัดลอกทั้งหมด" testId="ai-copy-all" />
            </div>
            <div className="rounded-xl border border-foreground/8 px-4 py-3 text-sm whitespace-pre-wrap break-words leading-relaxed" data-testid="ai-description">
              {listingText(copy)}
            </div>
          </div>
          <ShopeeListingBox
            titles={copy.titles} pick={pick} setPick={setPick}
            description={listingText(copy)} price={shopeePrice}
            grams={grams} packagingG={packagingG} setPackagingG={setPackagingG}
          />
        </div>
      )}
    </section>
  )
}

/** Everything the Shopee "add product" form asks for that we know, one copy button per field. */
function ShopeeListingBox({ titles, pick, setPick, description, price, grams, packagingG, setPackagingG }: {
  titles: string[]; pick: number; setPick: (i: number) => void
  description: string; price: number | null
  grams: number; packagingG: string; setPackagingG: (v: string) => void
}) {
  const title = titles[pick] ?? titles[0] ?? ""
  const w = packageWeight(grams, Number(packagingG))
  const rows: { label: string; value: string; note?: string; testId: string }[] = [
    { label: "ชื่อสินค้า", value: title, note: `${Array.from(title).length}/120 ตัวอักษร`, testId: "shopee-box-title" },
    { label: "รายละเอียดสินค้า", value: description, note: `${Array.from(description).length} ตัวอักษร`, testId: "shopee-box-description" },
    { label: "ราคา (บาท)", value: price === null ? "" : String(price), note: "ราคาแนะนำช่อง Shopee", testId: "shopee-box-price" },
    { label: "น้ำหนักพัสดุ (kg)", value: w.kg, note: `ชิ้นงาน ${grams || 0} g + กล่อง/แพ็ก ≈ ${w.g} g`, testId: "shopee-box-weight" },
  ]
  return (
    <div className="rounded-2xl border border-orange-400/30 bg-orange-500/[0.04] p-4 space-y-3" data-testid="shopee-box">
      <div>
        <p className="text-sm font-medium flex items-center gap-2"><ShoppingBag size={14} />ข้อมูลสำหรับลง Shopee</p>
        <p className="text-xs text-foreground/50 mt-1">Seller Centre → เพิ่มสินค้า แล้วคัดลอกไปวางทีละช่อง รูป หมวดหมู่ ขนาดพัสดุ สต็อก และตัวเลือกสี กรอกใน Shopee</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">ใช้ชื่อแบบที่</span>
          <select value={pick} onChange={e => setPick(Number(e.target.value))} className={inputCls} data-testid="shopee-box-pick">
            {titles.map((t, i) => <option key={i} value={i}>{i + 1}. {t.length > 40 ? t.slice(0, 40) + "…" : t}</option>)}
          </select></label>
        <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">น้ำหนักกล่อง/แพ็ก (g)</span>
          <input type="number" min="0" value={packagingG} onChange={e => setPackagingG(e.target.value)} className={inputCls} data-testid="shopee-box-packaging" /></label>
      </div>
      <ul className="divide-y divide-foreground/8 rounded-xl border border-foreground/8">
        {rows.map(r => (
          <li key={r.label} className="flex items-start gap-3 px-3 py-2.5" data-testid={r.testId}>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/50">{r.label}{r.note && <span className="text-foreground/30"> · {r.note}</span>}</p>
              <p className="text-sm break-words line-clamp-2" data-testid={`${r.testId}-value`}>{r.value || "—"}</p>
            </div>
            {r.value && <CopyBtn text={r.value} />}
          </li>
        ))}
      </ul>
    </div>
  )
}
