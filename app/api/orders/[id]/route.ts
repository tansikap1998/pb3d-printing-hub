import { NextRequest, NextResponse } from "next/server"
import { isUuid } from "@/lib/orderInput"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

/** "0812345678" → "081-xxx-5678": enough for the customer to recognise, not useful to anyone else. */
function maskPhone(p: string) {
  const d = String(p || "").replace(/\D/g, "")
  return d.length >= 7 ? `${d.slice(0, 3)}-xxx-${d.slice(-4)}` : ""
}

// GET /api/orders/:id → what the checkout page needs: the order summary, with the
// customer's name and a masked phone only (no address, email or full phone).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const o = await db.orders.get(params.id)
    if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(
      { order: {
        id: o.id, status: o.status, total_price: o.total_price, created_at: o.created_at, has_slip: !!o.slip_file_id,
        customer_name: o.customer_name, customer_phone_masked: maskPhone(o.customer_phone),
        file_name: o.file_name, material: o.material, color: o.color, quantity: o.quantity,
        infill: o.infill, layer_height: o.layer_height, notes: o.notes,
      } },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e) {
    return backendErrorResponse(e, "get order")
  }
}
