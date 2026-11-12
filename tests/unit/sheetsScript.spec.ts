import { test, expect } from "@playwright/test"
import { readFileSync } from "fs"
import path from "path"
import vm from "vm"

// Runs integrations/google-sheets/Code.gs against an in-memory fake of the
// Apps Script services it uses (SpreadsheetApp, PropertiesService, LockService, ContentService).
function loadScript(secret: string | null = "s3cret") {
  const grid: any[][] = []
  const lock = { waits: 0, releases: 0 }
  const range = (r: number, c: number, nr: number, nc: number) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => grid[r - 1 + i]?.[c - 1 + j] ?? "")),
    setValues(v: any[][]) { v.forEach((row, i) => row.forEach((x, j) => { (grid[r - 1 + i] ||= [])[c - 1 + j] = x })); return this },
    setFontWeight() { return this }, setNumberFormat() { return this },
  })
  const sheet = {
    getLastRow: () => grid.length, getMaxRows: () => 1000, setFrozenRows() {},
    getRange: (r: number, c: number, nr = 1, nc = 1) => range(r, c, nr, nc),
  }
  const ctx: any = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => secret }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { lock.waits++ }, releaseLock: () => { lock.releases++ } }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s: string) => ({ setMimeType: () => JSON.parse(s) }) },
  }
  vm.createContext(ctx)
  vm.runInContext(readFileSync(path.join(__dirname, "../../integrations/google-sheets/Code.gs"), "utf8"), ctx)
  const post = (body: unknown) => ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } })
  return { post, grid, lock, headers: () => grid[0] }
}

const order = (over: any = {}) => ({
  id: "A1", created_at: "2026-11-12 14:03", status: "รอชำระเงิน (pending)", customer_name: "สมชาย",
  customer_phone: "0812345678", customer_email: "", customer_address: "BKK", file_name: "a.stl",
  material: "PLA", color: "white", quantity: 2, infill: 25, layer_height: 0.16, notes: "",
  total_price: 365, tracking_number: "", has_slip: "", updated_at: "2026-11-12 14:03", ...over,
})

test("rejects a wrong or missing secret, bad JSON and missing order", () => {
  const s = loadScript()
  expect(s.post({ secret: "nope", order: order() })).toEqual({ ok: false, error: "unauthorized" })
  expect(s.post({ order: order() })).toEqual({ ok: false, error: "unauthorized" })
  expect(s.post("{not json")).toEqual({ ok: false, error: "bad json" })
  expect(s.post({ secret: "s3cret" })).toEqual({ ok: false, error: "missing order" })
  expect(s.grid).toHaveLength(0)
  // no secret configured in Script properties → everything refused
  expect(loadScript(null).post({ secret: "", order: order() }).ok).toBe(false)
})

test("first order creates the header row and one data row", () => {
  const s = loadScript()
  expect(s.post({ secret: "s3cret", order: order() })).toEqual({ ok: true, rows: [2] })
  expect(s.headers()[0]).toBe("Order ID")
  expect(s.headers()).toContain("เบอร์โทร")
  expect(s.grid[1][0]).toBe("A1")
  expect(s.grid[1][4]).toBe("0812345678") // phone stays text with its leading zero
  expect(s.grid[1][14]).toBe(365)          // total is a number
})

test("updates the same row for the same order id, appends for a new one", () => {
  const s = loadScript()
  s.post({ secret: "s3cret", order: order() })
  s.post({ secret: "s3cret", order: order({ id: "B2" }) })
  expect(s.post({ secret: "s3cret", order: order({ status: "จัดส่งแล้ว (shipped)", tracking_number: "TH123" }) }))
    .toEqual({ ok: true, rows: [2] })
  expect(s.grid).toHaveLength(3)
  expect(s.grid[1][2]).toBe("จัดส่งแล้ว (shipped)")
  expect(s.grid[1][15]).toBe("TH123")
  expect(s.grid[2][0]).toBe("B2")
})

test("customer text can never become a spreadsheet formula", () => {
  const s = loadScript()
  s.post({ secret: "s3cret", order: order({
    customer_name: '=HYPERLINK("http://evil","x")', customer_address: "+66 Bangkok", notes: "@import", file_name: "-cmd",
  }) })
  const row = s.grid[1]
  expect(row[3]).toBe("'=HYPERLINK(\"http://evil\",\"x\")")
  expect(row[6]).toBe("'+66 Bangkok")
  expect(row[13]).toBe("'@import")
  expect(row[7]).toBe("'-cmd")
})

test("batch upsert (admin 'sync all') and the lock is always released", () => {
  const s = loadScript()
  s.post({ secret: "s3cret", order: order() })
  expect(s.post({ secret: "s3cret", orders: [order({ total_price: 999 }), order({ id: "C3" })] })).toEqual({ ok: true, rows: [2, 3] })
  expect(s.grid[1][14]).toBe(999)
  expect(s.grid).toHaveLength(3)
  expect(s.lock.waits).toBe(s.lock.releases)
})
