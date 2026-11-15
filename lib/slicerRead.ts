import { z } from "zod"

// Read total filament weight + print time from a slicer screenshot
// (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura…) with Claude's vision.

export const SlicerReadSchema = z.object({
  found: z.boolean().describe("true ถ้าเห็นค่าน้ำหนักหรือเวลาพิมพ์ในภาพ"),
  total_grams: z.number().nullable().describe("น้ำหนักเส้นพลาสติกรวมทั้งหมด (กรัม) หรือ null"),
  total_minutes: z.number().nullable().describe("เวลาพิมพ์รวมทั้งหมด (นาที) หรือ null"),
  plates: z.number().nullable().describe("จำนวนเพลตที่เห็น หรือ null"),
  note: z.string().describe("หมายเหตุสั้น ๆ ภาษาไทย เช่น ค่ามาจากแถวไหน"),
})
export type SlicerRead = z.infer<typeof SlicerReadSchema>

export const SLICER_PROMPT = `ภาพนี้คือหน้าสรุปจากโปรแกรม slicer สำหรับพิมพ์ 3 มิติ (เช่น Bambu Studio, OrcaSlicer, PrusaSlicer, Cura)
อ่านค่าต่อไปนี้:
- total_grams: น้ำหนักเส้นพลาสติก "รวมทั้งหมด" เป็นกรัม ถ้ามีหลายคอลัมน์ (ชิ้นงาน, support, flush, prime tower) ให้ใช้ค่ารวมสุดท้าย (มักเป็นคอลัมน์ขวาสุดของแถว Total) ถ้ามีแต่ความยาว (m) ไม่มีกรัม ให้เป็น null
- total_minutes: เวลาพิมพ์ "รวมทั้งหมด" เป็นนาที ถ้ามีหลายเพลตและมีแถว Total ให้ใช้แถว Total ถ้าไม่มีแถว Total ให้รวมทุกเพลต แปลง เช่น 11h8m = 668, 1d2h = 1560
- ห้ามใช้ค่า cost/ราคา และห้ามเดาค่าที่มองไม่เห็น ให้เป็น null
- ถ้าภาพไม่ใช่หน้าสรุปจาก slicer ให้ found = false`

export const MAX_IMAGE_BYTES = 3_500_000
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const

/** Sanity-check what the model read; null out impossible values. */
export function cleanSlicerRead(r: SlicerRead): { grams: number | null; hours: number | null; plates: number | null; note: string } {
  const ok = (x: number | null, max: number) => (x !== null && Number.isFinite(x) && x > 0 && x <= max ? x : null)
  const g = ok(r.total_grams, 100_000)
  const m = ok(r.total_minutes, 60 * 24 * 30)
  return {
    grams: g === null ? null : Math.round(g * 100) / 100,
    hours: m === null ? null : Math.round((m / 60) * 100) / 100,
    plates: ok(r.plates, 1000),
    note: (r.note || "").trim().slice(0, 300),
  }
}
