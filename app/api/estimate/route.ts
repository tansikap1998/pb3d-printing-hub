import { NextRequest, NextResponse } from "next/server"
import { calculate } from "@/lib/priceCalculator"
import type { EstimateInput } from "@/lib/priceCalculator"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      volumeCm3, dimensions, technology, material,
      infill, layerHeight, quantity, shipping, isAnyColor
    } = body

    if (!volumeCm3 || !technology || !material || !infill || !layerHeight || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const input: EstimateInput = {
      volumeCm3,
      dimensions: dimensions ?? { x: 0, y: 0, z: 0 },
      technology,
      material,
      infill,
      layerHeight,
      quantity,
      shipping: shipping ?? "pickup",
      isAnyColor: isAnyColor ?? false,
    }

    const result = calculate(input)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
