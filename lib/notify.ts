import { db, type Order } from "./sheetsDb"
import { getQuoteConfig } from "./quoteConfigServer"
import { STATUS_LABELS, type OrderStatus } from "./orderInput"

// E-mail notifications, sent by the Apps Script backend from the Google account
// that owns the sheet (MailApp). A failed e-mail never fails the request.

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!))
const baht = (n: unknown) => `฿${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
export const orderNo = (id: string) => id.split("-")[0].toUpperCase()

export async function sendMail(to: string | undefined | null, subject: string, html: string) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false
  try { await db.mail.send({ to, subject, html }); return true }
  catch (e) { console.error("mail failed:", subject, e); return false }
}

function layout(title: string, body: string, link?: { href: string; label: string }) {
  return `<div style="font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;max-width:560px;margin:auto;color:#111">
  <p style="font-size:20px;font-weight:700;margin:0 0 4px">PB3D HUB</p>
  <h2 style="font-size:18px;margin:16px 0 8px">${esc(title)}</h2>
  ${body}
  ${link ? `<p style="margin:24px 0"><a href="${esc(link.href)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">${esc(link.label)}</a></p>` : ""}
  <p style="color:#888;font-size:12px;margin-top:24px">อีเมลนี้ส่งอัตโนมัติจาก PB3D Hub</p></div>`
}

function itemsTable(o: Partial<Order>) {
  let items: { label: string; amount: number }[] = []
  try { items = JSON.parse(o.price_items || "[]") } catch {}
  const rows = items.map(i => `<tr><td style="padding:4px 0">${esc(i.label)}</td><td style="text-align:right">${baht(i.amount)}</td></tr>`).join("")
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    <tr><td style="padding:8px 0;border-top:1px solid #ddd;font-weight:700">ยอดรวม</td><td style="text-align:right;border-top:1px solid #ddd;font-weight:700">${baht(o.total_price)}</td></tr></table>`
}

/** Customer: the order's status changed (or it was just placed). */
export async function notifyCustomer(o: Order, origin: string) {
  const status = o.status as OrderStatus
  const no = orderNo(o.id)
  const href = `${origin}/checkout/${o.id}`
  const lines: string[] = [`<p>สถานะคำสั่งซื้อ <b>#${no}</b>: <b>${esc(STATUS_LABELS[status] ?? status)}</b></p>`]
  if (status === "reviewing") lines.push(`<p>ร้านได้รับไฟล์แล้ว จะตรวจไฟล์และยืนยันราคาให้เร็วที่สุด ราคาประมาณการ ${baht(o.total_price)}</p>`)
  if (status === "pending") lines.push(`<p>ร้านยืนยันราคาแล้ว กรุณาชำระเงินผ่าน PromptPay/โอน หรือสั่งผ่าน Shopee ได้ที่ลิงก์ด้านล่าง</p>`, itemsTable(o))
  if (o.shop_note) lines.push(`<p style="background:#f5f5f5;padding:10px;border-radius:8px">ข้อความจากร้าน: ${esc(o.shop_note)}</p>`)
  if (status === "shipped" && o.tracking_number) lines.push(`<p>เลขพัสดุ: <b>${esc(o.tracking_number)}</b></p>`)
  if (o.expected_date && !["delivered", "cancelled"].includes(status)) lines.push(`<p>คาดว่าจะได้รับ: ${esc(o.expected_date)}</p>`)
  return sendMail(o.customer_email, `[PB3D] #${no} ${STATUS_LABELS[status] ?? status}`,
    layout(STATUS_LABELS[status] ?? status, lines.join(""), { href, label: status === "pending" ? "ชำระเงิน" : "ดูสถานะคำสั่งซื้อ" }))
}

/** Shop: something needs attention (new order, payment, no-file request). */
export async function notifyShop(subject: string, bodyHtml: string, link?: { href: string; label: string }) {
  const { cfg } = await getQuoteConfig()
  return sendMail(cfg.contact.shopEmail, `[PB3D ร้าน] ${subject}`, layout(subject, bodyHtml, link))
}

export function orderSummaryHtml(o: Partial<Order>) {
  return `<p><b>${esc(o.customer_name)}</b> · ${esc(o.customer_phone)}${o.customer_email ? ` · ${esc(o.customer_email)}` : ""}</p>
  <p>${esc(o.file_name)} · ${esc(o.material)} · ${esc(o.color)} · ${esc(o.quantity)} ชิ้น · infill ${esc(o.infill)}%</p>
  ${o.addons ? `<p>บริการเสริม: ${esc(o.addons)}${String(o.rush) === "true" || o.rush === true ? " · งานด่วน" : ""}</p>` : ""}
  ${o.file_warnings ? `<p style="color:#b45309">คำเตือนไฟล์: ${esc(o.file_warnings)}</p>` : ""}
  ${itemsTable(o)}`
}

export const requestOrigin = (req: { nextUrl: URL; headers: Headers }) =>
  process.env.PUBLIC_SITE_URL || req.nextUrl.origin
