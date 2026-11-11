// Validation shared by the order API routes (pure functions, unit-tested).

export const ORDER_STATUSES = [
  "pending", "awaiting_verification", "confirmed", "printing", "shipped", "delivered", "cancelled",
] as const

export const MAX_SLIP_BYTES = 5 * 1024 * 1024
export const SLIP_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf",
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string) => UUID.test(s)

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v))

export type NewOrderRow = Record<string, string | number | null>

/** Validate the body sent by /quote and turn it into an `orders` row. */
export function validateNewOrder(b: any): { ok: true; row: NewOrderRow } | { ok: false; error: string } {
  if (!b || typeof b !== "object") return { ok: false, error: "Invalid body" }
  const name = str(b.customer?.name, 200), phone = str(b.customer?.phone, 50), address = str(b.customer?.address, 1000)
  const email = str(b.customer?.email, 200)
  if (!name || !phone || !address) return { ok: false, error: "กรุณากรอกชื่อ เบอร์โทร และที่อยู่" }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "อีเมลไม่ถูกต้อง" }

  const total = num(b.totalPrice), base = num(b.subtotal ?? b.totalPrice)
  const qty = Math.trunc(num(b.quantity)), infill = Math.trunc(num(b.infill)), layer = num(b.layerHeight)
  if (!(total > 0) || total > 1_000_000) return { ok: false, error: "ราคาไม่ถูกต้อง" }
  if (!(base > 0) || base > total) return { ok: false, error: "ราคาไม่ถูกต้อง" }
  if (!(qty >= 1 && qty <= 10_000)) return { ok: false, error: "จำนวนไม่ถูกต้อง" }
  if (!(infill >= 0 && infill <= 100) || !(layer > 0 && layer < 1)) return { ok: false, error: "ค่าการพิมพ์ไม่ถูกต้อง" }

  const fileName = str(b.fileName, 255)
  if (!fileName) return { ok: false, error: "ไม่มีไฟล์ชิ้นงาน" }
  const optNum = (v: unknown) => { const n = num(v); return Number.isFinite(n) && n >= 0 ? n : null }

  return {
    ok: true,
    row: {
      status: "pending",
      customer_name: name, customer_email: email || null, customer_phone: phone, customer_address: address,
      file_name: fileName, technology: str(b.technology, 20) || "FDM",
      material: str(b.material, 255) || "PLA", color: str(b.color, 255) || "various",
      infill, layer_height: layer, quantity: qty, notes: str(b.notes, 1000) || null,
      volume_cm3: optNum(b.volumeCm3), weight_g: optNum(b.weightG),
      print_time_min: (() => { const n = optNum(b.printTimeMin); return n === null ? null : Math.round(n) })(),
      base_price: base, total_price: total,
    },
  }
}

/** Check an uploaded slip. Returns the file extension to store it under. */
export function validateSlip(file: { size: number; type: string } | null): { ok: true; ext: string } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: false, error: "กรุณาแนบสลิป" }
  if (file.size > MAX_SLIP_BYTES) return { ok: false, error: "ไฟล์ใหญ่เกิน 5MB" }
  const ext = SLIP_TYPES[file.type]
  if (!ext) return { ok: false, error: "รองรับเฉพาะไฟล์รูปภาพหรือ PDF" }
  return { ok: true, ext }
}
