import { test, expect } from "@playwright/test"
import http from "http"
import { execFile } from "child_process"
import { mkdtempSync, readFileSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { emulatorPost } from "../../lib/sheetsEmulator"

const PNG = Buffer.from("\x89PNG slip bytes")

// Fake Supabase (REST + storage) and a fake Apps Script endpoint backed by the emulator.
function servers(sheetFile: string) {
  const sb = http.createServer((req, res) => {
    if (req.headers.apikey !== "sb-key") { res.writeHead(401).end(); return }
    if (req.url!.startsWith("/rest/v1/orders")) {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify([
        { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-10-01T03:00:00+00:00", status: "delivered", customer_name: "เก่า", customer_phone: "0811111111", customer_address: "BKK", file_name: "a.stl", technology: "FDM", material: "PLA", color: "white", infill: 25, layer_height: 0.16, quantity: 1, total_price: 120, base_price: 120, tracking_number: "TH1", slip_url: "https://x.supabase.co/storage/v1/object/public/payment_slips/old.png" },
        { id: "22222222-2222-4222-8222-222222222222", created_at: "2026-10-02T03:00:00+00:00", status: "pending", customer_name: "ใหม่", customer_phone: "0822222222", customer_address: "CNX", file_name: "b.stl", technology: "FDM", material: "PETG", color: "black", infill: 50, layer_height: 0.08, quantity: 2, total_price: 300, base_price: 300, tracking_number: null, slip_url: null },
      ])); return
    }
    if (req.url!.startsWith("/rest/v1/shopee_products")) {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify([
        { id: "p1", created_at: "2026-10-01T00:00:00Z", name: "ขาตั้ง", url: "https://shopee.co.th/x-i.1.2", price: 199, image_url: null, description: null, active: true, sort_order: 0 },
      ])); return
    }
    if (req.url === "/storage/v1/object/payment_slips/old.png") { res.writeHead(200, { "Content-Type": "image/png" }).end(PNG); return }
    res.writeHead(404).end()
  })
  const gs = http.createServer((req, res) => {
    let body = ""
    req.on("data", c => (body += c)).on("end", () => {
      const reply = emulatorPost(sheetFile, "gs-secret", JSON.parse(body))
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(reply))
    })
  })
  return { sb, gs }
}

const listen = (s: http.Server) => new Promise<number>(r => s.listen(0, "127.0.0.1", () => r((s.address() as any).port)))
const run = (env: Record<string, string>, args: string[] = []) => new Promise<{ code: number; out: string }>(r =>
  execFile(process.execPath, ["scripts/migrate-supabase-to-sheets.mjs", ...args], { env: { ...process.env, ...env } },
    (err, stdout, stderr) => r({ code: err ? (err as any).code ?? 1 : 0, out: stdout + stderr })))

test("migrates orders, slips and products; dry run writes nothing; safe to re-run", async () => {
  const sheetFile = path.join(mkdtempSync(path.join(tmpdir(), "pb3d-mig-")), "db.json")
  const { sb, gs } = servers(sheetFile)
  const [sbPort, gsPort] = [await listen(sb), await listen(gs)]
  const env = {
    SUPABASE_URL: `http://127.0.0.1:${sbPort}`, SUPABASE_SERVICE_ROLE_KEY: "sb-key",
    GOOGLE_SHEETS_WEBHOOK_URL: `http://127.0.0.1:${gsPort}`, GOOGLE_SHEETS_WEBHOOK_SECRET: "gs-secret",
  }
  const call = (action: string, b: any = {}) => emulatorPost(sheetFile, "gs-secret", { secret: "gs-secret", action, ...b })
  try {
    const dry = await run(env, ["--dry-run"])
    expect(dry.code, dry.out).toBe(0)
    expect(dry.out).toContain("Orders in Supabase: 2")
    expect(call("orders.list").orders).toHaveLength(0)

    const real = await run(env)
    expect(real.code, real.out).toBe(0)
    expect(real.out).toContain("Slips copied: 1")
    expect(real.out).toContain("Shopee products copied: 1")
    const orders = call("orders.list").orders
    expect(orders.map((o: any) => o.customer_name)).toEqual(["ใหม่", "เก่า"])
    const old = orders.find((o: any) => o.customer_name === "เก่า")
    expect(old).toMatchObject({ status: "delivered", tracking_number: "TH1", customer_phone: "0811111111", total_price: 120 })
    expect(call("slips.get", { orderId: old.id }).slip).toMatchObject({ mimeType: "image/png", base64: PNG.toString("base64") })
    expect(call("products.list").products).toMatchObject([{ id: "p1", name: "ขาตั้ง", price: 199, active: true }])

    const again = await run(env)
    expect(again.code, again.out).toBe(0)
    expect(call("orders.list").orders).toHaveLength(2)          // no duplicates
    expect(call("products.list").products).toHaveLength(1)
    expect(again.out).toContain("already there: 1")
    expect(again.out).toContain("Slips copied: 0") // slip not copied twice

    const bad = await run({ ...env, GOOGLE_SHEETS_WEBHOOK_SECRET: "wrong" })
    expect(bad.code).not.toBe(0)
    expect(bad.out).toContain("unauthorized")
  } finally {
    sb.close(); gs.close()
  }
})
