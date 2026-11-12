import { NextRequest, NextResponse } from "next/server"
import { db, SheetsNotConfigured } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

// POST /api/consent { necessary, analytics, marketing } → one row in the "Consent" tab (PDPA log).
export async function POST(req: NextRequest) {
  let b: any
  try { b = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  try {
    await db.consent.add({
      necessary: true, analytics: b?.analytics === true, marketing: b?.marketing === true,
      user_agent: String(req.headers.get("user-agent") || "").slice(0, 300),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (!(e instanceof SheetsNotConfigured)) console.error("consent log", e)
    return NextResponse.json({ ok: false }, { status: 202 }) // logging is best-effort; never bother the visitor
  }
}
