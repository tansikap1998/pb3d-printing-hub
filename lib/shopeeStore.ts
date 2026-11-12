// Shopee product links, stored in the "Products" tab of the Google Sheet.
import { randomUUID } from "crypto"
import type { ShopeeProduct } from "./shopee"
import { db, nowBangkok, backendMode, type ProductRow } from "./sheetsDb"

type Fields = Partial<Omit<ShopeeProduct, "id" | "createdAt">>

export const storageMode = () => backendMode()

function fromRow(r: ProductRow): ShopeeProduct {
  return {
    id: r.id, name: r.name, url: r.url,
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    imageUrl: r.image_url || null, description: r.description || null,
    active: r.active !== false, sortOrder: r.sort_order ?? 0, createdAt: r.created_at,
  }
}
function toRow(f: Fields): Partial<ProductRow> {
  const r: Partial<ProductRow> = {}
  if (f.name !== undefined) r.name = f.name
  if (f.url !== undefined) r.url = f.url
  if (f.price !== undefined) r.price = f.price
  if (f.imageUrl !== undefined) r.image_url = f.imageUrl ?? ""
  if (f.description !== undefined) r.description = f.description ?? ""
  if (f.active !== undefined) r.active = f.active
  if (f.sortOrder !== undefined) r.sort_order = f.sortOrder
  return r
}

export async function listProducts({ activeOnly = false } = {}): Promise<ShopeeProduct[]> {
  return (await db.products.list(activeOnly)).map(fromRow)
}

export async function createProduct(f: Fields & { name: string; url: string }): Promise<ShopeeProduct> {
  const row = {
    id: randomUUID(), created_at: nowBangkok(), name: f.name, url: f.url,
    price: f.price ?? null, image_url: f.imageUrl ?? "", description: f.description ?? "",
    active: f.active ?? true, sort_order: f.sortOrder ?? 0,
  } satisfies ProductRow
  return fromRow(await db.products.create(row))
}

export async function updateProduct(id: string, f: Fields): Promise<ShopeeProduct | null> {
  const r = await db.products.update(id, toRow(f))
  return r ? fromRow(r) : null
}

export async function deleteProduct(id: string): Promise<boolean> {
  return db.products.delete(id)
}
