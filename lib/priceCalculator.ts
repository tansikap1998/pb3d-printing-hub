// ─── Types ────────────────────────────────────────────────────────────────────

export type Technology  = "FDM"
export type FDMMaterial = "PLA" | "PETG" | "ABS" | "ASA" | "TPU" | "CarbonFiber" | "Nylon"
export type Material    = FDMMaterial
export type InfillLevel = 10 | 15 | 25 | 50 | 80
export type LayerHeight = 0.08 | 0.16 | 0.24 | 0.4
export type Shipping    = "pickup" | "postal"

// Build volume limits (mm)
export const BUILD_MAX = { x: 340, y: 320, z: 340 }
export const BUILD_MIN = { x: 0.2,  y: 0.2,  z: 0.2  }

export interface EstimateInput {
  volumeCm3:   number
  dimensions:  { x: number; y: number; z: number }
  technology:  Technology
  material:    Material
  infill:      InfillLevel
  layerHeight: LayerHeight
  quantity:    number
  shipping:    Shipping
  isAnyColor?: boolean
  /** solid volume of the mesh (cm³) and its surface area (cm²): when given, weight follows
   *  the slicer model (walls + infill) instead of the bounding-box guess */
  meshVolumeCm3?: number
  surfaceCm2?: number
}

export interface EstimateResult {
  weightG:      number       // grams
  printTimeSec: number       // seconds
  printTimeMin: number       // minutes (kept for backward compat)
  pricePerPc:   number       // THB per piece
  materialCost: number       // filament cost per pc
  machineCost:  number       // machine time cost per pc
  shippingCost: number       // flat shipping fee (total)
  subtotal:     number       // price of all pieces (before shipping)
  totalPrice:   number       // subtotal + shippingCost
  /** PLA/PETG weight pricing: base THB per gram (the first 250 g); null for other materials */
  ratePerGram?: number | null
  /** total grams for the whole order (weightG × quantity) */
  totalWeightG?: number
  /** how many ฿59 units to order in the Shopee service listing (= subtotal ÷ 59, rounded up) */
  shopeeUnits?: number
}

// ─── PLA / PETG: simple per-gram price ────────────────────────────────────────
// tiered by the order's total grams: the first 250 g at 3 ฿/g, every gram above that at 1.5 ฿/g
export const FLAT_RATE_MATERIALS: Material[] = ["PLA", "PETG"]
export const FLAT_RATE = { perG: 3, bulkPerG: 1.5, bulkFromG: 250 }
/** price of one unit of the Shopee "3D print service" listing */
export const SHOPEE_UNIT_PRICE = 59

const g1 = (g: number) => Math.round(g * 10) / 10

/** Grams charged at each rate for an order of totalGrams. */
export function flatRateTiers(totalGrams: number): { grams: number; perG: number }[] {
  const g = g1(Math.max(0, totalGrams))
  const first = Math.min(g, FLAT_RATE.bulkFromG)
  const rest = g1(Math.max(0, g - FLAT_RATE.bulkFromG))
  return rest > 0
    ? [{ grams: first, perG: FLAT_RATE.perG }, { grams: rest, perG: FLAT_RATE.bulkPerG }]
    : [{ grams: first, perG: FLAT_RATE.perG }]
}

/** "250 g × 3 ฿ + 47.6 g × 1.5 ฿" */
export function flatRateFormula(totalGrams: number): string {
  return flatRateTiers(totalGrams).map(t => `${t.grams.toLocaleString()} g × ${t.perG} ฿`).join(" + ")
}

/** PLA/PETG order price from the total grams of every piece in the order. */
export function flatRateOrder(totalWeightG: number) {
  const raw = flatRateTiers(totalWeightG).reduce((sum, t) => sum + t.grams * t.perG, 0)
  const subtotal = Math.max(MINIMUM_PRICE_PER_PC, Math.ceil(Math.round(raw * 100) / 100))
  return { ratePerGram: FLAT_RATE.perG, subtotal, shopeeUnits: shopeeUnitsFor(subtotal) }
}

/** Units to order in the ฿59 Shopee listing so the paid total covers the price. */
export function shopeeUnitsFor(price: number): number {
  return Math.max(1, Math.ceil(Math.round(price * 100) / 100 / SHOPEE_UNIT_PRICE))
}

// ─── Pricing tables ───────────────────────────────────────────────────────────

// g/cm³
const DENSITY: Record<Material, number> = {
  PLA:         1.24,
  PETG:        1.27,
  ABS:         1.04,
  ASA:         1.07,
  TPU:         1.20,
  CarbonFiber: 1.40,
  Nylon:       1.15,
}

// THB per gram of filament
const PRICE_PER_GRAM: Record<Material, number> = {
  PLA:         2.5,
  PETG:        3.0,
  ABS:         3.0,
  ASA:         4.0,
  TPU:         4.0,
  CarbonFiber: 8.0,
  Nylon:       12.0,
}

// Minimum order per piece (covers electricity, machine time & handling)
const MINIMUM_PRICE_PER_PC = 59

// THB per hour of machine time
const MACHINE_RATE: Record<Technology, number> = {
  FDM: 45,
}

// Print speed factor per layer height (lower = slower = finer)
const LAYER_SPEED: Record<number, number> = {
  0.08: 0.50,  // Fine   — slowest
  0.16: 1.00,  // Normal — baseline
  0.24: 1.60,  // Coarse
  0.40: 2.50,  // 0.4 mm — the shop's standard (thicker layers, fewer of them)
}

// Print time per cm³ of plastic at the shop's 0.4 setting. Calibrated on EggPuzzle.3mf:
// Bambu Studio says 13h12m (792 min) for 284.8 cm³ printed → 2.78 min/cm³
// (includes heating, travel and plate changes on average).
export const MIN_PER_CM3 = 792 / 284.8

// Shipping cost (THB)
const SHIPPING_COST: Record<Shipping, number> = {
  pickup: 0,
  postal: 45,
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Clamp model dimensions to build volume limits */
export function clampDimensions(dims: { x: number; y: number; z: number }) {
  return {
    x: Math.min(Math.max(dims.x, BUILD_MIN.x), BUILD_MAX.x),
    y: Math.min(Math.max(dims.y, BUILD_MIN.y), BUILD_MAX.y),
    z: Math.min(Math.max(dims.z, BUILD_MIN.z), BUILD_MAX.z),
  }
}

/** Check if dimensions fit in the build volume */
export function fitsInBuildVolume(dims: { x: number; y: number; z: number }): boolean {
  return dims.x <= BUILD_MAX.x && dims.y <= BUILD_MAX.y && dims.z <= BUILD_MAX.z
}

// ─── Printed volume ───────────────────────────────────────────────────────────

/** Walls + top/bottom shell thickness (mm). 2 walls with a 0.4 mm nozzle ≈ 0.9 mm;
 *  calibrated so EggPuzzle.3mf matches Bambu Studio (358 g at 15% infill). */
export const SHELL_MM = 0.9

/** Plastic a slicer would lay down: a solid shell over the surface + infill% of the inside. */
export function printedVolumeCm3(solidCm3: number, surfaceCm2: number, infillPct: number): number {
  const shell = Math.min(solidCm3, surfaceCm2 * (SHELL_MM / 10))
  return shell + (solidCm3 - shell) * (infillPct / 100)
}

// ─── Core calculator ──────────────────────────────────────────────────────────

export function calculate(input: EstimateInput): EstimateResult {
  const {
    volumeCm3, technology, material,
    infill, layerHeight, quantity, shipping, isAnyColor
  } = input

  // --- Volume of plastic ---
  // With the mesh's real volume + surface: shell + infill (matches slicers).
  // Without (old callers / STEP): 20% of the bounding volume as shell + infill of the rest.
  const { meshVolumeCm3, surfaceCm2 } = input
  const actualVolume = meshVolumeCm3 && meshVolumeCm3 > 0 && surfaceCm2 && surfaceCm2 > 0
    ? printedVolumeCm3(meshVolumeCm3, surfaceCm2, infill)
    : volumeCm3 * 0.20 + volumeCm3 * 0.80 * (infill / 100)

  // --- Weight ---
  const weightG = Math.round(actualVolume * DENSITY[material] * 10) / 10

  // --- Print time ---
  // Base time: proportional to actual volume + layer height factor
  // Formula: (actualVolume / speed_constant) / LAYER_SPEED × 60  → seconds
  // unknown heights fall back to "proportional to layer height" instead of NaN
  const speed         = LAYER_SPEED[layerHeight] ?? Math.max(0.25, layerHeight / 0.16)
  const baseMinutes   = actualVolume * MIN_PER_CM3 * (LAYER_SPEED[0.4] / speed)
  const printTimeSec  = Math.round(baseMinutes * 60)
  const printTimeMin  = Math.round(baseMinutes)

  // --- PLA / PETG: grams × rate for the whole order ---
  if (FLAT_RATE_MATERIALS.includes(material)) {
    const q = Math.max(1, Math.round(quantity))
    const totalWeightG = Math.round(weightG * q * 10) / 10
    const { ratePerGram, subtotal, shopeeUnits } = flatRateOrder(totalWeightG)
    const shippingCost = SHIPPING_COST[shipping]
    return {
      weightG, printTimeSec, printTimeMin,
      pricePerPc: Math.round((subtotal / q) * 100) / 100,
      materialCost: subtotal, machineCost: 0,
      shippingCost, subtotal, totalPrice: subtotal + shippingCost,
      ratePerGram, totalWeightG, shopeeUnits,
    }
  }

  // --- Material cost ---
  let pricePerGram = PRICE_PER_GRAM[material] ?? 2.0
  if (isAnyColor) pricePerGram = Math.max(1.0, pricePerGram - 0.5) // slight discount for any-color
  const materialCost = Math.round(weightG * pricePerGram)

  // --- Machine cost ---
  const machineCost = Math.round((baseMinutes / 60) * MACHINE_RATE[technology])

  // --- Per-piece price: (material + machine) × 0.90 (10% discount), minimum ฿59/pc ---
  const PRICE_FACTOR = 0.90
  const pricePerPc = Math.max(MINIMUM_PRICE_PER_PC, Math.round((materialCost + machineCost) * PRICE_FACTOR))

  // --- Totals ---
  const shippingCost = SHIPPING_COST[shipping]
  const subtotal     = pricePerPc * quantity
  const totalPrice   = subtotal + shippingCost

  return {
    ratePerGram: null,
    totalWeightG: Math.round(weightG * quantity * 10) / 10,
    shopeeUnits: shopeeUnitsFor(subtotal),
    weightG,
    printTimeSec,
    printTimeMin,
    pricePerPc,
    materialCost,
    machineCost,
    shippingCost,
    subtotal,
    totalPrice,
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Format seconds → "1h 32m 20s" (Chalawan-style) */
export function formatTimeFull(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

/** Format minutes → "1h 32m" (short, for backward compat) */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
