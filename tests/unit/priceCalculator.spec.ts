import { test, expect } from "@playwright/test"
import { calculate, fitsInBuildVolume, formatTime, formatTimeFull, BUILD_MAX } from "../../lib/priceCalculator"

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
  const r = calculate({ ...base, quantity: 3, shipping: "postal" })
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

test("price = (material + machine) × 0.90 above the ฿59 minimum", () => {
  const r = calculate({ ...base, volumeCm3: 500 })
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
