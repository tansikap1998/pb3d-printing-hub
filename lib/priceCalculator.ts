export type Technology = "FDM" | "RESIN"
export type Material = "PLA" | "ABS" | "PETG" | "ASA" | "TPU" | "Resin Standard" | "CarbonFiber" | "Nylon"
export type InfillLevel = 10 | 25 | 50 | 80
export type LayerHeight = 0.12 | 0.16 | 0.20 | 0.28

export interface EstimateInput {
  volumeCm3: number
  technology: Technology
  material: Material
  infill: InfillLevel
  layerHeight: LayerHeight
  quantity: number
  isAnyColor?: boolean
}

export interface EstimateResult {
  weightG: number
  printTimeMin: number
  pricePerPc: number
  totalPrice: number
}

const DENSITY: Record<Material, number> = {
  PLA: 1.24, ABS: 1.04, PETG: 1.27,
  ASA: 1.07, TPU: 1.20, "Resin Standard": 1.10,
  CarbonFiber: 1.40, Nylon: 1.15,
}

const PRICE_PER_GRAM: Record<Material, number> = {
  PLA: 1.5, ABS: 1.8, PETG: 2.0,
  ASA: 2.2, TPU: 2.8, "Resin Standard": 3.5,
  CarbonFiber: 5.0, Nylon: 4.5,
}

const MACHINE_RATE: Record<Technology, number> = { FDM: 40, RESIN: 60 }

const LAYER_TIME_FACTOR: Record<number, number> = {
  0.12: 1.5, 0.16: 1.0, 0.20: 0.75, 0.28: 0.55,
}

export function calculate(input: EstimateInput): EstimateResult {
  const { volumeCm3, technology, material, infill, layerHeight, quantity, isAnyColor } = input
  const shellVolume = volumeCm3 * 0.15
  const infillVolume = (volumeCm3 - shellVolume) * (infill / 100)
  const actualVolume = shellVolume + infillVolume
  const weightG = Math.round(actualVolume * DENSITY[material] * 10) / 10
  const basePrintMin = (volumeCm3 / 2) * (infill / 25)
  const printTimeMin = Math.round(basePrintMin * LAYER_TIME_FACTOR[layerHeight])
  let materialPrice = PRICE_PER_GRAM[material] || 0
  if (isAnyColor) materialPrice = Math.max(0.5, materialPrice - 2)

  const filamentPrice = weightG * materialPrice
  const machineCost = (printTimeMin / 60) * MACHINE_RATE[technology]
  const pricePerPc = Math.round((filamentPrice + machineCost) * 1.2)
  return { weightG, printTimeMin, pricePerPc, totalPrice: pricePerPc * quantity }
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return h + "h " + m + "m"
  if (h > 0) return h + "h"
  return m + "m"
}
