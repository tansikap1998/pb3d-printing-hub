import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { db, backendErrorResponse, SheetsNotConfigured } from "@/lib/sheetsDb"
import { sanitizeQuoteConfig } from "@/lib/quoteConfig"
import { getQuoteConfig, clearQuoteConfigCache, QUOTE_CONFIG_KEY } from "@/lib/quoteConfigServer"

export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { cfg, source } = await getQuoteConfig({ fresh: true })
  return NextResponse.json({ config: cfg, source }, { headers: { "Cache-Control": "no-store" } })
}

// PUT { config } → saved (cleaned) config
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  const config = sanitizeQuoteConfig(body?.config)
  try {
    await db.settings.set(QUOTE_CONFIG_KEY, JSON.stringify(config))
    clearQuoteConfigCache()
    return NextResponse.json({ ok: true, config })
  } catch (e) {
    if (e instanceof SheetsNotConfigured) return backendErrorResponse(e, "quote config")
    return backendErrorResponse(e, "quote config save")
  }
}
