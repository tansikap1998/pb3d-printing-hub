import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { validateNewOrder } from "@/lib/orderInput"
import { db, nowBangkok, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

// POST /api/orders → { id }. The order id (a random UUID) is only ever returned to
// the customer who created it; it is what lets them open /checkout/<id> later.
export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const v = validateNewOrder(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const order = await db.orders.create({ ...(v.row as any), id: randomUUID(), created_at: nowBangkok() })
    return NextResponse.json({ id: order.id }, { status: 201 })
  } catch (e) {
    return backendErrorResponse(e, "create order")
  }
}
