import { test, expect } from "@playwright/test"
import { computeQuote, gramTiers, addDaysBangkok, quoteSentence, thaiDate } from "../../lib/quotePricing"
import { DEFAULT_QUOTE_CONFIG as D, sanitizeQuoteConfig } from "../../lib/quoteConfig"

const NOW = new Date("2026-11-28T03:00:00Z") // 10:00 Bangkok
const part = (o: Partial<{ weightG: number; printMin: number; quantity: number; colors: number }> = {}) =>
  ({ name: "a.stl", weightG: 100, printMin: 120, quantity: 1, colors: 1, ...o })
const base = { material: "PLA" as const, sanding: false, painting: false, rush: false, shipping: "pickup" as const, now: NOW }

test("print price: tiered grams for PLA, grams + hours for TPU, minimum order", () => {
  expect(computeQuote({ ...base, parts: [part()] }, D).printPrice).toBe(300) // 100 g × 3
  expect(computeQuote({ ...base, parts: [part({ weightG: 150, quantity: 2 })] }, D).printPrice).toBe(825) // 250×3 + 50×1.5
  const tiny = computeQuote({ ...base, parts: [part({ weightG: 5, printMin: 10 })] }, D)
  expect(tiny.printPrice).toBe(59)
  expect(tiny.items[0].detail).toBe("5 g × 3 ฿ (ขั้นต่ำ ฿59)")
  expect(computeQuote({ ...base, parts: [part({ weightG: 60.7 })] }, D).items[0].detail).toBe("60.7 g × 3 ฿")
  const tpu = computeQuote({ ...base, material: "TPU", parts: [part()] }, D)
  expect(tpu.printPrice).toBe(Math.ceil(100 * 3.6 + 2 * 40.5)) // 441
  expect(tpu.items[0].detail).toBe("100 g × 3.6 ฿ + 2 ชม. × 40.5 ฿")
  expect(gramTiers(D.materials[0], 297.6)).toEqual([{ grams: 250, perG: 3 }, { grams: 47.6, perG: 1.5 }])
})

test("itemised: print + sanding + painting + multi-colour + rush + shipping", () => {
  const q = computeQuote({
    ...base, sanding: true, painting: true, rush: true, shipping: "postal",
    parts: [part({ quantity: 2, colors: 3 })], // 200 g, 4 h, 2 pieces, 2 extra colours each
  }, D)
  const by = Object.fromEntries(q.items.map(i => [i.key, i.amount]))
  expect(by.print).toBe(600)
  expect(by.sanding).toBe(180)        // 30% of 600 (min 50 × 2 = 100)
  expect(by.painting).toBe(360)       // 60% of 600 (min 100 × 2 = 200)
  expect(by.multiColor).toBe(80)      // 4 extra colours × 20
  expect(by.rush).toBe(610)           // 50% of 1220
  expect(by.shipping).toBe(45)
  expect(q.subtotal).toBe(1830)
  expect(q.total).toBe(1875)
  expect(q.shopeeUnits).toBe(32)      // 1830 / 59 = 31.0… → 32
  expect(quoteSentence(q)).toBe("ค่าพิมพ์ PLA 600 + ขัดผิว 180 + ทำสี 360 + หลายสี 80 + งานด่วน 610 + ค่าจัดส่ง 45 = 1,875 บาท")
  // rush: ready next day, + 2 days post
  expect(q.expectedDays).toBe(3)
  expect(q.expectedDate).toBe("2026-12-01")
})

test("rush only for short jobs; normal lead time = review + print days + finishing + post", () => {
  const long = computeQuote({ ...base, rush: true, parts: [part({ printMin: 20 * 60 })] }, D)
  expect(long.rushAvailable).toBe(false)
  expect(long.items.some(i => i.key === "rush")).toBe(false)
  // 1 review day + ceil(20/16)=2 print days
  expect(long.expectedDays).toBe(3)
  const painted = computeQuote({ ...base, painting: true, shipping: "postal", parts: [part()] }, D)
  expect(painted.expectedDays).toBe(1 + 1 + 2 + 2)
})

test("dates in Bangkok time", () => {
  expect(addDaysBangkok(new Date("2026-11-28T18:00:00Z"), 0)).toBe("2026-11-29") // 01:00 next day in Bangkok
  expect(thaiDate("2026-12-01")).toMatch(/1 ธ\.ค\. 2569/)
})

test("settings are sanitised: bad values clamped, unknown materials dropped, at least one material on", () => {
  const c = sanitizeQuoteConfig({
    materials: [{ id: "PLA", perG: -5, enabled: false }, { id: "Resin", enabled: true }],
    infillOptions: [100, "abc", 15, 15, 2], defaultInfill: 42, minOrder: "x",
    contact: { shopEmail: "not-an-email", lineUrl: "javascript:alert(1)" }, payment: { promptpayId: "081-234-5678" },
  })
  expect(c.materials.map(m => m.id)).not.toContain("Resin")
  expect(c.materials.find(m => m.id === "PLA")).toMatchObject({ perG: 0, enabled: false })
  expect(c.materials.some(m => m.enabled)).toBe(true)
  expect(c.infillOptions).toEqual([15, 100])
  expect(c.defaultInfill).toBe(15)
  expect(c.minOrder).toBe(59)
  expect(c.contact.shopEmail).toBe("")
  expect(c.contact.lineUrl).toBe(D.contact.lineUrl)
  expect(c.payment.promptpayId).toBe("0812345678")
})
