// Shared (client + server) helpers for Shopee product links.

export interface ShopeeProduct {
  id: string
  name: string
  url: string
  price: number | null
  imageUrl: string | null
  description: string | null
  active: boolean
  sortOrder: number
  createdAt: string
}

export type ShopeeProductInput = {
  name: string
  url: string
  price?: number | string | null
  imageUrl?: string | null
  description?: string | null
  active?: boolean
  sortOrder?: number
}

const SHOPEE_HOST = /(^|\.)shopee\.(co\.th|com|sg|com\.my|ph|vn|tw|co\.id|com\.br)$/i
const SHORT_HOSTS = new Set(["shp.ee", "s.shopee.co.th", "th.shp.ee"])

/** Normalise a pasted link: trim, add https://, reject anything that is not Shopee. */
export function normalizeShopeeUrl(raw: string): string | null {
  let s = (raw || "").trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = "https://" + s
  let u: URL
  try { u = new URL(s) } catch { return null }
  const host = u.hostname.toLowerCase()
  if (!SHOPEE_HOST.test(host) && !SHORT_HOSTS.has(host)) return null
  u.protocol = "https:"
  u.hash = ""
  return u.toString()
}

export function isShopeeUrl(raw: string): boolean {
  return normalizeShopeeUrl(raw) !== null
}

/** Extract shop/item ids from the two Shopee product URL formats (null for shop or short links). */
export function parseShopeeIds(raw: string): { shopId: string; itemId: string } | null {
  const url = normalizeShopeeUrl(raw)
  if (!url) return null
  const { pathname } = new URL(url)
  // https://shopee.co.th/Some-Name-i.9883965.23456789012
  let m = pathname.match(/-i\.(\d+)\.(\d+)/)
  if (m) return { shopId: m[1], itemId: m[2] }
  // https://shopee.co.th/product/9883965/23456789012
  m = pathname.match(/\/product\/(\d+)\/(\d+)/)
  if (m) return { shopId: m[1], itemId: m[2] }
  return null
}

/** Best-effort product name from a "Some-Product-Name-i.1.2" style URL. */
export function guessNameFromUrl(raw: string): string {
  const url = normalizeShopeeUrl(raw)
  if (!url) return ""
  const seg = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean)[0] || "")
  const m = seg.match(/^(.*)-i\.\d+\.\d+$/)
  if (!m) return ""
  return m[1].replace(/-/g, " ").replace(/\s+/g, " ").trim()
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

function cleanImageUrl(v: unknown): string | null {
  const t = cleanText(v, 2000)
  if (!t) return null
  try {
    const u = new URL(t)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
  } catch { return null }
}

/** Validate input from the admin form. Returns either clean fields or an error message (Thai). */
export function validateProductInput(
  input: Partial<ShopeeProductInput>,
  { partial = false } = {}
): { ok: true; value: Partial<Omit<ShopeeProduct, "id" | "createdAt">> } | { ok: false; error: string } {
  const value: Partial<Omit<ShopeeProduct, "id" | "createdAt">> = {}

  if (!partial || input.url !== undefined) {
    const url = normalizeShopeeUrl(String(input.url ?? ""))
    if (!url) return { ok: false, error: "ลิงก์ต้องเป็นลิงก์สินค้าจาก Shopee (เช่น https://shopee.co.th/...)" }
    value.url = url
  }
  if (!partial || input.name !== undefined) {
    const name = cleanText(input.name, 200)
    if (!name) return { ok: false, error: "กรุณากรอกชื่อสินค้า" }
    value.name = name
  }
  if (input.price !== undefined) {
    if (input.price === null || input.price === "") value.price = null
    else {
      const p = Number(input.price)
      if (!Number.isFinite(p) || p < 0) return { ok: false, error: "ราคาต้องเป็นตัวเลขที่ไม่ติดลบ" }
      value.price = Math.round(p * 100) / 100
    }
  }
  if (input.imageUrl !== undefined) {
    if (input.imageUrl && !cleanImageUrl(input.imageUrl)) return { ok: false, error: "ลิงก์รูปภาพไม่ถูกต้อง" }
    value.imageUrl = cleanImageUrl(input.imageUrl)
  }
  if (input.description !== undefined) value.description = cleanText(input.description, 500)
  if (input.active !== undefined) value.active = Boolean(input.active)
  if (input.sortOrder !== undefined) {
    const n = Number(input.sortOrder)
    value.sortOrder = Number.isFinite(n) ? Math.trunc(n) : 0
  }
  return { ok: true, value }
}
