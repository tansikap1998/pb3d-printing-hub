import { test, expect } from "@playwright/test"
import { validateNewOrder, validateSlip, isUuid, MAX_SLIP_BYTES } from "../../lib/orderInput"

const good = {
  customer: { name: " สมชาย ", phone: "0812345678", address: "Bangkok", email: "a@b.co" },
  fileName: "part.stl", technology: "FDM", material: "PETG", color: "black",
  infill: 25, layerHeight: 0.16, quantity: 2, notes: "จัดส่ง: รับเอง (ฟรี)",
  volumeCm3: 216, weightG: 107.1, printTimeMin: 47.6, totalPrice: 410, subtotal: 365,
}

test("valid order becomes a 'reviewing' row (shop confirms the price first); status/ids cannot be injected", () => {
  const r = validateNewOrder({ ...good, status: "delivered", id: "x", tracking_number: "T", slip_url: "x" })
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(r.row).toMatchObject({
    status: "reviewing", estimate_price: 410, shipping_method: "pickup", customer_name: "สมชาย", customer_email: "a@b.co", material: "PETG",
    quantity: 2, base_price: 365, total_price: 410, print_time_min: 48,
  })
  expect(Object.keys(r.row)).not.toContain("id")
  expect(Object.keys(r.row)).not.toContain("tracking_number")
  expect(Object.keys(r.row)).not.toContain("slip_url")
})

test("rejects missing contact details, bad email, bad prices and settings", () => {
  const bad = (patch: any) => validateNewOrder({ ...good, ...patch }).ok
  expect(bad({ customer: { ...good.customer, name: "" } })).toBe(false)
  expect(bad({ customer: { ...good.customer, phone: " " } })).toBe(false)
  expect(bad({ customer: { ...good.customer, address: "" }, shippingMethod: "postal" })).toBe(false)
  expect(bad({ customer: { ...good.customer, address: "" } })).toBe(true) // pick-up: no address needed
  expect(bad({ customer: { ...good.customer, email: "nope" } })).toBe(false)
  expect(bad({ customer: { ...good.customer, email: "" } })).toBe(true) // email optional
  expect(bad({ totalPrice: 0 })).toBe(false)
  expect(bad({ totalPrice: -5 })).toBe(false)
  expect(bad({ totalPrice: "abc" })).toBe(false)
  expect(bad({ subtotal: 999 })).toBe(false) // subtotal > total
  expect(bad({ quantity: 0 })).toBe(false)
  expect(bad({ infill: 150 })).toBe(false)
  expect(bad({ layerHeight: 2 })).toBe(false)
  expect(bad({ fileName: "" })).toBe(false)
  expect(validateNewOrder(null).ok).toBe(false)
})

test("slip validation", () => {
  expect(validateSlip({ size: 1000, type: "image/png" })).toEqual({ ok: true, ext: "png" })
  expect(validateSlip({ size: 1000, type: "application/pdf" })).toEqual({ ok: true, ext: "pdf" })
  expect(validateSlip({ size: MAX_SLIP_BYTES + 1, type: "image/png" }).ok).toBe(false)
  expect(validateSlip({ size: 1000, type: "text/html" }).ok).toBe(false)
  expect(validateSlip({ size: 1000, type: "image/svg+xml" }).ok).toBe(false) // svg can carry scripts
  expect(validateSlip({ size: 0, type: "image/png" }).ok).toBe(false)
  expect(validateSlip(null).ok).toBe(false)
})

test("uuid check", () => {
  expect(isUuid("11111111-2222-4333-8444-555555555555")).toBe(true)
  expect(isUuid("../../etc/passwd")).toBe(false)
  expect(isUuid("abc")).toBe(false)
})

test("itemised quote, expected date and options are kept; junk is dropped", () => {
  const r = validateNewOrder({
    ...good, shippingMethod: "postal", rush: true, addons: "ขัดผิว", expectedDate: "2026-12-01",
    priceItems: [{ key: "print", label: "ค่าพิมพ์ PLA", detail: "100 g × 3 ฿", amount: 300, extra: "x" }, { label: "", amount: 5 }, { label: "bad", amount: "x" }],
  })
  expect(r.ok).toBe(true)
  if (!r.ok) return
  expect(JSON.parse(String(r.row.price_items))).toEqual([{ label: "ค่าพิมพ์ PLA", detail: "100 g × 3 ฿", amount: 300 }])
  expect(r.row).toMatchObject({ expected_date: "2026-12-01", rush: "TRUE", addons: "ขัดผิว", shipping_method: "postal" })
  const bad = validateNewOrder({ ...good, expectedDate: "tomorrow" })
  expect(bad.ok && bad.row.expected_date).toBeNull()
})
