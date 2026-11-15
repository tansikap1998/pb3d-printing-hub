import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminRequest } from "@/lib/adminSession"
import { db, backendErrorResponse, nowBangkok } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

const TEXT_MAX = 5000
const isOldScript = (e: unknown) => /unknown action/.test(String((e as Error)?.message ?? ""))

// POST { product } → saves/updates one row of the "PB3D Product 2027" tab
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  const p = body?.product
  if (!p || typeof p !== "object" || typeof p.id !== "string" || !/^[\w-]{6,64}$/.test(p.id))
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })

  // keep only plain values, trimmed to a sane length
  const clean: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(p)) {
    if (!/^[a-z_]{1,40}$/.test(k)) continue
    if (typeof v === "number") clean[k] = Number.isFinite(v) ? v : null
    else if (typeof v === "string") clean[k] = v.slice(0, TEXT_MAX)
    else if (v === null) clean[k] = null
  }
  const session = await getServerSession(authOptions)
  clean.saved_at = nowBangkok()
  clean.saved_by = session?.user?.email ?? ""

  try {
    const updated = await db.catalog.save(clean)
    return NextResponse.json({ ok: true, updated })
  } catch (e) {
    if (isOldScript(e))
      return NextResponse.json({ error: "Apps Script ยังเป็นเวอร์ชันเก่า: วาง Code.gs ใหม่แล้ว Deploy → New version" }, { status: 409 })
    return backendErrorResponse(e, "catalog save")
  }
}
