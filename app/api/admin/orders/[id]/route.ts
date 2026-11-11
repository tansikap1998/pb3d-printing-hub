import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { supabaseAdmin, hasServiceRole } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const STATUSES = ["pending", "awaiting_verification", "confirmed", "printing", "shipped", "delivered", "cancelled"]

// PATCH /api/admin/orders/:id  { status?, trackingNumber? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!hasServiceRole) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์" }, { status: 503 })
  }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const upd: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    upd.status = body.status
  }
  if (body.trackingNumber !== undefined) {
    const t = body.trackingNumber === null ? null : String(body.trackingNumber).trim().slice(0, 100) || null
    upd.tracking_number = t
  }
  if (upd.status === "shipped" && !upd.tracking_number && body.trackingNumber === undefined) {
    // allow shipping only when a tracking number already exists on the order
    const { data } = await supabaseAdmin().from("orders").select("tracking_number").eq("id", params.id).maybeSingle()
    if (!data?.tracking_number) return NextResponse.json({ error: "กรุณากรอกเลขพัสดุก่อน" }, { status: 400 })
  }
  if (Object.keys(upd).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  const { data, error } = await supabaseAdmin().from("orders").update(upd).eq("id", params.id).select("id").maybeSingle()
  if (error) {
    console.error("admin order update", error)
    return NextResponse.json({ error: "อัปเดตไม่สำเร็จ" }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
