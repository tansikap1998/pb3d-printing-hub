// Itemised customer quote: print price + add-ons + multi-colour + rush + shipping,
// and the expected date. Pure functions, used by the upload/quote pages and tested.

import type { Material } from "./priceCalculator"
import type { QuoteConfig, MaterialCfg } from "./quoteConfig"

export interface QuotePart {
  name: string
  /** grams and print minutes for ONE piece */
  weightG: number
  printMin: number
  quantity: number
  /** how many colours the customer picked for this piece (1 = single colour) */
  colors: number
}

export interface QuoteRequest {
  material: Material
  parts: QuotePart[]
  sanding: boolean
  painting: boolean
  rush: boolean
  shipping: "pickup" | "postal"
  /** for the expected date; defaults to now */
  now?: Date
}

export interface QuoteItem { key: string; label: string; detail: string; amount: number }

export interface Quote {
  items: QuoteItem[]
  printPrice: number
  subtotal: number          // everything except shipping
  shipping: number
  total: number
  totalWeightG: number
  totalPrintMin: number
  pieces: number
  rushAvailable: boolean
  rushApplied: boolean
  expectedDays: number
  expectedDate: string      // YYYY-MM-DD (Bangkok)
  shopeeUnits: number
}

const r1 = (x: number) => Math.round(x * 10) / 10
const fmt = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 1 })

export function materialCfg(cfg: QuoteConfig, id: Material): MaterialCfg {
  return cfg.materials.find(m => m.id === id) ?? cfg.materials[0]
}

/** Grams at each rate for an order of totalGrams. */
export function gramTiers(m: MaterialCfg, totalGrams: number): { grams: number; perG: number }[] {
  const g = r1(Math.max(0, totalGrams))
  if (!(m.bulkFromG > 0) || m.bulkPerG === m.perG || g <= m.bulkFromG) return [{ grams: g, perG: m.perG }]
  return [{ grams: m.bulkFromG, perG: m.perG }, { grams: r1(g - m.bulkFromG), perG: m.bulkPerG }]
}

/** Print price for the whole order of one material. */
export function printPrice(cfg: QuoteConfig, m: MaterialCfg, totalGrams: number, totalMin: number) {
  const tiers = gramTiers(m, totalGrams)
  const hours = totalMin / 60
  const raw = tiers.reduce((s, t) => s + t.grams * t.perG, 0) + hours * m.machinePerHour
  const price = Math.max(cfg.minOrder, Math.ceil(Math.round(raw * 100) / 100))
  const parts = tiers.map(t => `${fmt(t.grams)} g × ${t.perG} ฿`)
  if (m.machinePerHour > 0) parts.push(`${fmt(r1(hours))} ชม. × ${m.machinePerHour} ฿`)
  const detail = parts.join(" + ") + (raw < cfg.minOrder ? ` (ขั้นต่ำ ฿${cfg.minOrder})` : "")
  return { price, detail }
}

/** Calendar date `days` after `now`, in Bangkok time, as YYYY-MM-DD. */
export function addDaysBangkok(now: Date, days: number): string {
  const d = new Date(now.getTime() + 7 * 3600_000 + days * 86400_000) // shift to UTC+7, then read UTC parts
  return d.toISOString().slice(0, 10)
}

/** "28 พ.ย. 2569" */
export function thaiDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  if (!y || !m || !d) return ymd
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

export function computeQuote(req: QuoteRequest, cfg: QuoteConfig): Quote {
  const m = materialCfg(cfg, req.material)
  const pieces = req.parts.reduce((s, p) => s + Math.max(1, p.quantity), 0)
  const totalWeightG = r1(req.parts.reduce((s, p) => s + p.weightG * Math.max(1, p.quantity), 0))
  const totalPrintMin = Math.round(req.parts.reduce((s, p) => s + p.printMin * Math.max(1, p.quantity), 0))

  const items: QuoteItem[] = []
  const pp = printPrice(cfg, m, totalWeightG, totalPrintMin)
  items.push({ key: "print", label: `ค่าพิมพ์ ${m.name}`, detail: pp.detail, amount: pp.price })

  const finish = (key: "sanding" | "painting", on: boolean) => {
    const a = cfg.addons[key]
    if (!on || !a.enabled) return
    const amount = Math.ceil(Math.max(pp.price * a.pct / 100, a.minPerPiece * pieces))
    items.push({ key, label: a.label, detail: `${a.pct}% ของค่าพิมพ์ (ขั้นต่ำ ฿${a.minPerPiece}/ชิ้น × ${pieces} ชิ้น)`, amount })
  }
  finish("sanding", req.sanding)
  finish("painting", req.painting)

  const mc = cfg.addons.multiColor
  const extraColors = req.parts.reduce((s, p) => s + Math.max(0, p.colors - 1) * Math.max(1, p.quantity), 0)
  if (mc.enabled && extraColors > 0) {
    items.push({ key: "multiColor", label: mc.label, detail: `สีเพิ่ม ${extraColors} สี × ฿${mc.perExtraColor}`, amount: Math.ceil(extraColors * mc.perExtraColor) })
  }

  const rushAvailable = cfg.rush.enabled && totalPrintMin / 60 <= cfg.rush.maxPrintHours
  const rushApplied = req.rush && rushAvailable
  if (rushApplied) {
    const base = items.reduce((s, it) => s + it.amount, 0)
    items.push({ key: "rush", label: cfg.rush.label, detail: `+${cfg.rush.pct}% ของ ฿${base.toLocaleString()}`, amount: Math.ceil(base * cfg.rush.pct / 100) })
  }

  const subtotal = items.reduce((s, it) => s + it.amount, 0)
  const shipping = req.shipping === "postal" ? cfg.shipping.postal : 0
  if (shipping) items.push({ key: "shipping", label: "ค่าจัดส่ง", detail: "พัสดุ", amount: shipping })

  const finishDays = Math.max(
    req.sanding && cfg.addons.sanding.enabled ? cfg.addons.sanding.extraDays : 0,
    req.painting && cfg.addons.painting.enabled ? cfg.addons.painting.extraDays : 0,
  )
  const workDays = rushApplied
    ? 1
    : cfg.leadTime.reviewDays + Math.max(1, Math.ceil(totalPrintMin / 60 / cfg.leadTime.printHoursPerDay)) + finishDays
  const expectedDays = workDays + (req.shipping === "postal" ? cfg.leadTime.postalDays : 0)

  return {
    items, printPrice: pp.price, subtotal, shipping, total: subtotal + shipping,
    totalWeightG, totalPrintMin, pieces, rushAvailable, rushApplied,
    expectedDays, expectedDate: addDaysBangkok(req.now ?? new Date(), expectedDays),
    shopeeUnits: Math.max(1, Math.ceil(subtotal / cfg.payment.shopeeUnitPrice)),
  }
}

/** "ค่าพิมพ์ 450 + ขัดผิว 150 + ด่วน 300 = 900 บาท" */
export function quoteSentence(q: Quote): string {
  const parts = q.items.map(i => `${i.label.replace(/\s*\(.*\)$/, "")} ${i.amount.toLocaleString()}`)
  return `${parts.join(" + ")} = ${q.total.toLocaleString()} บาท`
}
