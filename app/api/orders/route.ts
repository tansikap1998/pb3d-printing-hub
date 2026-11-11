import { NextRequest, NextResponse } from "next/server"
import { validateNewOrder } from "@/lib/orderInput"
import { supabaseAdmin, hasServiceRole } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

// POST /api/orders → { id }. The order id (a random UUID) is only ever returned to
// the customer who created it; it is what lets them open /checkout/<id> later.
export async function POST(req: NextRequest) {
  if (!hasServiceRole) return NextResponse.json({ error: "Order service is not configured" }, { status: 503 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const v = validateNewOrder(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const { data, error } = await supabaseAdmin().from("orders").insert(v.row).select("id").single()
  if (error) {
    console.error("create order", error)
    return NextResponse.json({ error: "สร้างคำสั่งซื้อไม่สำเร็จ" }, { status: 500 })
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}
