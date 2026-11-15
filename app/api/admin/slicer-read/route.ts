import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { isAdminRequest } from "@/lib/adminSession"
import { AI_MODEL } from "@/lib/aiCopy"
import { SlicerReadSchema, SLICER_PROMPT, MAX_IMAGE_BYTES, IMAGE_TYPES, cleanSlicerRead } from "@/lib/slicerRead"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST { image: <base64>, mimeType } → { grams, hours, plates, note }
// The image is only sent to Claude for this one reading; it is not stored.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel" }, { status: 503 })

  const body = await req.json().catch(() => null)
  const image = typeof body?.image === "string" ? body.image.replace(/^data:[^,]*,/, "") : ""
  const mimeType = String(body?.mimeType || "")
  if (!image || !(IMAGE_TYPES as readonly string[]).includes(mimeType))
    return NextResponse.json({ error: "แนบไฟล์รูป PNG, JPG หรือ WebP" }, { status: 400 })
  if (image.length * 0.75 > MAX_IMAGE_BYTES)
    return NextResponse.json({ error: "รูปใหญ่เกินไป (เกิน 3.5 MB)" }, { status: 413 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim(), maxRetries: 2, timeout: 55_000 })
  try {
    const res = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType as (typeof IMAGE_TYPES)[number], data: image } },
          { type: "text", text: SLICER_PROMPT },
        ],
      }],
      output_config: { format: zodOutputFormat(SlicerReadSchema), effort: "low" },
    })
    if (res.stop_reason === "refusal" || !res.parsed_output)
      return NextResponse.json({ error: "อ่านรูปไม่สำเร็จ ลองแคปให้เห็นแถว Total ชัด ๆ แล้วลองใหม่" }, { status: 422 })
    const out = cleanSlicerRead(res.parsed_output)
    if (!res.parsed_output.found || (out.grams === null && out.hours === null))
      return NextResponse.json({ error: "ไม่พบน้ำหนักหรือเวลาพิมพ์ในรูป ลองแคปหน้าสรุปของ slicer ที่มีแถว Total" }, { status: 422 })
    return NextResponse.json(out)
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      return NextResponse.json({ error: "ANTHROPIC_API_KEY ไม่ถูกต้อง ตรวจสอบใน Vercel" }, { status: 503 })
    if (e instanceof Anthropic.RateLimitError)
      return NextResponse.json({ error: "เรียกใช้ AI ถี่เกินไป รอสักครู่แล้วลองใหม่" }, { status: 429 })
    console.error("slicer-read", e)
    return NextResponse.json({ error: "เรียก AI ไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 })
  }
}
