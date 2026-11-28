// Customer-quote settings: rates, materials, colours, add-ons, rush, lead time and
// payment details. Stored as JSON in the Google Sheet "Settings" tab (key
// "quoteConfig") and edited from the admin page, so prices change without code.

import type { Material } from "./priceCalculator"

export interface MaterialCfg {
  id: Material
  name: string
  /** what it is good for, shown to customers */
  desc: string
  enabled: boolean
  /** ฿ per gram for the first `bulkFromG` grams of the order, then `bulkPerG` */
  perG: number
  bulkPerG: number
  bulkFromG: number
  /** ฿ per hour of printing (0 = priced by weight only) */
  machinePerHour: number
}

export interface ColorCfg { id: string; name: string; hex: string; enabled: boolean }

export interface FinishAddon {
  enabled: boolean
  label: string
  desc: string
  /** % of the print price … */
  pct: number
  /** … but at least this much per piece */
  minPerPiece: number
  /** extra working days */
  extraDays: number
}

export interface QuoteConfig {
  materials: MaterialCfg[]
  colors: ColorCfg[]
  infillOptions: number[]
  defaultInfill: number
  /** smallest order (print price) in ฿ */
  minOrder: number
  addons: {
    sanding: FinishAddon
    painting: FinishAddon
    multiColor: { enabled: boolean; label: string; desc: string; perExtraColor: number }
  }
  rush: { enabled: boolean; label: string; pct: number; maxPrintHours: number }
  leadTime: { reviewDays: number; printHoursPerDay: number; postalDays: number }
  shipping: { postal: number }
  payment: {
    promptpayId: string
    bankName: string
    bankAccount: string
    accountName: string
    shopeeEnabled: boolean
    shopeeUrl: string
    shopeeUnitPrice: number
  }
  contact: { shopEmail: string; lineUrl: string }
}

export const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  materials: [
    { id: "PLA", name: "PLA", desc: "ใช้งานทั่วไป ของตกแต่ง โมเดล ต้นแบบ · พิมพ์ง่าย สีสวย ไม่ทนร้อน", enabled: true,
      perG: 3, bulkPerG: 1.5, bulkFromG: 250, machinePerHour: 0 },
    { id: "PETG", name: "PETG", desc: "ชิ้นส่วนใช้งานจริง ทนแรงกระแทก ทนความชื้นและความร้อนกว่า PLA", enabled: true,
      perG: 3, bulkPerG: 1.5, bulkFromG: 250, machinePerHour: 0 },
    { id: "TPU", name: "TPU (ยืดหยุ่น)", desc: "ยางยืดหยุ่น ซีล กันกระแทก เคสมือถือ สายรัด", enabled: true,
      perG: 3.6, bulkPerG: 3.6, bulkFromG: 0, machinePerHour: 40.5 },
    { id: "ABS", name: "ABS", desc: "ทนร้อน ใช้ในรถหรือใกล้ความร้อน", enabled: false,
      perG: 2.7, bulkPerG: 2.7, bulkFromG: 0, machinePerHour: 40.5 },
    { id: "ASA", name: "ASA", desc: "ทนแดดและ UV สำหรับงานกลางแจ้ง", enabled: false,
      perG: 3.6, bulkPerG: 3.6, bulkFromG: 0, machinePerHour: 40.5 },
    { id: "CarbonFiber", name: "Carbon Fiber", desc: "แข็งแรงและเบา สำหรับชิ้นส่วนรับแรง", enabled: false,
      perG: 7.2, bulkPerG: 7.2, bulkFromG: 0, machinePerHour: 40.5 },
  ],
  colors: [
    { id: "white", name: "ขาว", hex: "#ffffff", enabled: true },
    { id: "black", name: "ดำ", hex: "#1f1f1f", enabled: true },
    { id: "grey", name: "เทา", hex: "#808080", enabled: true },
    { id: "red", name: "แดง", hex: "#ef4444", enabled: true },
    { id: "blue", name: "น้ำเงิน", hex: "#3b82f6", enabled: true },
    { id: "green", name: "เขียว", hex: "#22c55e", enabled: true },
    { id: "yellow", name: "เหลือง", hex: "#eab308", enabled: true },
    { id: "orange", name: "ส้ม", hex: "#f97316", enabled: true },
    { id: "purple", name: "ม่วง", hex: "#a855f7", enabled: true },
    { id: "silver", name: "เงิน", hex: "#c0c0c0", enabled: true },
  ],
  infillOptions: [15, 30, 50, 100],
  defaultInfill: 15,
  minOrder: 59,
  addons: {
    sanding: { enabled: true, label: "ขัดผิว", desc: "ขัดเส้นชั้นพิมพ์ให้เรียบขึ้น", pct: 30, minPerPiece: 50, extraDays: 1 },
    painting: { enabled: true, label: "ทำสี", desc: "พ่นหรือทาสีตามที่ตกลง (แจ้งรายละเอียดในหมายเหตุ)", pct: 60, minPerPiece: 100, extraDays: 2 },
    multiColor: { enabled: true, label: "หลายสี", desc: "เลือกหลายสีในชิ้นงานเดียว", perExtraColor: 20 },
  },
  rush: { enabled: true, label: "งานด่วน (ได้ภายใน 1 วัน)", pct: 50, maxPrintHours: 16 },
  leadTime: { reviewDays: 1, printHoursPerDay: 16, postalDays: 2 },
  shipping: { postal: 45 },
  payment: {
    promptpayId: "",
    bankName: "กรุงศรีอยุธยา (Krungsri)",
    bankAccount: "5981153600",
    accountName: "รัชณีย์กร บุญหล้า",
    shopeeEnabled: true,
    shopeeUrl: "https://shopee.co.th/product/9883965/24267343976",
    shopeeUnitPrice: 59,
  },
  contact: { shopEmail: "", lineUrl: "https://lin.ee/R8Vd7q5" },
}

const n = (v: unknown, d: number, lo = 0, hi = 1e9) => {
  const x = typeof v === "number" ? v : Number(v)
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d
}
const s = (v: unknown, d: string, max = 300) => (typeof v === "string" ? v.slice(0, max) : d)
const b = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d)
const obj = (v: unknown) => (v && typeof v === "object" ? (v as any) : {})

/** Merge saved settings over the defaults, clamping every value. Unknown materials are dropped. */
export function sanitizeQuoteConfig(input: unknown): QuoteConfig {
  const i = obj(input), D = DEFAULT_QUOTE_CONFIG
  const savedMats: any[] = Array.isArray(i.materials) ? i.materials : []
  const materials = D.materials.map(dm => {
    const m = obj(savedMats.find(x => x?.id === dm.id))
    return {
      id: dm.id, name: s(m.name, dm.name, 60), desc: s(m.desc, dm.desc), enabled: b(m.enabled, dm.enabled),
      perG: n(m.perG, dm.perG, 0, 1000), bulkPerG: n(m.bulkPerG, dm.bulkPerG, 0, 1000),
      bulkFromG: n(m.bulkFromG, dm.bulkFromG, 0, 1e6), machinePerHour: n(m.machinePerHour, dm.machinePerHour, 0, 10000),
    }
  })
  if (!materials.some(m => m.enabled)) materials[0].enabled = true

  const savedColors: any[] = Array.isArray(i.colors) ? i.colors : []
  const colors = (savedColors.length ? savedColors : D.colors).slice(0, 40).map((c: any, k: number) => ({
    id: s(c?.id, `c${k}`, 30).replace(/[^\w-]/g, "") || `c${k}`,
    name: s(c?.name, `สี ${k + 1}`, 40),
    hex: /^#[0-9a-f]{6}$/i.test(c?.hex) ? c.hex : "#cccccc",
    enabled: b(c?.enabled, true),
  }))
  if (!colors.some(c => c.enabled)) colors[0].enabled = true

  const infill = Array.from(new Set<number>((Array.isArray(i.infillOptions) ? i.infillOptions : D.infillOptions)
    .map((x: unknown) => Math.round(n(x, -1, -1, 100))).filter((x: number) => x >= 5)))
    .sort((a, c) => a - c)
  const infillOptions = infill.length ? infill.slice(0, 8) : D.infillOptions
  const defaultInfill = infillOptions.includes(Math.round(n(i.defaultInfill, D.defaultInfill)))
    ? Math.round(n(i.defaultInfill, D.defaultInfill)) : infillOptions[0]

  const a = obj(i.addons)
  const finish = (v: any, d: FinishAddon): FinishAddon => ({
    enabled: b(v.enabled, d.enabled), label: s(v.label, d.label, 60), desc: s(v.desc, d.desc),
    pct: n(v.pct, d.pct, 0, 1000), minPerPiece: n(v.minPerPiece, d.minPerPiece, 0, 1e6), extraDays: Math.round(n(v.extraDays, d.extraDays, 0, 60)),
  })
  const mc = obj(a.multiColor), r = obj(i.rush), lt = obj(i.leadTime), sh = obj(i.shipping), p = obj(i.payment), c = obj(i.contact)
  const email = s(c.shopEmail, D.contact.shopEmail, 200).trim()
  const url = (v: unknown, d: string) => { const t = s(v, d, 500).trim(); return /^https:\/\//.test(t) ? t : t ? d : "" }
  return {
    materials, colors, infillOptions, defaultInfill,
    minOrder: n(i.minOrder, D.minOrder, 0, 1e6),
    addons: {
      sanding: finish(obj(a.sanding), D.addons.sanding),
      painting: finish(obj(a.painting), D.addons.painting),
      multiColor: { enabled: b(mc.enabled, D.addons.multiColor.enabled), label: s(mc.label, D.addons.multiColor.label, 60),
        desc: s(mc.desc, D.addons.multiColor.desc), perExtraColor: n(mc.perExtraColor, D.addons.multiColor.perExtraColor, 0, 1e6) },
    },
    rush: { enabled: b(r.enabled, D.rush.enabled), label: s(r.label, D.rush.label, 80), pct: n(r.pct, D.rush.pct, 0, 1000),
      maxPrintHours: n(r.maxPrintHours, D.rush.maxPrintHours, 0, 1000) },
    leadTime: { reviewDays: Math.round(n(lt.reviewDays, D.leadTime.reviewDays, 0, 60)),
      printHoursPerDay: n(lt.printHoursPerDay, D.leadTime.printHoursPerDay, 1, 24),
      postalDays: Math.round(n(lt.postalDays, D.leadTime.postalDays, 0, 60)) },
    shipping: { postal: n(sh.postal, D.shipping.postal, 0, 1e5) },
    payment: {
      promptpayId: s(p.promptpayId, D.payment.promptpayId, 20).replace(/[^\d]/g, ""),
      bankName: s(p.bankName, D.payment.bankName, 80), bankAccount: s(p.bankAccount, D.payment.bankAccount, 30),
      accountName: s(p.accountName, D.payment.accountName, 100),
      shopeeEnabled: b(p.shopeeEnabled, D.payment.shopeeEnabled), shopeeUrl: url(p.shopeeUrl, D.payment.shopeeUrl),
      shopeeUnitPrice: n(p.shopeeUnitPrice, D.payment.shopeeUnitPrice, 1, 1e5),
    },
    contact: { shopEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "", lineUrl: url(c.lineUrl, D.contact.lineUrl) },
  }
}
