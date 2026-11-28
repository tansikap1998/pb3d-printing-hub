import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { db, nowBangkok, backendErrorResponse } from "@/lib/sheetsDb"
import { notifyShop, sendMail, requestOrigin } from "@/lib/notify"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" }
const MAX_TOTAL = 4 * 1024 * 1024 // Vercel rejects bodies over 4.5MB
const SERVICES = ["ออกแบบให้", "สแกนของจริง", "ไม่แน่ใจ ขอคำแนะนำ"]
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))

// POST /api/requests (multipart) — "ไม่มีไฟล์ 3D": photos + description for a design / scan quote
export async function POST(req: NextRequest) {
  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }) }
  const f = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max)
  const name = f("name", 200), phone = f("phone", 50), email = f("email", 200), lineId = f("lineId", 100)
  const description = f("description", 3000), size = f("size", 200)
  const service = SERVICES.includes(f("service", 50)) ? f("service", 50) : SERVICES[2]
  const quantity = Math.max(1, Math.min(10000, Math.trunc(Number(f("quantity", 10)) || 1)))
  if (!name || (!phone && !lineId && !email)) return NextResponse.json({ error: "กรอกชื่อ และเบอร์โทร / LINE ID / อีเมล อย่างน้อยหนึ่งช่อง" }, { status: 400 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 })
  if (description.length < 10) return NextResponse.json({ error: "เล่ารายละเอียดงานอย่างน้อย 10 ตัวอักษร" }, { status: 400 })

  const files = form.getAll("photos").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 5)
  if (files.some(x => !PHOTO_TYPES[x.type])) return NextResponse.json({ error: "รองรับเฉพาะรูป JPG, PNG, WEBP, HEIC" }, { status: 400 })
  if (files.reduce((s, x) => s + x.size, 0) > MAX_TOTAL) return NextResponse.json({ error: "รูปรวมกันใหญ่เกิน 4MB" }, { status: 413 })

  try {
    const photos = await Promise.all(files.map(async x => ({
      base64: Buffer.from(await x.arrayBuffer()).toString("base64"), mimeType: x.type, ext: PHOTO_TYPES[x.type],
    })))
    const id = randomUUID()
    await db.requests.create({ id, created_at: nowBangkok(), status: "new", name, phone, email, line_id: lineId, service, description, size, quantity }, photos)
    const no = id.split("-")[0].toUpperCase()
    const summary = `<p><b>${esc(name)}</b> · ${esc(phone)} ${lineId ? `· LINE ${esc(lineId)}` : ""} ${email ? `· ${esc(email)}` : ""}</p>
      <p>ต้องการ: ${esc(service)} · จำนวน ${quantity} ${size ? `· ขนาด ${esc(size)}` : ""}</p><p style="white-space:pre-line">${esc(description)}</p>
      <p>รูป ${photos.length} รูป (อยู่ในโฟลเดอร์ Drive ของร้าน และแท็บ NoFileRequests)</p>`
    await Promise.all([
      notifyShop(`คำขอใบเสนอราคา (ไม่มีไฟล์) #${no}`, summary, { href: `${requestOrigin(req)}/admin`, label: "เปิดหน้าแอดมิน" }),
      sendMail(email, `[PB3D] ได้รับคำขอใบเสนอราคา #${no}`,
        `<div style="font-family:sans-serif"><p>สวัสดีคุณ ${esc(name)}</p><p>ร้านได้รับรายละเอียดงานแล้ว จะติดต่อกลับพร้อมใบเสนอราคาเร็ว ๆ นี้</p>${summary}</div>`),
    ])
    return NextResponse.json({ ok: true, id: no }, { status: 201 })
  } catch (e) {
    return backendErrorResponse(e, "no-file request")
  }
}
