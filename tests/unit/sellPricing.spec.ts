import { test, expect } from "@playwright/test"
import {
  materialCost, roundUpNice, costBreakdown, priceForChannel, calculateSellPrices,
  sanitizeSettings, sanitizeMarket, DEFAULT_SELL_PRICING as D, DEFAULT_MARKET_PRICES,
} from "../../lib/sellPricing"

const tiers = [{ upToG: 400, perG: 2 }, { upToG: null, perG: 1 }]

test("tiered material cost: bracket (whole weight at one rate) and progressive", () => {
  expect(materialCost(100, tiers, "bracket")).toBe(200)
  expect(materialCost(400, tiers, "bracket")).toBe(800)
  expect(materialCost(401, tiers, "bracket")).toBe(401)          // 401 g+ → 1 ฿/g on everything
  expect(materialCost(500, tiers, "progressive")).toBe(900)      // 400×2 + 100×1
  expect(materialCost(401, tiers, "progressive")).toBe(801)
  expect(materialCost(0, tiers, "bracket")).toBe(0)
  expect(materialCost(-5, tiers, "bracket")).toBe(0)
})

test("shop-style rounding ends in 9", () => {
  expect(roundUpNice(143)).toBe(149)
  expect(roundUpNice(98)).toBe(99)
  expect(roundUpNice(149)).toBe(149)
  expect(roundUpNice(150)).toBe(159)
  expect(roundUpNice(1203)).toBe(1249)
  expect(roundUpNice(0)).toBe(0)
})

test("cost breakdown: material + electricity + depreciation + packaging", () => {
  // 100 g, 2 h: 200 + 2h×0.15kW×5฿ + 2h×(25000/5000) + 15
  const c = costBreakdown({ grams: 100, printHours: 2 }, D)
  expect(c).toMatchObject({ material: 200, electricity: 1.5, depreciation: 10, packaging: 15, total: 226.5, perGram: 2.27 })
})

test("Shopee 30% + marketing 5%, minimum profit 50% of cost", () => {
  const shopee = D.channels[0]
  const p = priceForChannel(226.5, shopee, D)
  expect(p.pctCosts).toBe(35)
  expect(p.breakEven).toBeCloseTo(348.46, 2)            // 226.5 / 0.65
  expect(p.minPrice).toBeCloseTo(522.69, 2)             // 226.5 × 1.5 / 0.65
  expect(p.recommended).toBe(529)
  expect(p.launch).toBe(529)                            // can't discount below the minimum price
  // at the recommended price the profit is at least 50% of cost
  expect(p.profitAtRecommended!).toBeGreaterThanOrEqual(226.5 * 0.5)
  expect(p.markupAtRecommended!).toBeGreaterThanOrEqual(50)
})

test("profit as % of the selling price (margin) needs a higher price", () => {
  const s = { ...D, profitBasis: "price" as const }
  const p = priceForChannel(226.5, D.channels[0], s)
  expect(p.minPrice).toBe(1510)                          // 226.5 / (0.65 − 0.5)
  expect(p.marginAtRecommended!).toBeGreaterThanOrEqual(50)
  // impossible combination is reported, not NaN
  const bad = priceForChannel(100, { id: "x", name: "x", commissionPct: 60 }, s)
  expect(bad.minPrice).toBeNull()
  expect(bad.warnings[0]).toContain("เกิน 100%")
})

test("market-aware: follow the market when it is higher, launch below it but never under the minimum", () => {
  const stand = DEFAULT_MARKET_PRICES.find(m => m.category.startsWith("ขาตั้ง"))!
  // cheap item: 30 g, 1 h on the direct channel (0% commission)
  const r = calculateSellPrices({ grams: 30, printHours: 1 }, D, stand)
  const direct = r.channels.find(c => c.channel.id === "direct")!
  expect(direct.minPrice!).toBeLessThan(stand.typical!)
  expect(direct.recommended).toBe(149)                  // market typical
  expect(direct.launch!).toBeLessThan(direct.recommended!)
  expect(direct.launch!).toBeGreaterThanOrEqual(direct.minPrice!)
  expect(direct.marketPosition).toBe("within")

  // expensive item vs a cheap market → warning
  const big = calculateSellPrices({ grams: 380, printHours: 14 }, D, stand)
  expect(big.channels[0].marketPosition).toBe("above")
  expect(big.channels[0].warnings.join(" ")).toContain("ต้นทุนสูงกว่าราคาสูงสุดในตลาด")
})

test("settings from the sheet are cleaned up; missing values fall back to defaults", () => {
  const s = sanitizeSettings({ materialTiers: [{ upToG: "300", perG: "2.5" }], printerWatts: "abc", channels: [{ name: "Shopee", commissionPct: 999 }] })
  expect(s.materialTiers).toEqual([{ upToG: 300, perG: 2.5 }, { upToG: null, perG: 2.5 }]) // open-ended tier added
  expect(s.printerWatts).toBe(D.printerWatts)
  expect(s.channels[0].commissionPct).toBe(95)
  expect(sanitizeSettings(null)).toEqual(D)
  expect(sanitizeMarket([{ category: " ", low: 1 }, { category: "A", low: "10", typical: "", high: "x" }]))
    .toEqual([{ category: "A", example: "", typicalWeightG: null, low: 10, typical: null, high: null, source: "", updated: "" }])
})
