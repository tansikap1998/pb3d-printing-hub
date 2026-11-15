import { z } from "zod"

// AI product copywriting: the admin fills in what they know about a 3D-printed
// product, Claude drafts listing titles + a detailed Thai description.
// Pure helpers live here (tested in tests/unit/aiCopy.spec.ts); the API call is
// in app/api/admin/ai-copy/route.ts.

export const AI_MODEL = "claude-opus-5-5"

export const CopyInputSchema = z.object({
  name: z.string().trim().max(200).default(""),
  category: z.string().trim().max(100).default(""),
  grams: z.number().nonnegative().max(100000).nullable().default(null),
  material: z.string().trim().max(100).default(""),
  color: z.string().trim().max(100).default(""),
  size: z.string().trim().max(200).default(""),
  features: z.string().trim().max(2000).default(""),
  channel: z.string().trim().max(100).default(""),
  tone: z.enum(["friendly", "premium", "cute", "technical"]).default("friendly"),
  price: z.number().nonnegative().max(1000000).nullable().default(null),
})
export type CopyInput = z.infer<typeof CopyInputSchema>

export const CopyOutputSchema = z.object({
  titles: z.array(z.string()).describe("3 ตัวเลือกชื่อสินค้าสำหรับลงขาย แต่ละชื่อไม่เกิน 120 ตัวอักษร"),
  short_description: z.string().describe("คำโปรย 1-2 ประโยค"),
  description: z.string().describe("รายละเอียดสินค้าแบบเต็ม หลายย่อหน้า พร้อมลงขาย"),
  bullet_points: z.array(z.string()).describe("จุดเด่น/สเปก 4-7 ข้อ"),
  hashtags: z.array(z.string()).describe("แฮชแท็ก/คีย์เวิร์ดค้นหา 5-10 คำ ขึ้นต้นด้วย #"),
})
export type CopyOutput = z.infer<typeof CopyOutputSchema>

export const TITLE_MAX = 120

const TONES: Record<CopyInput["tone"], string> = {
  friendly: "เป็นกันเอง อ่านง่าย",
  premium: "ดูพรีเมียม มีระดับ",
  cute: "น่ารัก สดใส",
  technical: "เน้นสเปกและการใช้งานจริง",
}

export const SYSTEM_PROMPT = `คุณเป็นนักเขียนคำบรรยายสินค้าให้ร้าน PB3D ซึ่งขายสินค้าพิมพ์ 3 มิติ (FDM) ทำเองในไทย บนช่องทางเช่น Shopee, Lazada, TikTok Shop และขายตรง
เขียนเป็นภาษาไทย ใช้ภาษาที่คนไทยใช้จริงในหน้าร้านออนไลน์

กติกา:
- ใช้เฉพาะข้อมูลที่ได้รับ ห้ามแต่งสเปก ขนาด วัสดุ การรับประกัน ใบรับรอง หรือคุณสมบัติที่ไม่ได้ระบุ (เช่น "กันน้ำ 100%" "Food grade") ถ้าข้อมูลไม่มีให้ข้ามไป
- ชื่อสินค้า: 3 ตัวเลือกที่ต่างกันจริง แต่ละชื่อไม่เกิน ${TITLE_MAX} ตัวอักษร ใส่คำค้นหาสำคัญไว้ต้นชื่อ ไม่ใส่อีโมจิ ไม่ใส่ราคา
- รายละเอียด: เปิดด้วยประโยชน์ที่ลูกค้าได้ ตามด้วยรายละเอียดสินค้า วิธีใช้/โอกาสที่เหมาะ และหมายเหตุสินค้าพิมพ์ 3 มิติ (อาจมีเส้นชั้นพิมพ์เล็กน้อยตามธรรมชาติ สีอาจต่างจากภาพตามหน้าจอ) แบ่งย่อหน้าด้วยบรรทัดว่าง ไม่ใช้ markdown (ไม่มี ** หรือ #หัวข้อ)
- จุดเด่น: สั้น กระชับ ข้อละหนึ่งบรรทัด ไม่ต้องมีสัญลักษณ์นำหน้า
- แฮชแท็ก: ไม่มีช่องว่างในแท็ก ขึ้นต้นด้วย #`

/** The user turn: the product facts, one per line, skipping blanks. */
export function buildUserPrompt(input: CopyInput): string {
  const facts: [string, string | number | null][] = [
    ["ชื่อ/สินค้าคร่าว ๆ", input.name],
    ["หมวดหมู่", input.category],
    ["วัสดุ", input.material],
    ["สี", input.color],
    ["ขนาด", input.size],
    ["น้ำหนักชิ้นงาน (กรัม)", input.grams],
    ["ราคาขาย (บาท)", input.price],
    ["ช่องทางขาย", input.channel],
  ]
  const lines = facts
    .filter(([, v]) => v !== null && v !== "" && v !== 0)
    .map(([k, v]) => `- ${k}: ${v}`)
  if (input.features) lines.push(`- จุดเด่น/รายละเอียดเพิ่มเติมจากร้าน:\n${input.features}`)
  return `ข้อมูลสินค้า:\n${lines.join("\n") || "- (ไม่มีข้อมูล)"}\n\nโทนการเขียน: ${TONES[input.tone]}\n\nเขียนชื่อสินค้าและรายละเอียดสินค้าตามกติกา`
}

/** True when there's enough to write about. */
export const hasEnoughInput = (i: CopyInput) => !!(i.name || i.features)

/** Tidy the model output: trim, cap title length, normalise hashtags, drop empties/dupes. */
export function cleanOutput(o: CopyOutput): CopyOutput {
  const uniq = (xs: string[]) => Array.from(new Set(xs.map(s => s.trim()).filter(Boolean)))
  const cap = (s: string) => (Array.from(s).length > TITLE_MAX ? Array.from(s).slice(0, TITLE_MAX).join("").trim() : s)
  return {
    titles: uniq(o.titles).map(cap).slice(0, 5),
    short_description: o.short_description.trim(),
    description: o.description.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
    bullet_points: uniq(o.bullet_points.map(b => b.replace(/^\s*[-•*✓✔]\s*/, ""))).slice(0, 10),
    hashtags: uniq(o.hashtags.map(h => "#" + h.replace(/^#+/, "").replace(/\s+/g, ""))).filter(h => h.length > 1).slice(0, 15),
  }
}

/** One block of text the admin can paste straight into Shopee's description box. */
export function listingText(o: CopyOutput): string {
  return [
    o.short_description,
    o.description,
    o.bullet_points.length ? "จุดเด่น\n" + o.bullet_points.map(b => `• ${b}`).join("\n") : "",
    o.hashtags.join(" "),
  ].filter(Boolean).join("\n\n")
}

/** Shipping weight for the Shopee form: piece + packaging, rounded up to 10 g; kg with 2 decimals. */
export function packageWeight(pieceG: number, packagingG: number): { g: number; kg: string } {
  const raw = Math.max(0, Number(pieceG) || 0) + Math.max(0, Number(packagingG) || 0)
  const g = Math.ceil(raw / 10) * 10
  return { g, kg: (g / 1000).toFixed(2) }
}
