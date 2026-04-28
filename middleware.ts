import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const PUBLIC_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith("/admin")) return NextResponse.next()
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "?"))) {
    return NextResponse.next()
  }

  const token = req.cookies.get("admin_token")?.value
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "pb3d-secret-change-me")
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const res = NextResponse.redirect(new URL("/admin/login", req.url))
    res.cookies.delete("admin_token")
    return res
  }
}

export const config = { matcher: ["/admin/:path*"] }
