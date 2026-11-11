import { NextRequest, NextResponse } from "next/server"
import { isUuid, validateSlip } from "@/lib/orderInput"
import { supabaseAdmin, hasServiceRole } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const BUCKET = "payment_slips"

// POST /api/orders/:id/slip (multipart, field "file").
// Only allowed while the order is waiting for payment; the file goes to a
// private bucket under a fresh name, so earlier uploads are never overwritten.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!hasServiceRole) return NextResponse.json({ error: "Order service is not configured" }, { status: 503 })

  let file: File | null = null
  try {
    const f = (await req.formData()).get("file")
    file = f instanceof File ? f : null
  } catch { return NextResponse.json({ error: "Invalid upload" }, { status: 400 }) }
  const v = validateSlip(file)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const db = supabaseAdmin()
  const { data: order, error: getErr } = await db.from("orders").select("id, status").eq("id", params.id).maybeSingle()
  if (getErr) { console.error("slip: get order", getErr); return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 }) }
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (order.status !== "pending" && order.status !== "awaiting_verification")
    return NextResponse.json({ error: "คำสั่งซื้อนี้ไม่ได้รอการชำระเงินแล้ว" }, { status: 409 })

  const path = `${params.id}/${Date.now()}.${v.ext}`
  const { error: upErr } = await db.storage.from(BUCKET)
    .upload(path, Buffer.from(await file!.arrayBuffer()), { contentType: file!.type, upsert: false })
  if (upErr) { console.error("slip: upload", upErr); return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 }) }

  // Only move forward from the two payment states (guards against a race with an admin update)
  const { data: upd, error: updErr } = await db.from("orders")
    .update({ status: "awaiting_verification", slip_url: path })
    .eq("id", params.id).in("status", ["pending", "awaiting_verification"]).select("id").maybeSingle()
  if (updErr) { console.error("slip: update order", updErr); return NextResponse.json({ error: "อัปโหลดไม่สำเร็จ" }, { status: 500 }) }
  if (!upd) return NextResponse.json({ error: "คำสั่งซื้อนี้ไม่ได้รอการชำระเงินแล้ว" }, { status: 409 })
  return NextResponse.json({ ok: true })
}
