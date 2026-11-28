import { NextRequest, NextResponse } from "next/server"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "")

// POST /api/orders/track { orderNo, phone } → { id } — lets customers find their order
// with the short order number (first 8 characters) and the phone number they used.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const no = String(body?.orderNo ?? "").trim().replace(/^#/, "").toLowerCase()
  const phone = digits(body?.phone)
  if (!/^[0-9a-f]{8}/.test(no) || phone.length < 9) return NextResponse.json({ error: "กรอกเลขคำสั่งซื้อ (8 ตัว) และเบอร์โทรให้ถูกต้อง" }, { status: 400 })
  try {
    const orders = await db.orders.list()
    const o = orders.find(x => x.id.toLowerCase().startsWith(no.slice(0, 8)) && digits(x.customer_phone).endsWith(phone.slice(-9)))
    if (!o) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ ตรวจเลขคำสั่งซื้อและเบอร์โทรอีกครั้ง" }, { status: 404 })
    return NextResponse.json({ id: o.id })
  } catch (e) {
    return backendErrorResponse(e, "track order")
  }
}
