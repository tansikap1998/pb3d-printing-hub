import { NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminSession"
import { db, backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

// GET /api/admin/orders → every order, newest first. Slips are opened through
// /api/admin/orders/:id/slip (admin only), never through a public link.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const rows = await db.orders.list()
    const orders = rows.map(({ slip_file_id, ...o }) => ({ ...o, has_slip: !!slip_file_id }))
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    return backendErrorResponse(e, "admin list orders")
  }
}
