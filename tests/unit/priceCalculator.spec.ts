import { test, expect } from "@playwright/test"
import { calculate, fitsInBuildVolume, formatTime, formatTimeFull, BUILD_MAX, flatRateOrder, flatRateFormula, shopeeUnitsFor, printedVolumeCm3 } from "../../lib/priceCalculator"

const base = {
  volumeCm3: 8, dimensions: { x: 20, y: 20, z: 20 }, technology: "FDM" as const,
  material: "PLA" as const, infill: 25 as const, layerHeight: 0.4 as const, quantity: 1, shipping: "pickup" as const,
}

test("small part hits the ฿59/pc minimum", () => {
  const r = calculate(base)
  expect(r.pricePerPc).toBe(59)
  expect(r.totalPrice).toBe(59)
  expect(r.shippingCost).toBe(0)
})

test("postal shipping adds ฿45 once, not per piece", () => {
  const r = calculate({ ...base, material: "ABS", quantity: 3, shipping: "postal" })
  expect(r.shippingCost).toBe(45)
  expect(r.subtotal).toBe(r.pricePerPc * 3)
  expect(r.totalPrice).toBe(r.subtotal + 45)
})

test("price grows with infill and with stronger materials", () => {
  const big = { ...base, volumeCm3: 500 }
  const low = calculate({ ...big, infill: 10 })
  const high = calculate({ ...big, infill: 80 })
  expect(high.weightG).toBeGreaterThan(low.weightG)
  expect(high.totalPrice).toBeGreaterThan(low.totalPrice)
  expect(calculate({ ...big, material: "CarbonFiber" }).totalPrice).toBeGreaterThan(calculate(big).totalPrice)
})

test("finer layers take longer to print", () => {
  const big = { ...base, volumeCm3: 200 }
  expect(calculate({ ...big, layerHeight: 0.08 }).printTimeSec)
    .toBeGreaterThan(calculate({ ...big, layerHeight: 0.4 }).printTimeSec)
})

test("weight = (20% shell + infill of the rest) × density", () => {
  const r = calculate({ ...base, volumeCm3: 100, infill: 50 })
  // (20 + 80*0.5) * 1.24 = 74.4
  expect(r.weightG).toBeCloseTo(74.4, 1)
})

test("build volume check", () => {
  expect(fitsInBuildVolume({ x: BUILD_MAX.x, y: BUILD_MAX.y, z: BUILD_MAX.z })).toBe(true)
  expect(fitsInBuildVolume({ x: BUILD_MAX.x + 1, y: 10, z: 10 })).toBe(false)
})

test("time formatters", () => {
  expect(formatTimeFull(3725)).toBe("1h 2m 5s")
  expect(formatTimeFull(0)).toBe("0s")
  expect(formatTime(90)).toBe("1h 30m")
  expect(formatTime(120)).toBe("2h")
  expect(formatTime(5)).toBe("5m")
})

test("price = (material + machine) × 0.90 above the ฿59 minimum (non PLA/PETG)", () => {
  const r = calculate({ ...base, material: "ABS", volumeCm3: 500 })
  expect(r.pricePerPc).toBe(Math.round((r.materialCost + r.machineCost) * 0.9))
  expect(r.pricePerPc).toBeGreaterThan(59)
})

test("0.4 mm layer is priced (no NaN) and prints faster than 0.24 mm", () => {
  const big = { ...base, volumeCm3: 300 }
  const thick = calculate({ ...big, layerHeight: 0.4 })
  expect(Number.isFinite(thick.totalPrice)).toBe(true)
  expect(thick.printTimeSec).toBeLessThan(calculate({ ...big, layerHeight: 0.24 }).printTimeSec)
  // an unexpected height still gives a number
  expect(Number.isFinite(calculate({ ...big, layerHeight: 0.3 as any }).totalPrice)).toBe(true)
})

test("PLA / PETG: first 250 g at 3 ฿/g, the rest of the order at 1.5 ฿/g", () => {
  // 100 cm³ at 50% infill → 74.4 g PLA
  const one = calculate({ ...base, volumeCm3: 100, infill: 50 })
  expect(one.ratePerGram).toBe(3)
  expect(one.subtotal).toBe(Math.ceil(74.4 * 3)) // 224
  expect(one.machineCost).toBe(0)
  expect(one.shopeeUnits).toBe(4) // 224 / 59 = 3.8 → 4
  // 4 pieces = 297.6 g → 250 × 3 + 47.6 × 1.5 = 821.4 → 822
  const four = calculate({ ...base, volumeCm3: 100, infill: 50, quantity: 4, shipping: "postal" })
  expect(four.totalWeightG).toBeCloseTo(297.6, 1)
  expect(four.subtotal).toBe(822)
  expect(four.totalPrice).toBe(822 + 45)
  expect(four.shopeeUnits).toBe(14) // 822 / 59 = 13.9 → 14
  expect(calculate({ ...base, volumeCm3: 100, infill: 50, material: "PETG" }).ratePerGram).toBe(3)
})

test("tiered price never drops as the order gets heavier; Shopee units", () => {
  expect(flatRateOrder(249.9).subtotal).toBe(750) // 749.7 → 750
  expect(flatRateOrder(250).subtotal).toBe(750)
  expect(flatRateOrder(300).subtotal).toBe(825) // 750 + 50 × 1.5
  expect(flatRateOrder(1000).subtotal).toBe(1875) // 750 + 750 × 1.5
  let last = 0
  for (let g = 1; g <= 600; g += 7) { const p = flatRateOrder(g).subtotal; expect(p).toBeGreaterThanOrEqual(last); last = p }
  expect(flatRateFormula(297.6)).toBe("250 g × 3 ฿ + 47.6 g × 1.5 ฿")
  expect(flatRateFormula(74.4)).toBe("74.4 g × 3 ฿")
  expect(flatRateOrder(5)).toMatchObject({ subtotal: 59, shopeeUnits: 1 }) // ฿59 minimum per order
  expect(shopeeUnitsFor(59)).toBe(1)
  expect(shopeeUnitsFor(59.01)).toBe(2)
  expect(shopeeUnitsFor(118)).toBe(2)
})

test("slicer-style weight: shell over the surface + infill of the inside (calibrated on EggPuzzle.3mf)", () => {
  // EggPuzzle.3mf: solid 508 cm³, surface 2727 cm², Bambu Studio 2 walls / 15% infill → 357.98 g
  const v = printedVolumeCm3(508, 2727, 15)
  expect(v * 1.26).toBeGreaterThan(357.98 * 0.98)
  expect(v * 1.26).toBeLessThan(357.98 * 1.02)
  // thin parts are all shell: never more than the solid volume
  expect(printedVolumeCm3(10, 1000, 15)).toBe(10)
  // calculate() uses it when mesh stats are given, otherwise the bounding-box fallback
  const box = { ...base, volumeCm3: 216, infill: 25 as const }
  const withMesh = calculate({ ...box, meshVolumeCm3: 216, surfaceCm2: 216 })
  expect(withMesh.weightG).toBeCloseTo(printedVolumeCm3(216, 216, 25) * 1.24, 0)
  expect(calculate(box).weightG).toBeCloseTo((216 * 0.2 + 216 * 0.8 * 0.25) * 1.24, 0)
})

test("print time follows the plastic volume (calibrated on Bambu Studio: EggPuzzle 13h12m)", () => {
  // EggPuzzle.3mf at 15% infill → 284.8 cm³ of plastic → 792 min
  const r = calculate({ ...base, volumeCm3: 2415, infill: 15, meshVolumeCm3: 508, surfaceCm2: 2727 })
  expect(r.printTimeMin).toBeGreaterThan(792 * 0.98)
  expect(r.printTimeMin).toBeLessThan(792 * 1.02)
  // more infill → more plastic → longer
  expect(calculate({ ...base, volumeCm3: 2415, infill: 50, meshVolumeCm3: 508, surfaceCm2: 2727 }).printTimeMin).toBeGreaterThan(r.printTimeMin)
})
