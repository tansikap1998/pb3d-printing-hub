import { test, expect } from "@playwright/test"
import { CopyInputSchema, buildUserPrompt, cleanOutput, listingText, hasEnoughInput, packageWeight, TITLE_MAX } from "../../lib/aiCopy"

test("input schema fills defaults and rejects bad tone", () => {
  const i = CopyInputSchema.parse({ name: "  ขาตั้งมือถือ  " })
  expect(i).toMatchObject({ name: "ขาตั้งมือถือ", tone: "friendly", grams: null, features: "" })
  expect(CopyInputSchema.safeParse({ tone: "angry" }).success).toBe(false)
  expect(hasEnoughInput(i)).toBe(true)
  expect(hasEnoughInput(CopyInputSchema.parse({ category: "กระถาง" }))).toBe(false)
})

test("user prompt lists only the facts given", () => {
  const p = buildUserPrompt(CopyInputSchema.parse({
    name: "ขาตั้งมือถือรุ่นแมว", grams: 85, material: "PLA", price: 199, features: "ปรับได้ 3 ระดับ", tone: "cute",
  }))
  expect(p).toContain("- ชื่อ/สินค้าคร่าว ๆ: ขาตั้งมือถือรุ่นแมว")
  expect(p).toContain("- น้ำหนักชิ้นงาน (กรัม): 85")
  expect(p).toContain("- ราคาขาย (บาท): 199")
  expect(p).toContain("ปรับได้ 3 ระดับ")
  expect(p).toContain("น่ารัก")
  expect(p).not.toContain("สี:")
  expect(p).not.toContain("ขนาด:")
})

test("output is tidied: dupes, long titles, bullets, hashtags, blank lines", () => {
  const long = "ก".repeat(150)
  const o = cleanOutput({
    titles: ["A", " A ", long, ""],
    short_description: " สั้น ",
    description: "ย่อหน้า 1\r\n\r\n\r\n\r\nย่อหน้า 2  ",
    bullet_points: ["- ข้อ 1", "• ข้อ 2", "ข้อ 1"],
    hashtags: ["3D Print", "##pla", "#"],
  })
  expect(o.titles).toEqual(["A", "ก".repeat(TITLE_MAX)])
  expect(o.description).toBe("ย่อหน้า 1\n\nย่อหน้า 2")
  expect(o.bullet_points).toEqual(["ข้อ 1", "ข้อ 2"])
  expect(o.hashtags).toEqual(["#3DPrint", "#pla"])
  expect(listingText(o)).toBe("สั้น\n\nย่อหน้า 1\n\nย่อหน้า 2\n\nจุดเด่น\n• ข้อ 1\n• ข้อ 2\n\n#3DPrint #pla")
})

test("package weight = piece + packaging, rounded up to 10 g", () => {
  expect(packageWeight(100, 50)).toEqual({ g: 150, kg: "0.15" })
  expect(packageWeight(83, 50)).toEqual({ g: 140, kg: "0.14" })
  expect(packageWeight(0, 0)).toEqual({ g: 0, kg: "0.00" })
  expect(packageWeight(-5, NaN)).toEqual({ g: 0, kg: "0.00" })
})
