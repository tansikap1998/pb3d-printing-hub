import { NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { supabaseAdmin, hasServiceRole } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const BUCKET = "payment_slips"
const SIGNED_URL_TTL = 60 * 60 // 1 hour

// GET /api/admin/orders → every order, with a short-lived link to each private slip.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!hasServiceRole) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์" }, { status: 503 })
  const db = supabaseAdmin()
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false })
  if (error) { console.error("admin list orders", error); return NextResponse.json({ error: "โหลดไม่สำเร็จ" }, { status: 500 }) }

  // slip_url holds a storage path (new uploads) or, for orders from before the bucket
  // became private, a public URL ".../object/public/payment_slips/<path>".
  const toPath = (v: string | null): string | null => {
    if (!v) return null
    const m = v.match(/\/storage\/v1\/object\/public\/payment_slips\/(.+)$/)
    if (m) return decodeURIComponent(m[1].split("?")[0])
    return /^https?:\/\//.test(v) ? null : v
  }
  const paths = Array.from(new Set(data.map(o => toPath(o.slip_url)).filter((p): p is string => !!p)))
  const signed = new Map<string, string>()
  if (paths.length) {
    const { data: urls } = await db.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    for (const u of urls || []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }
  const orders = data.map(o => {
    const p = toPath(o.slip_url)
    return { ...o, slip_url: p ? signed.get(p) ?? null : null }
  })
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } })
}
