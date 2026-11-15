import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

/** Turn a Claude API failure into a clear Thai message (never includes the key). */
export function aiErrorResponse(e: unknown, label: string) {
  console.error(label, e)
  const apiMsg = e instanceof Anthropic.APIError ? String((e as any)?.error?.error?.message ?? e.message ?? "") : ""
  const say = (error: string, status: number) => NextResponse.json({ error }, { status })

  if (e instanceof Anthropic.AuthenticationError)
    return say("ANTHROPIC_API_KEY ไม่ถูกต้องหรือถูกปิดแล้ว: สร้าง key ใหม่ที่ platform.claude.com แล้วใส่ใน Vercel", 503)
  if (e instanceof Anthropic.PermissionDeniedError)
    return say("key นี้ไม่มีสิทธิ์ใช้โมเดลนี้: ตรวจสอบ workspace ของ key ใน platform.claude.com", 503)
  if (e instanceof Anthropic.BadRequestError && /credit balance|billing|purchase credits/i.test(apiMsg))
    return say("เครดิตในบัญชี Anthropic ไม่พอ: เติมเครดิตที่ platform.claude.com → Billing แล้วลองใหม่", 402)
  if (e instanceof Anthropic.NotFoundError)
    return say("ไม่พบโมเดล AI ที่ตั้งไว้ (บัญชีนี้อาจยังใช้โมเดลนี้ไม่ได้)", 502)
  if (e instanceof Anthropic.RateLimitError)
    return say("เรียกใช้ AI ถี่เกินไป หรือเกินโควตาของบัญชี: รอสักครู่แล้วลองใหม่", 429)
  if (e instanceof Anthropic.APIConnectionTimeoutError)
    return say("AI ตอบช้าเกินเวลา: ลองใหม่อีกครั้ง", 504)
  if (e instanceof Anthropic.APIError && ((e.status ?? 0) >= 500))
    return say("ระบบ AI ไม่ว่างชั่วคราว: ลองใหม่อีกครั้ง", 503)
  const detail = e instanceof Anthropic.APIError
    ? ` (${e.status ?? ""} ${apiMsg.slice(0, 160)})`
    : e instanceof Error ? ` (${e.message.slice(0, 160)})` : ""
  return say(`เรียก AI ไม่สำเร็จ${detail}`, 502)
}
