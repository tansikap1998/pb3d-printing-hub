// Server-only persistence for Shopee product links.
//
// Production: Supabase table `shopee_products` (see supabase/migrations/01_shopee_products.sql)
//   using SUPABASE_SERVICE_ROLE_KEY so writes never depend on public RLS policies.
// Development / no Supabase: a JSON file (default .data/shopee-products.json).
import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import type { ShopeeProduct } from "./shopee"

type Fields = Partial<Omit<ShopeeProduct, "id" | "createdAt">>

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export const storageMode: "supabase" | "file" =
  SUPABASE_URL && SERVICE_KEY && !SUPABASE_URL.includes("placeholder") ? "supabase" : "file"

let _sb: SupabaseClient | null = null
function sb() {
  if (!_sb) _sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  return _sb
}

const TABLE = "shopee_products"

function fromRow(r: any): ShopeeProduct {
  return {
    id: r.id, name: r.name, url: r.url,
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    imageUrl: r.image_url ?? null, description: r.description ?? null,
    active: r.active !== false, sortOrder: r.sort_order ?? 0, createdAt: r.created_at,
  }
}
function toRow(f: Fields) {
  const r: Record<string, unknown> = {}
  if (f.name !== undefined) r.name = f.name
  if (f.url !== undefined) r.url = f.url
  if (f.price !== undefined) r.price = f.price
  if (f.imageUrl !== undefined) r.image_url = f.imageUrl
  if (f.description !== undefined) r.description = f.description
  if (f.active !== undefined) r.active = f.active
  if (f.sortOrder !== undefined) r.sort_order = f.sortOrder
  return r
}

// ── File backend ────────────────────────────────────────────────────────────
const DATA_FILE = process.env.SHOPEE_DATA_FILE || path.join(process.cwd(), ".data", "shopee-products.json")

async function readFile(): Promise<ShopeeProduct[]> {
  try { return JSON.parse(await fs.readFile(DATA_FILE, "utf8")) } catch { return [] }
}
async function writeFile(list: ShopeeProduct[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true })
  const tmp = DATA_FILE + ".tmp"
  await fs.writeFile(tmp, JSON.stringify(list, null, 2))
  await fs.rename(tmp, DATA_FILE)
}
// serialise file writes so concurrent requests don't clobber each other
let queue: Promise<unknown> = Promise.resolve()
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}

const sortList = (l: ShopeeProduct[]) =>
  [...l].sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt))

// ── Public API ──────────────────────────────────────────────────────────────
export async function listProducts({ activeOnly = false } = {}): Promise<ShopeeProduct[]> {
  if (storageMode === "supabase") {
    let q = sb().from(TABLE).select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
    if (activeOnly) q = q.eq("active", true)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map(fromRow)
  }
  const list = sortList(await readFile())
  return activeOnly ? list.filter(p => p.active) : list
}

export async function createProduct(f: Fields & { name: string; url: string }): Promise<ShopeeProduct> {
  if (storageMode === "supabase") {
    const { data, error } = await sb().from(TABLE).insert(toRow({ active: true, sortOrder: 0, ...f })).select().single()
    if (error) throw error
    return fromRow(data)
  }
  return locked(async () => {
    const list = await readFile()
    const p: ShopeeProduct = {
      id: randomUUID(), name: f.name, url: f.url,
      price: f.price ?? null, imageUrl: f.imageUrl ?? null, description: f.description ?? null,
      active: f.active ?? true, sortOrder: f.sortOrder ?? 0, createdAt: new Date().toISOString(),
    }
    await writeFile([p, ...list])
    return p
  })
}

export async function updateProduct(id: string, f: Fields): Promise<ShopeeProduct | null> {
  if (storageMode === "supabase") {
    const { data, error } = await sb().from(TABLE).update(toRow(f)).eq("id", id).select().maybeSingle()
    if (error) throw error
    return data ? fromRow(data) : null
  }
  return locked(async () => {
    const list = await readFile()
    const idx = list.findIndex(p => p.id === id)
    if (idx < 0) return null
    const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))
    list[idx] = { ...list[idx], ...clean }
    await writeFile(list)
    return list[idx]
  })
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (storageMode === "supabase") {
    const { data, error } = await sb().from(TABLE).delete().eq("id", id).select("id")
    if (error) throw error
    return (data || []).length > 0
  }
  return locked(async () => {
    const list = await readFile()
    const next = list.filter(p => p.id !== id)
    if (next.length === list.length) return false
    await writeFile(next)
    return true
  })
}
