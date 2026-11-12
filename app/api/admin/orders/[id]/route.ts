import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { ORDER_STATUSES, isUuid } from "@/lib/orderInput"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

const STATUSES: readonly string[] = ORDER_STATUSES

// PATCH /api/admin/orders/:id  { status?, trackingNumber? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const patch: Record<string, string> = {}
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    patch.status = body.status
  }
  if (body.trackingNumber !== undefined) {
    patch.tracking_number = body.trackingNumber === null ? "" : String(body.trackingNumber).trim().slice(0, 100)
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  try {
    if (patch.status === "shipped") {
      // shipping always needs a tracking number: the one sent now, or the one already stored.
      // An explicitly empty/null value counts as "none" rather than skipping the check.
      let tracking: string | undefined = patch.tracking_number
      if (body.trackingNumber === undefined) tracking = (await db.orders.get(params.id))?.tracking_number
      if (!tracking) return NextResponse.json({ error: "กรุณากรอกเลขพัสดุก่อน" }, { status: 400 })
    }
    const r = await db.orders.update(params.id, patch)
    if (!r.order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return backendErrorResponse(e, "admin update order")
  }
}
