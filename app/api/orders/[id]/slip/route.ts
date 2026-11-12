import { NextRequest, NextResponse } from "next/server"
import { isUuid, validateSlip } from "@/lib/orderInput"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST /api/orders/:id/slip (multipart, field "file").
// Only allowed while the order is waiting for payment. The file is saved to a
// private Google Drive folder under a new name, so earlier uploads are never overwritten.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let file: File | null = null
  try {
    const f = (await req.formData()).get("file")
    file = f instanceof File ? f : null
  } catch { return NextResponse.json({ error: "Invalid upload" }, { status: 400 }) }
  const v = validateSlip(file)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  try {
    const base64 = Buffer.from(await file!.arrayBuffer()).toString("base64")
    const r = await db.orders.submitSlip(params.id, { base64, mimeType: file!.type, ext: v.ext })
    if (r.conflict) return NextResponse.json({ error: "คำสั่งซื้อนี้ไม่ได้รอการชำระเงินแล้ว" }, { status: 409 })
    if (!r.order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return backendErrorResponse(e, "submit slip")
  }
}
