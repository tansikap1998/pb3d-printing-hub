import { NextRequest, NextResponse } from "next/server"
import { validateProductInput } from "@/lib/shopee"
import { updateProduct, deleteProduct } from "@/lib/shopeeStore"
import { isAdminRequest } from "@/lib/adminSession"
import { backendErrorResponse } from "@/lib/sheetsDb"

export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const v = validateProductInput(body, { partial: true })
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const product = await updateProduct(params.id, v.value)
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ product })
  } catch (e) {
    return backendErrorResponse(e, "shopee-products PATCH")
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const ok = await deleteProduct(params.id)
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return backendErrorResponse(e, "shopee-products DELETE")
  }
}
