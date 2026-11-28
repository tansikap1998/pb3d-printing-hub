import { NextRequest, NextResponse } from "next/server"
import { isUuid } from "@/lib/orderInput"
import { db, nowBangkok, backendErrorResponse } from "@/lib/sheetsDb"
import { notifyShop, orderNo, requestOrigin } from "@/lib/notify"

export const dynamic = "force-dynamic"

// POST /api/orders/:id/shopee { shopeeRef } — the customer paid through the shop's
// ฿59 Shopee listing instead of PromptPay. Only while the order is waiting for payment.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await req.json().catch(() => null)
  const ref = String(body?.shopeeRef ?? "").trim().slice(0, 100)
  if (ref.length < 4) return NextResponse.json({ error: "กรุณากรอกเลขคำสั่งซื้อ Shopee" }, { status: 400 })
  try {
    const r = await db.orders.update(params.id,
      { status: "awaiting_verification", payment_method: "shopee", shopee_ref: ref, updated_at: nowBangkok() },
      ["pending", "awaiting_verification"])
    if (r.conflict) return NextResponse.json({ error: "คำสั่งซื้อนี้ยังไม่ได้รอการชำระเงิน" }, { status: 409 })
    if (!r.order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await notifyShop(`แจ้งชำระผ่าน Shopee #${orderNo(params.id)}`, `<p>${r.order.customer_name} สั่งผ่าน Shopee เลขคำสั่งซื้อ <b>${ref.replace(/[<>&]/g, "")}</b></p>`,
      { href: `${requestOrigin(req)}/admin`, label: "ตรวจสอบ" })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return backendErrorResponse(e, "shopee payment")
  }
}
