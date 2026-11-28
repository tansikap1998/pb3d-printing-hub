import { Page, expect } from "@playwright/test"

export const ADMIN_EMAIL = "tansika.p1998@gmail.com"
export const ADMIN_PASSWORD = "e2e-test-password"

/** Binary STL of an axis-aligned box (12 triangles). */
export function boxStl(x: number, y: number, z: number): Buffer {
  const v = [
    [0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0],
    [0, 0, z], [x, 0, z], [x, y, z], [0, y, z],
  ]
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ]
  const buf = Buffer.alloc(84 + faces.length * 50)
  buf.writeUInt32LE(faces.length, 80)
  faces.forEach((f, i) => {
    let o = 84 + i * 50 + 12 // skip normal
    for (const idx of f) for (const c of v[idx]) { buf.writeFloatLE(c, o); o += 4 }
  })
  return buf
}

/** 1×1 PNG */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

/** Block every request that would leave localhost (S3 uploads, Google fonts, images…). */
export async function isolateNetwork(page: Page) {
  // Pre-accept the cookie banner so it doesn't cover buttons (it has its own test).
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("__e2e_keep_banner"))
      localStorage.setItem("pb3d_cookie_consent", JSON.stringify({ necessary: true, analytics: false, marketing: false }))
  })
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort())
  // S3 presign has no credentials in tests — prove the upload flow survives it failing.
  await page.route("**/api/upload/presigned", r => r.fulfill({ status: 500, body: '{"error":"no s3"}' }))
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login")
  await page.getByPlaceholder("Admin Email").fill(ADMIN_EMAIL)
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD)
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText("Order Dashboard")).toBeVisible()
}

// ─── Backend (Google Sheets emulator) helpers ───────────────────────────────
import { APIRequestContext } from "@playwright/test"
import { promises as fsp, readFileSync } from "fs"
import path from "path"

export const EMULATOR_FILE = path.join(__dirname, "..", "test-results", "sheets.e2e.json")

/** Empty the simulated Google Sheet (the emulator re-reads the file on every request). */
export async function resetDb() { await fsp.rm(EMULATOR_FILE, { force: true }) }

/** Raw tabs of the simulated sheet: { Orders: [[titles...], [row...]], ... } */
export function sheetTabs(): Record<string, any[][]> {
  try { return JSON.parse(readFileSync(EMULATOR_FILE, "utf8")).sheets } catch { return {} }
}

export const sampleOrder = (over: Record<string, any> = {}) => ({
  customer: { name: "ลูกค้า ทดสอบ", phone: "0812345678", address: "Bangkok", email: "" },
  fileName: "part.stl", technology: "FDM", material: "PLA", color: "white",
  infill: 25, layerHeight: 0.4, quantity: 1, notes: "จัดส่ง: รับเอง (ฟรี)",
  volumeCm3: 216, weightG: 107, printTimeMin: 48, totalPrice: 365, subtotal: 365,
  ...over,
})

/** Create an order through the public API, like /quote does. */
/** Create an order through the public API. New orders wait for the shop to confirm the price
 *  ("reviewing"); by default this also confirms it straight in the sheet so it waits for payment. */
export async function createOrder(request: APIRequestContext, over: Record<string, any> = {}, { review = false } = {}): Promise<string> {
  const r = await request.post("/api/orders", { data: sampleOrder(over) })
  if (r.status() !== 201) throw new Error(`createOrder ${r.status()} ${await r.text()}`)
  const id = (await r.json()).id
  if (!review) confirmPriceInSheet(id)
  return id
}
export function confirmPriceInSheet(id: string) {
  const { emulatorPost } = require("../lib/sheetsEmulator")
  emulatorPost(EMULATOR_FILE, "s", { secret: "s", action: "orders.update", id, patch: { status: "pending" } })
}
/** E-mails the emulator "sent" (Apps Script MailApp). */
export function sentMail(): { to: string; subject: string; html: string }[] {
  try { return JSON.parse(readFileSync(EMULATOR_FILE, "utf8")).mail ?? [] } catch { return [] }
}

export async function submitSlipRaw(request: APIRequestContext, id: string) {
  return request.post(`/api/orders/${id}/slip`, { multipart: { file: { name: "slip.png", mimeType: "image/png", buffer: PNG_1PX } } })
}
/** Upload a slip through the public API, like /checkout does. */
export async function submitSlip(request: APIRequestContext, id: string) {
  const r = await request.post(`/api/orders/${id}/slip`, {
    multipart: { file: { name: "slip.png", mimeType: "image/png", buffer: PNG_1PX } },
  })
  if (!r.ok()) throw new Error(`submitSlip ${r.status()} ${await r.text()}`)
}

/** Admin-only helpers (use page.request after loginAsAdmin so the session cookie is sent). */
export async function adminSetStatus(page: Page, id: string, status: string, trackingNumber?: string) {
  const r = await page.request.patch(`/api/admin/orders/${id}`, { data: { status, ...(trackingNumber ? { trackingNumber } : {}) } })
  if (!r.ok()) throw new Error(`adminSetStatus ${r.status()} ${await r.text()}`)
}
export async function adminGetOrder(page: Page, id: string) {
  const r = await page.request.get("/api/admin/orders")
  return ((await r.json()).orders as any[]).find(o => o.id === id)
}

/** One order row of the simulated sheet as { columnTitle: value }. */
export function sheetOrder(id: string): Record<string, any> | undefined {
  const tab = sheetTabs().Orders
  if (!tab) return undefined
  const [titles, ...rows] = tab
  const r = rows.find(x => x[titles.indexOf("Order ID")] === id)
  return r && Object.fromEntries(titles.map((t: string, i: number) => [t, r[i]]))
}

/** Box as 3MF. production=true mimics Bambu Studio / OrcaSlicer: the mesh lives in
 *  3D/Objects/object_1.model and the main model only references it (p:path). */
export function box3mf(x: number, y: number, z: number, { production = false, copies = 1, separateFiles = false } = {}): Buffer {
  const { zipSync, strToU8 } = require("fflate")
  const v = [[0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0], [0, 0, z], [x, 0, z], [x, y, z], [0, y, z]]
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
  const mesh = `<mesh><vertices>${v.map(p => `<vertex x="${p[0]}" y="${p[1]}" z="${p[2]}"/>`).join("")}</vertices>` +
    `<triangles>${f.map(t => `<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join("")}</triangles></mesh>`
  const NS = `xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"`
  const PNS = `xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06"`
  const items = Array.from({ length: copies }, (_, i) =>
    `<item objectid="2" transform="1 0 0 0 1 0 0 0 1 ${128 + i * (x + 10)} 128 0" printable="1"/>`).join("")
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`),
  }
  if (production && separateFiles) {
    // every plate object in its own file, each file numbering its object id="1" (as slicers do)
    const objs: string[] = [], its: string[] = []
    for (let i = 0; i < copies; i++) {
      files[`3D/Objects/object_${i + 1}.model`] = strToU8(`<?xml version="1.0"?><model unit="millimeter" ${NS}><resources><object id="1" type="model">${mesh}</object></resources><build/></model>`)
      objs.push(`<object id="${i + 2}" name="Part ${i + 1}" type="model"><components><component p:path="/3D/Objects/object_${i + 1}.model" objectid="1"/></components></object>`)
      its.push(`<item objectid="${i + 2}" transform="1 0 0 0 1 0 0 0 1 ${128 + i * (x + 10)} 128 0" printable="1"/>`)
    }
    files["3D/3dmodel.model"] = strToU8(`<?xml version="1.0"?><model unit="millimeter" ${NS} ${PNS} requiredextensions="p"><resources>${objs.join("")}</resources><build>${its.join("")}</build></model>`)
  } else if (production) {
    files["3D/Objects/object_1.model"] = strToU8(`<?xml version="1.0"?><model unit="millimeter" ${NS}><resources><object id="1" type="model">${mesh}</object></resources><build/></model>`)
    files["3D/3dmodel.model"] = strToU8(`<?xml version="1.0"?><model unit="millimeter" ${NS} ${PNS} requiredextensions="p"><resources>` +
      `<object id="2" name="Totem" type="model"><components><component p:path="/3D/Objects/object_1.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></components></object>` +
      `</resources><build>${items}</build></model>`)
  } else {
    files["3D/3dmodel.model"] = strToU8(`<?xml version="1.0"?><model unit="millimeter" ${NS}><resources><object id="2" type="model">${mesh}</object></resources><build>${items}</build></model>`)
  }
  return Buffer.from(zipSync(files))
}
