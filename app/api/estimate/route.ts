import { NextRequest, NextResponse } from "next/server"
import { calculate } from "@/lib/priceCalculator"
import type { EstimateInput } from "@/lib/priceCalculator"

export async function POST(req: NextRequest) {
  try {
    const body: EstimateInput = await req.json()
    const { volumeCm3, technology, material, infill, layerHeight, quantity } = body

    if (!volumeCm3 || !technology || !material || !infill || !layerHeight || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = calculate({ volumeCm3, technology, material, infill, layerHeight, quantity })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
