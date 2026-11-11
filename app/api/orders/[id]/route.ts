import { NextRequest, NextResponse } from "next/server"
import { isUuid } from "@/lib/orderInput"
import { supabaseAdmin, hasServiceRole } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

// GET /api/orders/:id → what the checkout page needs. No customer personal data.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!hasServiceRole) return NextResponse.json({ error: "Order service is not configured" }, { status: 503 })
  const { data, error } = await supabaseAdmin()
    .from("orders").select("id, status, total_price, created_at, slip_url").eq("id", params.id).maybeSingle()
  if (error) {
    console.error("get order", error)
    return NextResponse.json({ error: "โหลดคำสั่งซื้อไม่สำเร็จ" }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(
    { order: { id: data.id, status: data.status, total_price: data.total_price, created_at: data.created_at, has_slip: !!data.slip_url } },
    { headers: { "Cache-Control": "no-store" } }
  )
}
