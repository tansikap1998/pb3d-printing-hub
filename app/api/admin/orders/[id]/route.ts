import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { ORDER_STATUSES, isUuid } from "@/lib/orderInput"
import { db, nowBangkok, backendErrorResponse } from "@/lib/sheetsDb"
import { notifyCustomer, requestOrigin } from "@/lib/notify"

export const dynamic = "force-dynamic"

const STATUSES: readonly string[] = ORDER_STATUSES

// PATCH /api/admin/orders/:id  { status?, trackingNumber?, totalPrice?, shopNote?, expectedDate? }
// Confirming a quote = { status: "pending", totalPrice } on a "reviewing" order. The customer
// gets an e-mail whenever the status changes.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const patch: Record<string, string | number> = {}
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    patch.status = body.status
  }
  if (body.trackingNumber !== undefined) {
    patch.tracking_number = body.trackingNumber === null ? "" : String(body.trackingNumber).trim().slice(0, 100)
  }
  if (body.totalPrice !== undefined) {
    const p = Number(body.totalPrice)
    if (!(p > 0) || p > 1_000_000) return NextResponse.json({ error: "ราคาไม่ถูกต้อง" }, { status: 400 })
    patch.total_price = Math.round(p * 100) / 100
  }
  if (body.shopNote !== undefined) patch.shop_note = String(body.shopNote ?? "").trim().slice(0, 1000)
  if (body.expectedDate !== undefined) {
    if (body.expectedDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.expectedDate)) return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 })
    patch.expected_date = body.expectedDate || ""
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  try {
    const before = await db.orders.get(params.id)
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (patch.status === "shipped" && before.shipping_method !== "pickup") {
      // parcels always need a tracking number: the one sent now, or the one already stored.
      // An explicitly empty/null value counts as "none" rather than skipping the check.
      const tracking = body.trackingNumber === undefined ? before.tracking_number : patch.tracking_number
      if (!tracking) return NextResponse.json({ error: "กรุณากรอกเลขพัสดุก่อน" }, { status: 400 })
    }
    // a changed price is shown to the customer as its own line under the estimate
    if (patch.total_price !== undefined && Number(patch.total_price) !== Number(before.total_price)) {
      let items: any[] = []
      try { items = JSON.parse(before.price_items || "[]") } catch {}
      items = items.filter(i => i?.key !== "adjust")
      const est = Number(before.estimate_price ?? before.total_price) || 0
      const diff = Math.round((Number(patch.total_price) - est) * 100) / 100
      if (diff !== 0) items.push({ key: "adjust", label: "ปรับราคาหลังตรวจไฟล์", detail: diff > 0 ? "ร้านปรับเพิ่ม" : "ร้านปรับลด", amount: diff })
      patch.price_items = JSON.stringify(items)
    }
    patch.updated_at = nowBangkok()
    const r = await db.orders.update(params.id, patch as any)
    if (!r.order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (patch.status && patch.status !== before.status) await notifyCustomer(r.order, requestOrigin(req))
    return NextResponse.json({ ok: true, order: { status: r.order.status, total_price: r.order.total_price } })
  } catch (e) {
    return backendErrorResponse(e, "admin update order")
  }
}
