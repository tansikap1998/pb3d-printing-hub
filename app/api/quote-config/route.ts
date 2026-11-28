import { NextResponse } from "next/server"
import { getQuoteConfig, publicQuoteConfig } from "@/lib/quoteConfigServer"

export const dynamic = "force-dynamic"

// GET /api/quote-config → rates, materials, colours, add-ons… for the upload/quote pages
export async function GET() {
  const { cfg } = await getQuoteConfig()
  return NextResponse.json({ config: publicQuoteConfig(cfg) }, { headers: { "Cache-Control": "public, max-age=30" } })
}
