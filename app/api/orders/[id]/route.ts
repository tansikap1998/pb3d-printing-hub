import { NextRequest, NextResponse } from "next/server"
import { isUuid } from "@/lib/orderInput"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

// GET /api/orders/:id → what the checkout page needs. No customer personal data.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const o = await db.orders.get(params.id)
    if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(
      { order: { id: o.id, status: o.status, total_price: o.total_price, created_at: o.created_at, has_slip: !!o.slip_file_id } },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e) {
    return backendErrorResponse(e, "get order")
  }
}
