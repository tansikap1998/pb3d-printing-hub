import { NextRequest, NextResponse } from "next/server"
import { validateProductInput } from "@/lib/shopee"
import { listProducts, createProduct, storageMode } from "@/lib/shopeeStore"
import { isAdminRequest } from "@/lib/adminSession"

export const dynamic = "force-dynamic"

// GET /api/shopee-products          → active products (public)
// GET /api/shopee-products?all=1    → every product (admin only)
export async function GET(req: NextRequest) {
  const wantAll = req.nextUrl.searchParams.get("all") === "1"
  try {
    if (wantAll) {
      if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      return NextResponse.json({ products: await listProducts(), storage: storageMode })
    }
    return NextResponse.json(
      { products: await listProducts({ activeOnly: true }) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    )
  } catch (e) {
    console.error("shopee-products GET", e)
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  const v = validateProductInput(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const product = await createProduct(v.value as any)
    return NextResponse.json({ product }, { status: 201 })
  } catch (e) {
    console.error("shopee-products POST", e)
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 })
  }
}
