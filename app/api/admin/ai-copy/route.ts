import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { isAdminRequest } from "@/lib/adminSession"
import { aiErrorResponse } from "@/lib/aiErrors"
import {
  AI_MODEL, CopyInputSchema, CopyOutputSchema, SYSTEM_PROMPT, buildUserPrompt, cleanOutput, hasEnoughInput,
} from "@/lib/aiCopy"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // Vercel Fluid allows up to 5 min; Opus can take over a minute

// POST { name, category, grams, material, color, size, features, channel, tone, price }
//   → { copy: { titles, short_description, description, bullet_points, hashtags } }
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel" }, { status: 503 })

  const parsed = CopyInputSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 })
  const input = parsed.data
  if (!hasEnoughInput(input))
    return NextResponse.json({ error: "กรอกชื่อสินค้าหรือจุดเด่นอย่างน้อยหนึ่งช่อง" }, { status: 400 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim(), maxRetries: 1, timeout: 140_000 })
  try {
    const res = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      output_config: { format: zodOutputFormat(CopyOutputSchema), effort: "medium" },
    })
    if (res.stop_reason === "refusal")
      return NextResponse.json({ error: "AI ไม่สามารถเขียนให้สินค้านี้ได้ ลองปรับรายละเอียดแล้วลองใหม่" }, { status: 422 })
    if (res.stop_reason === "max_tokens" || !res.parsed_output)
      return NextResponse.json({ error: "AI ตอบกลับไม่สมบูรณ์ กรุณาลองใหม่" }, { status: 502 })
    return NextResponse.json({ copy: cleanOutput(res.parsed_output) })
  } catch (e) {
    return aiErrorResponse(e, "ai-copy")
  }
}
