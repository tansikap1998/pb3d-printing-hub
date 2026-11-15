"use client"
import { useEffect, useMemo, useState } from "react"
import { Calculator, Loader2, Save, ExternalLink, AlertCircle, Plus, Trash2, Settings2, TrendingUp } from "lucide-react"
import {
  calculateSellPrices, shopeeSearchUrl, DEFAULT_SELL_PRICING,
  type SellPricingSettings, type MarketPrice, type ChannelPrice,
} from "@/lib/sellPricing"
import AiCopywriter from "./AiCopywriter"

const baht = (x: number | null | undefined, digits = 0) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `฿${x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

const inputCls =
  "w-full bg-foreground/[0.04] border border-foreground/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-blue-400/50 transition-all"

function Num({ label, value, onChange, suffix, step = "any", testId }: {
  label: string; value: number | string; onChange: (v: string) => void; suffix?: string; step?: string; testId?: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-foreground/50 mb-1.5 block">{label}</span>
      <div className="relative">
        <input type="number" inputMode="decimal" step={step} min={0} value={value} data-testid={testId}
          onChange={e => onChange(e.target.value)} className={`${inputCls} ${suffix ? "pr-12" : ""}`} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40">{suffix}</span>}
      </div>
    </label>
  )
}

const POSITION: Record<string, { label: string; cls: string }> = {
  below:  { label: "ถูกกว่าตลาด", cls: "text-blue-400 bg-blue-400/10 border-blue-400/25" },
  within: { label: "อยู่ในช่วงตลาด", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  above:  { label: "แพงกว่าตลาด", cls: "text-amber-400 bg-amber-400/10 border-amber-400/25" },
}

export default function SellPricing() {
  const [settings, setSettings] = useState<SellPricingSettings>(DEFAULT_SELL_PRICING)
  const [market, setMarket] = useState<MarketPrice[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [grams, setGrams] = useState("100")
  const [hours, setHours] = useState("2")

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/sell-pricing", { cache: "no-store" })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
        setSettings(d.settings); setMarket(d.market); setNotes(d.notes || [])
        if (d.market?.length) setCategory(d.market[0].category)
      } catch (e: any) {
        setNotes([`โหลดค่าตั้งค่าไม่สำเร็จ (${e.message}) — ใช้ค่าเริ่มต้นแทน`])
      }
      setLoading(false)
    })()
  }, [])

  const marketRow = market.find(m => m.category === category) ?? null
  const result = useMemo(
    () => calculateSellPrices({ grams: Number(grams) || 0, printHours: Number(hours) || 0 }, settings, marketRow),
    [grams, hours, settings, marketRow]
  )
  const set = <K extends keyof SellPricingSettings>(k: K, v: SellPricingSettings[K]) => { setSettings(s => ({ ...s, [k]: v })); setSaveMsg(null) }
  const num = (v: string) => (v === "" ? 0 : Number(v))

  const save = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const r = await fetch("/api/admin/sell-pricing", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setSettings(d.settings)
      setSaveMsg({ ok: true, text: "บันทึกค่าตั้งค่าลง Google Sheet แล้ว" })
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.message })
    }
    setSaving(false)
  }

  if (loading) return <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-foreground/30" /></div>

  const c = result.cost
  const profitLabel = settings.profitBasis === "cost" ? "ของต้นทุน" : "ของราคาขาย"

  return (
    <div className="space-y-6" data-testid="sell-pricing">
      <div>
        <h2 className="font-semibold tracking-tight text-2xl flex items-center gap-2"><Calculator size={20} />คำนวณราคาขายสินค้า</h2>
        <p className="text-foreground/50 text-sm mt-1">
          กรอกน้ำหนักและเวลาพิมพ์ → คิดต้นทุนแบบขั้นบันได + ค่าดำเนินการ + ค่าคอมแต่ละช่องทาง → ราคาที่ควรขาย
        </p>
        {notes.map(n => (
          <p key={n} className="text-xs text-amber-400 mt-2 flex items-start gap-1.5"><AlertCircle size={13} className="shrink-0 mt-0.5" />{n}</p>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Product ── */}
        <section className="bg-foreground/[0.025] border border-foreground/8 rounded-3xl p-5 space-y-4">
          <p className="text-xs font-medium text-foreground/50">สินค้า</p>
          <label className="block">
            <span className="text-xs text-foreground/50 mb-1.5 block">ชื่อสินค้า (ไม่บังคับ)</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="เช่น ขาตั้งมือถือรุ่นแมว" className={inputCls} data-testid="sp-name" />
          </label>
          <label className="block">
            <span className="text-xs text-foreground/50 mb-1.5 block">หมวดสินค้า (ใช้เทียบราคาตลาด)</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls} data-testid="sp-category">
              {market.map(m => <option key={m.category} value={m.category}>{m.category}</option>)}
              <option value="">— ไม่เทียบราคาตลาด —</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Num label="น้ำหนักชิ้นงาน" suffix="g" value={grams} onChange={setGrams} testId="sp-grams" />
            <Num label="เวลาพิมพ์" suffix="ชม." value={hours} onChange={setHours} testId="sp-hours" />
          </div>

          <div className="rounded-2xl border border-foreground/8 divide-y divide-foreground/8 text-sm" data-testid="sp-cost">
            {[
              [`ค่าวัสดุ (${c.materialRate} ฿/g)`, c.material],
              ["ค่าไฟ", c.electricity],
              ["ค่าเสื่อมเครื่อง", c.depreciation],
              ["ค่าแพ็กเกจ", c.packaging],
              ...(c.other ? [["ค่าอื่น ๆ", c.other]] : []),
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between px-4 py-2.5">
                <span className="text-foreground/60">{k}</span><span>{baht(v as number, 2)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 font-semibold">
              <span>ต้นทุนรวมต่อชิ้น</span><span data-testid="sp-total-cost">{baht(c.total, 2)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-foreground/60">
              <span>ต้นทุนเฉลี่ยต่อกรัม</span><span>{c.perGram} ฿/g</span>
            </div>
          </div>
        </section>

        {/* ── Market ── */}
        <section className="bg-foreground/[0.025] border border-foreground/8 rounded-3xl p-5 space-y-4">
          <p className="text-xs font-medium text-foreground/50 flex items-center gap-1.5"><TrendingUp size={13} />ราคาตลาด</p>
          {marketRow ? (
            <>
              <div>
                <p className="font-semibold">{marketRow.category}</p>
                {marketRow.example && <p className="text-xs text-foreground/50 mt-0.5">เช่น {marketRow.example}{marketRow.typicalWeightG ? ` · ทั่วไปราว ${marketRow.typicalWeightG} g` : ""}</p>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center" data-testid="sp-market">
                {[["ต่ำ", marketRow.low], ["ทั่วไป", marketRow.typical], ["สูง", marketRow.high]].map(([k, v]) => (
                  <div key={k as string} className="rounded-2xl border border-foreground/8 p-3">
                    <p className="text-xs text-foreground/50">{k}</p>
                    <p className="font-semibold text-lg">{baht(v as number | null)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-foreground/45">
                ที่มา: {marketRow.source || "—"}{marketRow.updated ? ` · สำรวจเมื่อ ${marketRow.updated}` : ""} ·
                แก้ไข/เพิ่มราคาที่สำรวจได้ในแท็บ <b>MarketPrices</b> ของ Google Sheet
              </p>
              <a href={shopeeSearchUrl(name || marketRow.category)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EE4D2D] text-white text-sm font-medium hover:opacity-90">
                สำรวจราคาคู่แข่งบน Shopee <ExternalLink size={14} />
              </a>
            </>
          ) : (
            <p className="text-sm text-foreground/50">เลือกหมวดสินค้าเพื่อเทียบกับราคาตลาด</p>
          )}
        </section>
      </div>

      {/* ── Prices per channel ── */}
      <section className="bg-foreground/[0.025] border border-foreground/8 rounded-3xl p-5">
        <p className="text-xs font-medium text-foreground/50 mb-3">
          ราคาที่ควรขายแต่ละช่องทาง (กำไรขั้นต่ำ {settings.minProfitPct}% {profitLabel} · ค่าการตลาด {settings.marketingPct}%)
        </p>
        {Array.from(new Set(result.channels.flatMap(r => r.warnings))).map(w => (
          <p key={w} className="text-xs text-amber-400 mb-3 flex items-start gap-1.5"><AlertCircle size={13} className="shrink-0 mt-0.5" />{w}</p>
        ))}

        {/* phones: one card per channel */}
        <div className="md:hidden space-y-3" data-testid="sp-channel-cards">
          {result.channels.map((r: ChannelPrice) => (
            <div key={r.channel.id} className="rounded-2xl border border-foreground/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{r.channel.name}</p>
                {r.marketPosition && (
                  <span className={`text-2xs px-2 py-0.5 rounded-full border ${POSITION[r.marketPosition].cls}`}>{POSITION[r.marketPosition].label}</span>
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xs text-foreground/50">ราคาแนะนำ</span>
                <span className="font-semibold text-2xl">{baht(r.recommended)}</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {[
                  ["ช่วงเปิดตัว", baht(r.launch)], ["ต่ำสุดที่ควรขาย", baht(r.minPrice)],
                  ["คุ้มทุน", baht(r.breakEven)], ["ค่าคอม+การตลาด", `${r.pctCosts}%`],
                  ["กำไร/ชิ้น", baht(r.profitAtRecommended)],
                  ["กำไร %", r.markupAtRecommended !== null ? `${r.markupAtRecommended}% ต้นทุน` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2"><dt className="text-foreground/50">{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto -mx-1">
          <table className="w-full min-w-[720px] text-sm" data-testid="sp-channels">
            <thead>
              <tr className="text-left text-xs text-foreground/50">
                <th className="py-2 px-2 font-medium">ช่องทาง</th>
                <th className="py-2 px-2 font-medium text-right">ค่าคอม+การตลาด</th>
                <th className="py-2 px-2 font-medium text-right">คุ้มทุน</th>
                <th className="py-2 px-2 font-medium text-right">ต่ำสุดที่ควรขาย</th>
                <th className="py-2 px-2 font-medium text-right">ราคาแนะนำ</th>
                <th className="py-2 px-2 font-medium text-right">ช่วงเปิดตัว</th>
                <th className="py-2 px-2 font-medium text-right">กำไร/ชิ้น (แนะนำ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/8">
              {result.channels.map((r: ChannelPrice) => (
                <tr key={r.channel.id} data-testid={`sp-row-${r.channel.id}`}>
                  <td className="py-3 px-2">
                    <p className="font-medium">{r.channel.name}</p>
                    {r.marketPosition && (
                      <span className={`inline-block mt-1 text-2xs px-2 py-0.5 rounded-full border ${POSITION[r.marketPosition].cls}`}>
                        {POSITION[r.marketPosition].label}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right text-foreground/60">{r.pctCosts}%</td>
                  <td className="py-3 px-2 text-right text-foreground/60">{baht(r.breakEven)}</td>
                  <td className="py-3 px-2 text-right">{baht(r.minPrice)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-base" data-testid="sp-recommended">{baht(r.recommended)}</td>
                  <td className="py-3 px-2 text-right">{baht(r.launch)}</td>
                  <td className="py-3 px-2 text-right">
                    {baht(r.profitAtRecommended)}
                    {r.markupAtRecommended !== null && (
                      <span className="block text-2xs text-foreground/50">
                        {r.markupAtRecommended}% ของต้นทุน · {r.marginAtRecommended}% ของราคา
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 text-xs text-foreground/50 space-y-1 list-disc pl-5">
          <li><b>คุ้มทุน</b>: ต่ำกว่านี้ขาดทุน (หลังหักค่าคอมและค่าการตลาด)</li>
          <li><b>ต่ำสุดที่ควรขาย</b>: ราคาต่ำสุดที่ยังได้กำไรตามเป้า</li>
          <li><b>ราคาแนะนำ</b>: ไม่ต่ำกว่าราคาต่ำสุด และขยับขึ้นตามราคาทั่วไปในตลาดถ้าตลาดขายแพงกว่า ปัดเป็นเลขลงท้าย 9</li>
          <li><b>ช่วงเปิดตัว</b>: ลด {settings.launchDiscountPct}% จากราคาแนะนำ แต่ไม่ต่ำกว่าราคาต่ำสุด</li>
        </ul>
      </section>

      <AiCopywriter
        name={name}
        category={category}
        grams={Number(grams) || 0}
        price={result.channels.find(r => r.recommended)?.recommended ?? null}
        channels={settings.channels.map(ch => ch.name)}
      />

      {/* ── Settings ── */}
      <details className="bg-foreground/[0.025] border border-foreground/8 rounded-3xl p-5 group" data-testid="sp-settings">
        <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 select-none">
          <Settings2 size={15} />ตั้งค่าต้นทุนและช่องทางขาย
        </summary>
        <div className="mt-5 space-y-6">
          {/* tiers */}
          <div>
            <p className="text-xs font-medium text-foreground/50 mb-2">ต้นทุนวัสดุแบบขั้นบันได</p>
            <div className="space-y-2">
              {settings.materialTiers.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1"><Num label={i === 0 ? "ถึง (g) — เว้นว่าง = ขึ้นไป" : "ถึง (g)"} value={t.upToG ?? ""}
                    onChange={v => set("materialTiers", settings.materialTiers.map((x, j) => j === i ? { ...x, upToG: v === "" ? null : num(v) } : x))} /></div>
                  <div className="flex-1"><Num label="ราคา" suffix="฿/g" value={t.perG}
                    onChange={v => set("materialTiers", settings.materialTiers.map((x, j) => j === i ? { ...x, perG: num(v) } : x))} /></div>
                  <button type="button" aria-label="ลบขั้น" disabled={settings.materialTiers.length <= 1}
                    onClick={() => set("materialTiers", settings.materialTiers.filter((_, j) => j !== i))}
                    className="p-2.5 rounded-xl border border-foreground/10 text-foreground/50 hover:text-red-400 disabled:opacity-30"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set("materialTiers", [...settings.materialTiers, { upToG: null, perG: 1 }])}
                className="text-xs text-blue-400 flex items-center gap-1"><Plus size={12} />เพิ่มขั้น</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {([
                ["bracket", "ทั้งชิ้นคิดเรทเดียวตามช่วงน้ำหนัก (401 g = 401 × 1 ฿)"],
                ["progressive", "คิดแยกตามช่วง (401 g = 400 × 2 + 1 × 1 ฿)"],
              ] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => set("tierMode", k)}
                  className={`px-3 py-2 rounded-xl border ${settings.tierMode === k ? "bg-foreground text-background border-foreground" : "border-foreground/15 text-foreground/60"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Num label="กำลังไฟเครื่อง" suffix="W" value={settings.printerWatts} onChange={v => set("printerWatts", num(v))} />
            <Num label="ค่าไฟ" suffix="฿/หน่วย" value={settings.electricityPerKwh} onChange={v => set("electricityPerKwh", num(v))} />
            <Num label="ราคาเครื่อง (ค่าเสื่อม)" suffix="฿" value={settings.printerPrice} onChange={v => set("printerPrice", num(v))} />
            <Num label="อายุใช้งานเครื่อง" suffix="ชม." value={settings.printerLifetimeHours} onChange={v => set("printerLifetimeHours", num(v))} />
            <Num label="ค่าแพ็กเกจ/ชิ้น" suffix="฿" value={settings.packagingPerItem} onChange={v => set("packagingPerItem", num(v))} />
            <Num label="ค่าอื่น ๆ/ชิ้น" suffix="฿" value={settings.otherPerItem} onChange={v => set("otherPerItem", num(v))} />
            <Num label="ค่าการตลาด" suffix="% ราคา" value={settings.marketingPct} onChange={v => set("marketingPct", num(v))} />
            <Num label="ส่วนลดช่วงเปิดตัว" suffix="%" value={settings.launchDiscountPct} onChange={v => set("launchDiscountPct", num(v))} />
          </div>

          <div className="grid md:grid-cols-2 gap-3 items-end">
            <Num label="กำไรขั้นต่ำ" suffix="%" value={settings.minProfitPct} onChange={v => set("minProfitPct", num(v))} testId="sp-min-profit" />
            <div className="flex flex-wrap gap-2 text-xs">
              {([["cost", "% ของต้นทุน (มาร์กอัป)"], ["price", "% ของราคาขาย (มาร์จิ้น)"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => set("profitBasis", k)}
                  className={`px-3 py-2 rounded-xl border ${settings.profitBasis === k ? "bg-foreground text-background border-foreground" : "border-foreground/15 text-foreground/60"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground/50 mb-2">ช่องทางขายและค่าคอมมิชชั่น (รวมค่าธรรมเนียมชำระเงิน)</p>
            <div className="space-y-2">
              {settings.channels.map((ch, i) => (
                <div key={ch.id} className="flex items-end gap-2">
                  <label className="flex-[2]">
                    <span className="text-xs text-foreground/50 mb-1.5 block">ชื่อช่องทาง</span>
                    <input value={ch.name} className={inputCls}
                      onChange={e => set("channels", settings.channels.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  </label>
                  <div className="flex-1"><Num label="ค่าคอม" suffix="%" value={ch.commissionPct}
                    onChange={v => set("channels", settings.channels.map((x, j) => j === i ? { ...x, commissionPct: num(v) } : x))} /></div>
                  <button type="button" aria-label="ลบช่องทาง" disabled={settings.channels.length <= 1}
                    onClick={() => set("channels", settings.channels.filter((_, j) => j !== i))}
                    className="p-2.5 rounded-xl border border-foreground/10 text-foreground/50 hover:text-red-400 disabled:opacity-30"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set("channels", [...settings.channels, { id: `ch${Date.now()}`, name: "ช่องทางใหม่", commissionPct: 30 }])}
                className="text-xs text-blue-400 flex items-center gap-1"><Plus size={12} />เพิ่มช่องทาง</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={saving} data-testid="sp-save"
              className="px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium flex items-center gap-2 disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}บันทึกค่าตั้งค่า
            </button>
            <button type="button" onClick={() => { setSettings(DEFAULT_SELL_PRICING); setSaveMsg(null) }}
              className="px-4 py-2.5 rounded-xl border border-foreground/15 text-sm text-foreground/60">คืนค่าเริ่มต้น</button>
            {saveMsg && <p role="status" className={`text-sm ${saveMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{saveMsg.text}</p>}
          </div>
        </div>
      </details>
    </div>
  )
}
