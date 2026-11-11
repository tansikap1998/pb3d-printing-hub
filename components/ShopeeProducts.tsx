"use client"
import { useEffect, useState } from "react"
import { ShoppingCart, ExternalLink, Package } from "lucide-react"
import type { ShopeeProduct } from "@/lib/shopee"

const SHOP_URL = "https://shopee.co.th/shop/9883965"

export default function ShopeeProducts({ lang }: { lang: "TH" | "EN" }) {
  const [products, setProducts] = useState<ShopeeProduct[] | null>(null)
  const th = lang === "TH"

  useEffect(() => {
    let cancelled = false
    fetch("/api/shopee-products")
      .then(r => (r.ok ? r.json() : { products: [] }))
      .then(d => { if (!cancelled) setProducts(d.products || []) })
      .catch(() => { if (!cancelled) setProducts([]) })
    return () => { cancelled = true }
  }, [])

  // Nothing to show → keep the home page clean
  if (!products || products.length === 0) return null

  return (
    <section id="shop" data-testid="shopee-products" className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              {th ? "สินค้าพร้อมส่งจาก Shopee" : "Ready-made products on Shopee"}
            </h2>
            <p className="text-muted-foreground text-lg">
              {th ? "เลือกสินค้าที่พิมพ์ไว้แล้ว กดสั่งซื้อผ่านร้าน PB-3D บน Shopee ได้ทันที" : "Pick a ready-made print and order it from our Shopee store."}
            </p>
          </div>
          <a href={SHOP_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {th ? "ดูสินค้าทั้งหมดในร้าน" : "See the whole store"} <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map(p => (
            <article key={p.id} data-testid="shopee-product-card"
              className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-muted-foreground/40 transition-colors">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-muted overflow-hidden" tabIndex={-1} aria-hidden="true">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package className="w-10 h-10" />
                  </div>
                )}
              </a>
              <div className="flex flex-col flex-1 p-5">
                <h3 className="font-semibold tracking-tight leading-snug mb-1 line-clamp-2">{p.name}</h3>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.description}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold">
                    {p.price !== null ? `฿${p.price.toLocaleString()}` : ""}
                  </span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    data-testid="shopee-buy"
                    aria-label={`${th ? "สั่งซื้อ" : "Buy"} ${p.name} ${th ? "บน Shopee" : "on Shopee"}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EE4D2D] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    <ShoppingCart className="w-4 h-4" />
                    {th ? "สั่งซื้อ" : "Buy now"}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
