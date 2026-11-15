// Selling-price calculator for ready-made products (admin tool).
// Pure functions only: used by the admin page and the API, and unit-tested.

export interface MaterialTier {
  /** upper bound in grams for this tier; null = no limit */
  upToG: number | null
  /** THB per gram */
  perG: number
}

export interface SalesChannel {
  id: string
  name: string
  /** platform commission + payment/transaction fees, % of the selling price */
  commissionPct: number
}

export interface SellPricingSettings {
  materialTiers: MaterialTier[]
  /**
   * bracket:     the whole weight uses the rate of the tier it falls in
   *              (400 g → 400×2, 401 g → 401×1)
   * progressive: each tier's rate applies only to the grams inside it
   *              (401 g → 400×2 + 1×1)
   */
  tierMode: "bracket" | "progressive"
  printerWatts: number          // ค่าไฟ: printer power draw
  electricityPerKwh: number     // THB per kWh
  printerPrice: number          // ค่าเสื่อม: machine price …
  printerLifetimeHours: number  // … spread over its working life
  packagingPerItem: number      // ค่าแพ็กเกจ
  otherPerItem: number          // anything else per piece
  marketingPct: number          // ค่าการตลาด, % of the selling price
  minProfitPct: number          // กำไรขั้นต่ำ
  /** cost: profit = minProfitPct × total cost (markup); price: profit = minProfitPct × selling price (margin) */
  profitBasis: "cost" | "price"
  /** opening price = recommended × (1 − launchDiscountPct), never below the minimum price */
  launchDiscountPct: number
  channels: SalesChannel[]
}

export const DEFAULT_SELL_PRICING: SellPricingSettings = {
  // flat rate: 1 ฿ per gram at any weight (add tiers in the settings if needed)
  materialTiers: [
    { upToG: null, perG: 1 },
  ],
  tierMode: "bracket",
  printerWatts: 150,
  electricityPerKwh: 5,
  printerPrice: 25000,
  printerLifetimeHours: 5000,
  packagingPerItem: 15,
  otherPerItem: 0,
  marketingPct: 5,
  minProfitPct: 50,
  profitBasis: "cost",
  launchDiscountPct: 10,
  channels: [
    { id: "shopee", name: "Shopee", commissionPct: 30 },
    { id: "lazada", name: "Lazada", commissionPct: 30 },
    { id: "tiktok", name: "TikTok Shop", commissionPct: 30 },
    { id: "direct", name: "ขายตรง (LINE / FB / เว็บ)", commissionPct: 0 },
  ],
}

export interface MarketPrice {
  category: string
  example: string
  typicalWeightG: number | null
  low: number | null
  typical: number | null
  high: number | null
  source: string
  updated: string
}

/**
 * Starting reference prices (THB per piece, PLA, Thai online market).
 * Rough estimates to begin with: replace them with prices you actually see on
 * Shopee/Lazada in the "MarketPrices" tab of the Google Sheet.
 */
export const DEFAULT_MARKET_PRICES: MarketPrice[] = [
  { category: "พวงกุญแจ / ป้ายชื่อเล็ก", example: "พวงกุญแจชื่อ, จี้", typicalWeightG: 15, low: 29, typical: 59, high: 129, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "ขาตั้งโทรศัพท์ / แท็บเล็ต", example: "ขาตั้งมือถือ, แท่นวาง", typicalWeightG: 60, low: 79, typical: 149, high: 299, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "กระถางต้นไม้", example: "กระถางแคคตัส, กระถางแขวน", typicalWeightG: 100, low: 89, typical: 179, high: 390, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "กล่อง / ที่จัดระเบียบโต๊ะ", example: "ที่ใส่ปากกา, กล่องเก็บของ", typicalWeightG: 150, low: 129, typical: 249, high: 590, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "ป้ายตั้งโต๊ะ / ของชำร่วย", example: "ป้ายชื่อ, ของชำร่วยงานแต่ง", typicalWeightG: 40, low: 49, typical: 99, high: 199, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "อะไหล่ / อุปกรณ์เสริม", example: "ตัวยึด, ฝาครอบ, คลิป", typicalWeightG: 40, low: 59, typical: 150, high: 400, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "ฟิกเกอร์ / โมเดลตั้งโชว์ (ไม่ทำสี)", example: "ฟิกเกอร์, รูปปั้นเล็ก", typicalWeightG: 150, low: 199, typical: 450, high: 1500, source: "ค่าประมาณเริ่มต้น", updated: "" },
  { category: "พร็อพคอสเพลย์ / ชิ้นใหญ่", example: "หน้ากาก, อาวุธพร็อพ", typicalWeightG: 600, low: 590, typical: 1500, high: 4000, source: "ค่าประมาณเริ่มต้น", updated: "" },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

const n = (v: unknown, fallback = 0) => {
  const x = typeof v === "number" ? v : Number(v)
  return Number.isFinite(x) ? x : fallback
}
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
// half-up to 2 decimals (EPSILON avoids 1.265 → 1.26 from binary floating point)
const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100

/** Round a price up to a "shop" price ending in 9: 143 → 149, 98 → 99, 1203 → 1249. */
export function roundUpNice(x: number): number {
  if (!(x > 0)) return 0
  if (x < 1000) return Math.ceil((x + 1) / 10) * 10 - 1
  return Math.ceil((x + 1) / 50) * 50 - 1
}

/** Material cost for a weight, using the tier table. */
export function materialCost(grams: number, tiers: MaterialTier[], mode: SellPricingSettings["tierMode"]): number {
  const g = Math.max(0, n(grams))
  if (g === 0 || tiers.length === 0) return 0
  const sorted = [...tiers].sort((a, b) => (a.upToG ?? Infinity) - (b.upToG ?? Infinity))
  if (mode === "bracket") {
    const tier = sorted.find(t => t.upToG === null || g <= t.upToG) ?? sorted[sorted.length - 1]
    return round2(g * tier.perG)
  }
  let cost = 0, from = 0
  for (const t of sorted) {
    const to = t.upToG ?? Infinity
    if (g <= from) break
    cost += (Math.min(g, to) - from) * t.perG
    from = to
  }
  return round2(cost)
}

/** Clean up settings coming from the sheet or the admin form. */
export function sanitizeSettings(input: any): SellPricingSettings {
  const d = DEFAULT_SELL_PRICING
  const s = input && typeof input === "object" ? input : {}
  const tiers: MaterialTier[] = Array.isArray(s.materialTiers) && s.materialTiers.length
    ? s.materialTiers.slice(0, 10).map((t: any) => ({
        upToG: t?.upToG === null || t?.upToG === "" || t?.upToG === undefined ? null : Math.max(1, n(t.upToG, 1)),
        perG: clamp(n(t?.perG), 0, 1000),
      }))
    : d.materialTiers
  if (!tiers.some(t => t.upToG === null)) tiers.push({ upToG: null, perG: tiers[tiers.length - 1].perG })
  const channels: SalesChannel[] = Array.isArray(s.channels) && s.channels.length
    ? s.channels.slice(0, 12).map((c: any, i: number) => ({
        id: String(c?.id || `ch${i}`).slice(0, 30),
        name: String(c?.name || `ช่องทาง ${i + 1}`).slice(0, 60),
        commissionPct: clamp(n(c?.commissionPct), 0, 95),
      }))
    : d.channels
  return {
    materialTiers: tiers,
    tierMode: s.tierMode === "progressive" ? "progressive" : "bracket",
    printerWatts: clamp(n(s.printerWatts, d.printerWatts), 0, 5000),
    electricityPerKwh: clamp(n(s.electricityPerKwh, d.electricityPerKwh), 0, 100),
    printerPrice: clamp(n(s.printerPrice, d.printerPrice), 0, 10_000_000),
    printerLifetimeHours: clamp(n(s.printerLifetimeHours, d.printerLifetimeHours), 1, 1_000_000),
    packagingPerItem: clamp(n(s.packagingPerItem, d.packagingPerItem), 0, 100_000),
    otherPerItem: clamp(n(s.otherPerItem, d.otherPerItem), 0, 100_000),
    marketingPct: clamp(n(s.marketingPct, d.marketingPct), 0, 90),
    minProfitPct: clamp(n(s.minProfitPct, d.minProfitPct), 0, 1000),
    profitBasis: s.profitBasis === "price" ? "price" : "cost",
    launchDiscountPct: clamp(n(s.launchDiscountPct, d.launchDiscountPct), 0, 90),
    channels,
  }
}

export function sanitizeMarket(rows: any[]): MarketPrice[] {
  const num = (v: unknown) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))
  return (Array.isArray(rows) ? rows : [])
    .map(r => ({
      category: String(r?.category ?? "").trim(), example: String(r?.example ?? ""),
      typicalWeightG: num(r?.typicalWeightG), low: num(r?.low), typical: num(r?.typical), high: num(r?.high),
      source: String(r?.source ?? ""), updated: String(r?.updated ?? ""),
    }))
    .filter(r => r.category)
}

// ─── the calculation ─────────────────────────────────────────────────────────

export interface ProductInput {
  grams: number
  printHours: number
}

export interface CostBreakdown {
  material: number
  materialRate: number      // effective THB/g for the material
  electricity: number
  depreciation: number
  packaging: number
  other: number
  total: number             // total cost per piece before % costs
  perGram: number           // total cost / grams
}

export interface ChannelPrice {
  channel: SalesChannel
  pctCosts: number          // commission + marketing, % of price
  breakEven: number         // below this you lose money
  minPrice: number | null   // lowest price that still makes the minimum profit (null = impossible)
  recommended: number | null
  launch: number | null
  profitAtRecommended: number | null
  marginAtRecommended: number | null   // profit / price, %
  markupAtRecommended: number | null   // profit / cost, %
  marketPosition: "below" | "within" | "above" | null
  warnings: string[]
}

export function costBreakdown(p: ProductInput, s: SellPricingSettings): CostBreakdown {
  const grams = Math.max(0, n(p.grams))
  const hours = Math.max(0, n(p.printHours))
  const material = materialCost(grams, s.materialTiers, s.tierMode)
  const electricity = round2(hours * (s.printerWatts / 1000) * s.electricityPerKwh)
  const depreciation = round2(hours * (s.printerPrice / s.printerLifetimeHours))
  const total = round2(material + electricity + depreciation + s.packagingPerItem + s.otherPerItem)
  return {
    material, materialRate: grams ? round2(material / grams) : 0,
    electricity, depreciation, packaging: s.packagingPerItem, other: s.otherPerItem,
    total, perGram: grams ? round2(total / grams) : 0,
  }
}

export function priceForChannel(cost: number, ch: SalesChannel, s: SellPricingSettings, market?: MarketPrice | null): ChannelPrice {
  const pct = (ch.commissionPct + s.marketingPct) / 100
  const r = s.minProfitPct / 100
  const warnings: string[] = []
  const keep = 1 - pct                      // share of the price the shop keeps
  const breakEven = keep > 0 ? round2(cost / keep) : Infinity

  let minPrice: number | null = null
  if (s.profitBasis === "cost") {
    if (keep > 0) minPrice = round2((cost * (1 + r)) / keep)
  } else if (keep - r > 0) {
    minPrice = round2(cost / (keep - r))
  }
  if (minPrice === null) {
    warnings.push("ค่าคอม + การตลาด + กำไรขั้นต่ำ รวมกันเกิน 100% ของราคา ตั้งราคาให้ได้กำไรตามเป้าไม่ได้")
    return { channel: ch, pctCosts: round2(pct * 100), breakEven, minPrice: null, recommended: null, launch: null,
      profitAtRecommended: null, marginAtRecommended: null, markupAtRecommended: null, marketPosition: null, warnings }
  }

  // recommended: at least the minimum price; follow the market's typical price when it is higher
  const target = market?.typical && market.typical > minPrice ? market.typical : minPrice
  const recommended = roundUpNice(target)
  // opening price: a discount on the recommended price, never below the minimum price
  const launch = Math.min(recommended, roundUpNice(Math.max(minPrice, recommended * (1 - s.launchDiscountPct / 100))))

  const profit = round2(recommended * keep - cost)
  let marketPosition: ChannelPrice["marketPosition"] = null
  if (market && (market.low !== null || market.high !== null)) {
    if (market.low !== null && recommended < market.low) marketPosition = "below"
    else if (market.high !== null && recommended > market.high) marketPosition = "above"
    else marketPosition = "within"
  }
  if (market?.high != null && minPrice > market.high)
    warnings.push("ต้นทุนสูงกว่าราคาสูงสุดในตลาด: ลองลดน้ำหนัก/เวลาพิมพ์ หรือขายช่องทางที่ค่าคอมต่ำกว่า")

  return {
    channel: ch, pctCosts: round2(pct * 100), breakEven, minPrice, recommended, launch,
    profitAtRecommended: profit,
    marginAtRecommended: recommended ? round2((profit / recommended) * 100) : null,
    markupAtRecommended: cost ? round2((profit / cost) * 100) : null,
    marketPosition, warnings,
  }
}

export function calculateSellPrices(p: ProductInput, s: SellPricingSettings, market?: MarketPrice | null) {
  const cost = costBreakdown(p, s)
  return { cost, channels: s.channels.map(ch => priceForChannel(cost.total, ch, s, market)) }
}

/** Shopee search link for surveying competitor prices. */
export const shopeeSearchUrl = (keyword: string) =>
  `https://shopee.co.th/search?keyword=${encodeURIComponent(`${keyword} 3d print`)}`
