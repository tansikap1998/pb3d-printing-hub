import { NextResponse } from "next/server"
import { backendMode, rpc, DEFAULT_WEBHOOK_URL } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

// GET /api/health → is the Google Sheets backend reachable, and with which settings?
// Shows only non-secret facts: which URL is used and how long the secret is,
// never the secret itself.
export async function GET() {
  const envUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  const url = envUrl ?? DEFAULT_WEBHOOK_URL
  const rawSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ?? ""
  const usedSecret = rawSecret.trim().replace(/^["']|["']$/g, "").trim()
  const deploymentId = url.match(/\/macros\/s\/([^/]+)\/exec/)?.[1] ?? ""

  let ping: { ok: boolean; error?: string }
  try {
    await rpc("ping", {}, { timeoutMs: 10000 })
    ping = { ok: true }
  } catch (e) {
    ping = { ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) }
  }

  return NextResponse.json({
    backend: backendMode(),
    webhookUrl: {
      source: envUrl !== undefined ? "GOOGLE_SHEETS_WEBHOOK_URL (Vercel)" : "default in code",
      deployment: deploymentId ? `${deploymentId.slice(0, 10)}…${deploymentId.slice(-6)}` : "(not an Apps Script /exec URL)",
      isDefault: url === DEFAULT_WEBHOOK_URL,
    },
    secret: {
      set: usedSecret.length > 0,
      length: usedSecret.length,
      trimmedFromLength: rawSecret.length !== usedSecret.length ? rawSecret.length : undefined,
    },
    adminPasswordSet: !!process.env.ADMIN_PASSWORD,
    ping,
  }, { headers: { "Cache-Control": "no-store" } })
}
