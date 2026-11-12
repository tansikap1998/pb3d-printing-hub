import { test, expect } from "@playwright/test"
import { orderToSheetRow, bangkokTime, syncOrderToSheet, syncOrdersToSheet } from "../../lib/sheetsSync"

const order = {
  id: "11111111-2222-4333-8444-555555555555", created_at: "2026-11-12T07:03:00Z", status: "awaiting_verification",
  customer_name: "สมชาย", customer_phone: "0812345678", customer_email: null, customer_address: "Bangkok",
  file_name: "a.stl", material: "PLA", color: "white", quantity: 2, infill: 25, layer_height: 0.16,
  notes: "จัดส่ง: รับเอง (ฟรี)", total_price: "365", tracking_number: null, slip_url: "x/1.png",
}

const withEnv = async (fn: () => Promise<void>) => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/TEST/exec"
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = "s3cret"
  try { await fn() } finally {
    delete process.env.GOOGLE_SHEETS_WEBHOOK_URL; delete process.env.GOOGLE_SHEETS_WEBHOOK_SECRET
  }
}
const okFetch = (calls: any[]) => (async (url: any, init: any) => {
  calls.push({ url, body: JSON.parse(init.body) })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}) as typeof fetch

test("Bangkok time is UTC+7", () => {
  expect(bangkokTime("2026-11-12T07:03:00Z")).toBe("2026-11-12 14:03")
  expect(bangkokTime("2026-11-12T20:30:00Z")).toBe("2026-11-13 03:30")
  expect(bangkokTime("nope")).toBe("")
})

test("order row: Thai status, slip flag, numbers, empty instead of null", () => {
  const r = orderToSheetRow(order, new Date("2026-11-12T08:00:00Z"))
  expect(r).toMatchObject({
    id: order.id, created_at: "2026-11-12 14:03", status: "รอตรวจสลิป (awaiting_verification)",
    customer_phone: "0812345678", customer_email: "", total_price: 365, tracking_number: "",
    has_slip: "มี", updated_at: "2026-11-12 15:00",
  })
  expect(Object.keys(r)).not.toContain("slip_url") // no storage paths / links in the sheet
})

test("not configured → no request, returns false", async () => {
  const calls: any[] = []
  expect(await syncOrderToSheet(order, { fetchImpl: okFetch(calls) })).toBe(false)
  expect(calls).toHaveLength(0)
})

test("sends secret + row and reports success", async () => withEnv(async () => {
  const calls: any[] = []
  expect(await syncOrderToSheet(order, { fetchImpl: okFetch(calls) })).toBe(true)
  expect(calls).toHaveLength(1)
  expect(calls[0].url).toBe("https://script.google.com/macros/s/TEST/exec")
  expect(calls[0].body.secret).toBe("s3cret")
  expect(calls[0].body.order.id).toBe(order.id)
}))

test("script error, HTTP error, network error and timeout never throw", async () => withEnv(async () => {
  const silence = console.error; console.error = () => {}
  try {
    const scriptErr = (async () => new Response('{"ok":false,"error":"unauthorized"}', { status: 200 })) as typeof fetch
    const httpErr = (async () => new Response("oops", { status: 500 })) as typeof fetch
    const netErr = (async () => { throw new TypeError("fetch failed") }) as typeof fetch
    const hang = ((_u: any, init: any) => new Promise((_, rej) =>
      init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as typeof fetch
    expect(await syncOrderToSheet(order, { fetchImpl: scriptErr })).toBe(false)
    expect(await syncOrderToSheet(order, { fetchImpl: httpErr })).toBe(false)
    expect(await syncOrderToSheet(order, { fetchImpl: netErr })).toBe(false)
    const t0 = Date.now()
    expect(await syncOrderToSheet(order, { fetchImpl: hang, timeoutMs: 100 })).toBe(false)
    expect(Date.now() - t0).toBeLessThan(2000)
  } finally { console.error = silence }
}))

test("backfill sends batches and counts rows", async () => withEnv(async () => {
  const calls: any[] = []
  const many = Array.from({ length: 5 }, (_, i) => ({ ...order, id: `id-${i}` }))
  expect(await syncOrdersToSheet(many, { fetchImpl: okFetch(calls), batchSize: 2 })).toEqual({ ok: true, written: 5 })
  expect(calls.map(c => c.body.orders.length)).toEqual([2, 2, 1])
}))
