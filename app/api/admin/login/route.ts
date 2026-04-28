import { NextRequest, NextResponse } from "next/server"
import { isAllowedEmail, getPasswordHash, verifyPassword, signAdminToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 })
    }

    if (!isAllowedEmail(email)) {
      return NextResponse.json({ error: "อีเมลนี้ไม่มีสิทธิ์เข้าใช้งาน" }, { status: 403 })
    }

    const hash = await getPasswordHash(email)
    if (!hash) {
      return NextResponse.json({ error: "ยังไม่ได้ตั้งรหัสผ่าน กรุณาใช้ Forgot Password" }, { status: 401 })
    }

    const ok = await verifyPassword(password, hash)
    if (!ok) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 })
    }

    const token = await signAdminToken(email)
    const res = NextResponse.json({ ok: true })
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    })
    return res
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 })
  }
}
