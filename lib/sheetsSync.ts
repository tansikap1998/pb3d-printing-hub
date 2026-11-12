// Mirror orders into a Google Sheet through a Google Apps Script web app
// (integrations/google-sheets/Code.gs). Supabase stays the source of truth:
// a sheet failure is logged and never breaks ordering.

// read at call time so the settings can change without a code change (and in tests)
const cfg = () => ({
  url: process.env.GOOGLE_SHEETS_WEBHOOK_URL || "",
  secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || "",
})
export const sheetsConfigured = () => { const c = cfg(); return !!c.url && !!c.secret }

const STATUS_TH: Record<string, string> = {
  pending: "รอชำระเงิน", awaiting_verification: "รอตรวจสลิป", confirmed: "ยืนยันแล้ว",
  printing: "กำลังพิมพ์", shipped: "จัดส่งแล้ว", delivered: "ส่งถึงแล้ว", cancelled: "ยกเลิก",
}

/** "2026-11-12 14:03" in Thai time. */
export function bangkokTime(iso: string | Date): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d)
  const g = (t: string) => p.find(x => x.type === t)?.value ?? ""
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`
}

/** One sheet row per order. Keys must match HEADERS in Code.gs. */
export function orderToSheetRow(o: Record<string, any>, now: Date = new Date()) {
  return {
    id: String(o.id),
    created_at: o.created_at ? bangkokTime(o.created_at) : "",
    status: STATUS_TH[o.status] ? `${STATUS_TH[o.status]} (${o.status})` : String(o.status ?? ""),
    customer_name: o.customer_name ?? "",
    customer_phone: o.customer_phone ?? "",
    customer_email: o.customer_email ?? "",
    customer_address: o.customer_address ?? "",
    file_name: o.file_name ?? "",
    material: o.material ?? "",
    color: o.color ?? "",
    quantity: o.quantity ?? "",
    infill: o.infill ?? "",
    layer_height: o.layer_height ?? "",
    notes: o.notes ?? "",
    total_price: o.total_price === null || o.total_price === undefined ? "" : Number(o.total_price),
    tracking_number: o.tracking_number ?? "",
    has_slip: o.slip_url ? "มี" : "",
    updated_at: bangkokTime(now),
  }
}

/**
 * Backfill: send many orders in batches. Returns how many were written.
 */
export async function syncOrdersToSheet(
  orders: Record<string, any>[],
  { fetchImpl = fetch, batchSize = 100, timeoutMs = 25000 }: { fetchImpl?: typeof fetch; batchSize?: number; timeoutMs?: number } = {}
): Promise<{ ok: boolean; written: number; error?: string }> {
  if (!sheetsConfigured()) return { ok: false, written: 0, error: "not configured" }
  const { url, secret } = cfg()
  let written = 0
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize).map(o => orderToSheetRow(o))
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, orders: batch }), signal: ctrl.signal, redirect: "follow",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) return { ok: false, written, error: data?.error || `HTTP ${res.status}` }
      written += batch.length
    } catch (e) {
      return { ok: false, written, error: (e as Error)?.name === "AbortError" ? "timeout" : String(e) }
    } finally { clearTimeout(timer) }
  }
  return { ok: true, written }
}

/**
 * Send one order to the sheet. Never throws; resolves to true when the script
 * confirmed the write. Bounded by a timeout so a slow sheet can't hold up a
 * customer's request.
 */
export async function syncOrderToSheet(
  order: Record<string, any> | null | undefined,
  { fetchImpl = fetch, timeoutMs = 4000 }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<boolean> {
  if (!order || !sheetsConfigured()) return false
  const { url, secret } = cfg()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, order: orderToSheetRow(order) }),
      signal: ctrl.signal,
      redirect: "follow", // Apps Script answers through a redirect to googleusercontent.com
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      console.error("sheets sync failed", res.status, data?.error ?? "")
      return false
    }
    return true
  } catch (e) {
    console.error("sheets sync error", (e as Error)?.name === "AbortError" ? "timeout" : e)
    return false
  } finally {
    clearTimeout(timer)
  }
}
