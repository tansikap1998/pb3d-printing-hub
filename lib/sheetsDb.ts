import { NextResponse } from "next/server"

// Server-only data access. Everything (orders, payment slips, Shopee products,
// cookie consent) lives in a Google Sheet behind a Google Apps Script web app
// (integrations/google-sheets/Code.gs). The browser never talks to it directly.
//
//   GOOGLE_SHEETS_WEBHOOK_URL + GOOGLE_SHEETS_WEBHOOK_SECRET → the real sheet
//   SHEETS_EMULATOR_FILE (dev/tests only)                    → local emulator
//   neither                                                  → SheetsNotConfigured (routes answer 503)

export class SheetsNotConfigured extends Error {
  constructor() { super("Google Sheets backend is not configured") }
}
export class SheetsError extends Error {}

export interface Order {
  id: string; created_at: string; updated_at: string; status: string
  customer_name: string; customer_phone: string; customer_email: string; customer_address: string
  file_name: string; technology: string; material: string; color: string
  quantity: number | null; infill: number | null; layer_height: number | null; notes: string
  volume_cm3: number | null; weight_g: number | null; print_time_min: number | null
  base_price: number | null; total_price: number | null
  tracking_number: string; slip_file_id: string
}

export interface ProductRow {
  id: string; created_at: string; name: string; url: string; price: number | null
  image_url: string; description: string; active: boolean; sort_order: number | null
}

export const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbxDoYlmwXFYDcrA87CuQWk7nUbdB4ApSYNM51vfbiLsWcNci3yZYN4a39VP9YtQnx24/exec"

const cfg = () => ({
  // The shop's deployed Apps Script web app. Not a secret (anyone can open it);
  // the WEBHOOK_SECRET is what protects it. Override with GOOGLE_SHEETS_WEBHOOK_URL.
  url: process.env.GOOGLE_SHEETS_WEBHOOK_URL ?? DEFAULT_WEBHOOK_URL,
  // tolerate copy-paste slips in the Vercel dashboard: spaces, newlines, quotes
  secret: (process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || "").trim().replace(/^["']|["']$/g, "").trim(),
  emulator: process.env.SHEETS_EMULATOR_FILE || "",
})

export function backendMode(): "apps-script" | "emulator" | null {
  const c = cfg()
  if (c.url && c.secret) return "apps-script"
  // never on Vercel: its disk is temporary, so emulator data would silently disappear
  if (c.emulator && !process.env.VERCEL) return "emulator"
  return null
}
export const isConfigured = () => backendMode() !== null

/** "2026-11-12T14:03:22+07:00" — readable in the sheet and still valid ISO 8601. */
export function nowBangkok(d: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d)
  const g = (t: string) => p.find(x => x.type === t)?.value ?? "00"
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}:${g("second")}+07:00`
}

/** Call one action of the Apps Script backend. Throws on any failure. */
export async function rpc<T = any>(
  action: string,
  payload: Record<string, unknown> = {},
  { fetchImpl = fetch, timeoutMs = 15000 }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<T> {
  const mode = backendMode()
  if (!mode) throw new SheetsNotConfigured()
  const c = cfg()
  const body = { ...payload, action, now: nowBangkok() }

  let data: any
  if (mode === "emulator") {
    const { emulatorPost } = await import("./sheetsEmulator")
    data = emulatorPost(c.emulator, "emulator-secret", { ...body, secret: "emulator-secret" })
  } else {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(c.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, secret: c.secret }),
        signal: ctrl.signal,
        redirect: "follow", // Apps Script answers through a redirect to googleusercontent.com
        cache: "no-store",
      })
      data = await res.json().catch(() => null)
      if (!res.ok) throw new SheetsError(`Google Sheets HTTP ${res.status}`)
    } catch (e) {
      if (e instanceof SheetsError) throw e
      throw new SheetsError((e as Error)?.name === "AbortError" ? "Google Sheets timeout" : `Google Sheets unreachable: ${e}`)
    } finally {
      clearTimeout(timer)
    }
  }
  if (!data || data.ok !== true) throw new SheetsError(`Google Sheets error: ${data?.error ?? "invalid reply"}`)
  return data as T
}

export const db = {
  orders: {
    create: (order: Partial<Order> & { id: string }) => rpc<{ order: Order }>("orders.create", { order }).then(r => r.order),
    get: (id: string) => rpc<{ order: Order | null }>("orders.get", { id }).then(r => r.order),
    list: () => rpc<{ orders: Order[] }>("orders.list").then(r => r.orders),
    update: (id: string, patch: Partial<Order>, ifStatusIn?: string[]) =>
      rpc<{ order: Order | null; conflict?: boolean }>("orders.update", { id, patch, ifStatusIn }),
    submitSlip: (id: string, file: { base64: string; mimeType: string; ext: string }) =>
      rpc<{ order: Order | null; conflict?: boolean }>("orders.submitSlip", { id, ...file }, { timeoutMs: 30000 }),
    slip: (orderId: string) =>
      rpc<{ slip: { mimeType: string; name: string; base64: string } | null }>("slips.get", { orderId }, { timeoutMs: 30000 }).then(r => r.slip),
    import: (orders: Partial<Order>[]) => rpc<{ rows: number[] }>("orders.import", { orders }, { timeoutMs: 60000 }),
  },
  products: {
    list: (activeOnly = false) => rpc<{ products: ProductRow[] }>("products.list", { activeOnly }).then(r => r.products),
    create: (product: ProductRow) => rpc<{ product: ProductRow }>("products.create", { product }).then(r => r.product),
    update: (id: string, patch: Partial<ProductRow>) =>
      rpc<{ product: ProductRow | null }>("products.update", { id, patch }).then(r => r.product),
    delete: (id: string) => rpc<{ deleted: boolean }>("products.delete", { id }).then(r => r.deleted),
  },
  consent: {
    add: (entry: { necessary: boolean; analytics: boolean; marketing: boolean; user_agent: string }) =>
      rpc("consent.add", { entry: { ...entry, created_at: nowBangkok() } }),
  },
}

/** Standard JSON error for a backend failure (503 when not set up, 502 when the sheet failed). */
export function backendErrorResponse(e: unknown, label: string) {
  if (e instanceof SheetsNotConfigured)
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Google Sheets (GOOGLE_SHEETS_WEBHOOK_SECRET)" }, { status: 503 })
  console.error(label, e)
  return NextResponse.json({ error: "ระบบหลังบ้าน (Google Sheets) ไม่ตอบสนอง กรุณาลองใหม่" }, { status: 502 })
}
