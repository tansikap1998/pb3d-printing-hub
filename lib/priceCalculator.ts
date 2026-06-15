// ─── Types ────────────────────────────────────────────────────────────────────

export type Technology  = "FDM"
export type FDMMaterial = "PLA" | "PETG" | "ABS" | "ASA" | "TPU"
export type Material    = FDMMaterial
export type InfillLevel = 10 | 25 | 50 | 80
export type LayerHeight = 0.08 | 0.16 | 0.24
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
}

export interface EstimateResult {
  weightG:      number       // grams
  printTimeSec: number       // seconds
  printTimeMin: number       // minutes (kept for backward compat)
  pricePerPc:   number       // THB per piece
  materialCost: number       // filament cost per pc
  machineCost:  number       // machine time cost per pc
  shippingCost: number       // flat shipping fee (total)
  subtotal:     number       // pricePerPc × quantity
  totalPrice:   number       // subtotal + shippingCost
}

// ─── Pricing tables ───────────────────────────────────────────────────────────

// g/cm³
const DENSITY: Record<Material, number> = {
  PLA:  1.24,
  PETG: 1.27,
  ABS:  1.04,
  ASA:  1.07,
  TPU:  1.20,
}

// THB per gram of filament (PB3D balanced pricing)
const PRICE_PER_GRAM: Record<Material, number> = {
  PLA:  3.5,
  PETG: 4.5,
  ABS:  4.0,
  ASA:  5.0,
  TPU:  6.0,
}

// Minimum order per piece (covers electricity, machine time & handling)
const MINIMUM_PRICE_PER_PC = 100

// THB per hour of machine time
const MACHINE_RATE: Record<Technology, number> = {
  FDM: 45,
}

// Print speed factor per layer height (lower = slower = finer)
const LAYER_SPEED: Record<number, number> = {
  0.08: 0.50,  // Fine   — slowest
  0.16: 1.00,  // Normal — baseline
  0.24: 1.60,  // Coarse — fastest
}

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

// ─── Core calculator ──────────────────────────────────────────────────────────

export function calculate(input: EstimateInput): EstimateResult {
  const {
    volumeCm3, technology, material,
    infill, layerHeight, quantity, shipping, isAnyColor
  } = input

  // --- Volume breakdown ---
  // Shell wall = 20% of bounding volume, always solid
  const shellVolume  = volumeCm3 * 0.20
  const innerVolume  = (volumeCm3 - shellVolume) * (infill / 100)
  const actualVolume = shellVolume + innerVolume   // cm³ of material used

  // --- Weight ---
  const weightG = Math.round(actualVolume * DENSITY[material] * 10) / 10

  // --- Print time ---
  // Base time: proportional to actual volume + layer height factor
  // Formula: (actualVolume / speed_constant) / LAYER_SPEED × 60  → seconds
  const baseMinutes   = (actualVolume / 1.8) / LAYER_SPEED[layerHeight]
  const printTimeSec  = Math.round(baseMinutes * 60)
  const printTimeMin  = Math.round(baseMinutes)

  // --- Material cost ---
  let pricePerGram = PRICE_PER_GRAM[material] ?? 2.0
  if (isAnyColor) pricePerGram = Math.max(1.0, pricePerGram - 0.5) // slight discount for any-color
  const materialCost = Math.round(weightG * pricePerGram)

  // --- Machine cost ---
  const machineCost = Math.round((baseMinutes / 60) * MACHINE_RATE[technology])

  // --- Per-piece price with markup (20%) + minimum order ฿100 ---
  const pricePerPc = Math.max(MINIMUM_PRICE_PER_PC, Math.round((materialCost + machineCost) * 1.20))

  // --- Totals ---
  const shippingCost = SHIPPING_COST[shipping]
  const subtotal     = pricePerPc * quantity
  const totalPrice   = subtotal + shippingCost

  return {
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
