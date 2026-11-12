import { NextRequest, NextResponse } from "next/server"
import { validateProductInput } from "@/lib/shopee"
import { listProducts, createProduct, storageMode } from "@/lib/shopeeStore"
import { backendErrorResponse, SheetsNotConfigured } from "@/lib/sheetsDb"
import { isAdminRequest } from "@/lib/adminSession"

export const dynamic = "force-dynamic"

// GET /api/shopee-products          → active products (public)
// GET /api/shopee-products?all=1    → every product (admin only)
export async function GET(req: NextRequest) {
  const wantAll = req.nextUrl.searchParams.get("all") === "1"
  try {
    if (wantAll) {
      if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      return NextResponse.json({ products: await listProducts(), storage: storageMode() })
    }
    return NextResponse.json(
      { products: await listProducts({ activeOnly: true }) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    )
  } catch (e) {
    // the home page simply hides the section when the backend isn't set up yet
    if (!wantAll && e instanceof SheetsNotConfigured) return NextResponse.json({ products: [] })
    return backendErrorResponse(e, "shopee-products GET")
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
    return backendErrorResponse(e, "shopee-products POST")
  }
}
