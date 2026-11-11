import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { AUTH_SECRET } from "@/lib/authSecret"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith("/admin")) return NextResponse.next()
  if (pathname === "/admin/login") return NextResponse.next()

  const token = await getToken({ 
    req, 
    secret: AUTH_SECRET,
  })

  if (!token) {
    const url = new URL("/admin/login", req.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*"] }
