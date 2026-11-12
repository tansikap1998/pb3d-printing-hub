#!/usr/bin/env node
// One-time copy of existing data from Supabase into the Google Sheet backend.
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec \
//   GOOGLE_SHEETS_WEBHOOK_SECRET=... \
//   node scripts/migrate-supabase-to-sheets.mjs [--dry-run]
//
// Copies: orders (all columns), their payment slips (into the private Drive
// folder), Shopee products. Safe to run twice: orders are matched by id, and
// products that already exist in the sheet are skipped.

const env = (k) => {
  const v = process.env[k]
  if (!v) { console.error(`Missing ${k}`); process.exit(1) }
  return v.replace(/\/+$/, "")
}
const SB = env("SUPABASE_URL"), SB_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
const GS = env("GOOGLE_SHEETS_WEBHOOK_URL"), GS_SECRET = env("GOOGLE_SHEETS_WEBHOOK_SECRET")
const DRY = process.argv.includes("--dry-run")
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }

async function sbRows(table) {
  const r = await fetch(`${SB}/rest/v1/${table}?select=*&order=created_at.asc`, { headers: sbHeaders })
  if (r.status === 404) return null // table does not exist
  if (!r.ok) throw new Error(`Supabase ${table}: HTTP ${r.status} ${await r.text()}`)
  return r.json()
}

async function sheet(action, payload = {}) {
  const r = await fetch(GS, {
    method: "POST", headers: { "Content-Type": "application/json" }, redirect: "follow",
    body: JSON.stringify({ ...payload, action, secret: GS_SECRET }),
  })
  const d = await r.json().catch(() => null)
  if (!d?.ok) throw new Error(`Google Sheets ${action}: ${d?.error ?? `HTTP ${r.status}`}`)
  return d
}

/** slip_url may be a storage path ("<id>/<ts>.png") or an old public URL. */
function slipPath(v) {
  if (!v) return null
  const m = String(v).match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/payment_slips\/([^?]+)/)
  if (m) return decodeURIComponent(m[1])
  return /^https?:\/\//.test(v) ? null : v
}
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" }

const iso = (v) => (v ? new Date(v).toISOString() : "")
const ORDER_FIELDS = ["status", "customer_name", "customer_phone", "customer_email", "customer_address", "file_name",
  "technology", "material", "color", "quantity", "infill", "layer_height", "notes", "volume_cm3", "weight_g",
  "print_time_min", "base_price", "total_price", "tracking_number"]

async function main() {
  await sheet("ping")
  console.log(`Connected to Google Sheets${DRY ? " (dry run: nothing will be written)" : ""}`)

  // ── orders ──
  const orders = (await sbRows("orders")) ?? []
  console.log(`Orders in Supabase: ${orders.length}`)
  const rows = orders.map((o) => {
    const row = { id: o.id, created_at: iso(o.created_at) }
    for (const k of ORDER_FIELDS) row[k] = o[k] ?? ""
    return row
  })
  for (let i = 0; i < rows.length && !DRY; i += 50) await sheet("orders.import", { orders: rows.slice(i, i + 50) })

  // ── slips ──
  let slips = 0, missing = 0
  for (const o of orders) {
    const p = slipPath(o.slip_url)
    if (!p) { if (o.slip_url) missing++; continue }
    if (!DRY && (await sheet("orders.get", { id: o.id })).order?.slip_file_id) continue // already copied
    const r = await fetch(`${SB}/storage/v1/object/payment_slips/${p.split("/").map(encodeURIComponent).join("/")}`, { headers: sbHeaders })
    if (!r.ok) { console.warn(`  slip for ${o.id}: HTTP ${r.status} (skipped)`); missing++; continue }
    const mime = (r.headers.get("content-type") || "").split(";")[0]
    const buf = Buffer.from(await r.arrayBuffer())
    if (!DRY) await sheet("slips.attach", { id: o.id, base64: buf.toString("base64"), mimeType: mime || "application/octet-stream", ext: EXT[mime] || p.split(".").pop() || "bin" })
    slips++
  }
  console.log(`Slips copied: ${slips}${missing ? `, not copied: ${missing}` : ""}`)

  // ── Shopee products ──
  const products = (await sbRows("shopee_products")) ?? []
  const existing = new Set((await sheet("products.list")).products.map((p) => p.id))
  let added = 0
  for (const p of products) {
    if (existing.has(p.id)) continue
    if (!DRY) await sheet("products.create", { product: {
      id: p.id, created_at: iso(p.created_at), name: p.name, url: p.url, price: p.price ?? "",
      image_url: p.image_url ?? "", description: p.description ?? "", active: p.active !== false, sort_order: p.sort_order ?? 0,
    } })
    added++
  }
  console.log(`Shopee products copied: ${added} (already there: ${products.length - added})`)
  console.log(DRY ? "Dry run finished." : "Done ✅")
}

main().catch((e) => { console.error(`Failed: ${e.message}`); process.exit(1) })
