import { NextRequest, NextResponse } from "next/server"
import { isAllowedEmail, signResetToken, sendResetEmail } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !isAllowedEmail(email)) {
      // Always return OK to avoid email enumeration
      return NextResponse.json({ ok: true })
    }

    const token = await signResetToken(email)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`
    const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`

    await sendResetEmail(email, resetUrl)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("forgot-password error:", err)
    return NextResponse.json({ error: err.message || "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 })
  }
}
