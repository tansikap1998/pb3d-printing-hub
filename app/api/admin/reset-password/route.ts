import { NextRequest, NextResponse } from "next/server"
import { verifyToken, hashPassword, savePasswordHash, isAllowedEmail } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()
    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 })
    }

    const payload = await verifyToken(token)
    if (payload.type !== "reset" || typeof payload.email !== "string") {
      return NextResponse.json({ error: "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว" }, { status: 400 })
    }

    if (!isAllowedEmail(payload.email)) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 403 })
    }

    const hash = await hashPassword(newPassword)
    const saved = await savePasswordHash(payload.email, hash)

    if (!saved) {
      return NextResponse.json(
        { error: "ไม่สามารถบันทึกรหัสผ่านได้ — กรุณาตั้งค่า Vercel KV ก่อน" },
        { status: 503 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("reset-password error:", err)
    return NextResponse.json({ error: "ลิงก์หมดอายุหรือไม่ถูกต้อง" }, { status: 400 })
  }
}
