import { NextRequest, NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { isUuid } from "@/lib/orderInput"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// GET /api/admin/orders/:id/slip → the payment slip file (admin only).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isUuid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const slip = await db.orders.slip(params.id)
    if (!slip) return NextResponse.json({ error: "ไม่มีสลิป" }, { status: 404 })
    return new NextResponse(Buffer.from(slip.base64, "base64"), {
      headers: {
        "Content-Type": slip.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(slip.name || "slip")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (e) {
    return backendErrorResponse(e, "admin get slip")
  }
}
