import { NextRequest, NextResponse } from "next/server"
import generatePayload from "promptpay-qr"
import QRCode from "qrcode"
import { isUuid } from "@/lib/orderInput"
import { db, backendErrorResponse } from "@/lib/sheetsDb"
import { getQuoteConfig } from "@/lib/quoteConfigServer"

export const dynamic = "force-dynamic"

// GET /api/orders/:id/promptpay → { svg, amount } — a PromptPay QR for the confirmed price.
// The amount always comes from the order on the server, never from the browser.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const [{ cfg }, o] = await Promise.all([getQuoteConfig(), db.orders.get(params.id)])
    if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!cfg.payment.promptpayId) return NextResponse.json({ error: "ร้านยังไม่ได้ตั้งค่า PromptPay" }, { status: 404 })
    if (o.status !== "pending" && o.status !== "awaiting_verification")
      return NextResponse.json({ error: "คำสั่งซื้อนี้ยังไม่พร้อมชำระเงิน" }, { status: 409 })
    const amount = Number(o.total_price)
    const svg = await QRCode.toString(generatePayload(cfg.payment.promptpayId, { amount }), { type: "svg", margin: 1, width: 240 })
    return NextResponse.json({ svg, amount }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    return backendErrorResponse(e, "promptpay qr")
  }
}
