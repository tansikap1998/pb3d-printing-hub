import { test, expect } from "@playwright/test"
import { normalizeShopeeUrl, parseShopeeIds, guessNameFromUrl, validateProductInput } from "../../lib/shopee"

test("accepts Shopee product, shop and short links", () => {
  expect(normalizeShopeeUrl("https://shopee.co.th/Phone-Stand-i.9883965.23456789012"))
    .toBe("https://shopee.co.th/Phone-Stand-i.9883965.23456789012")
  expect(normalizeShopeeUrl("  shopee.co.th/product/9883965/123  ")).toBe("https://shopee.co.th/product/9883965/123")
  expect(normalizeShopeeUrl("http://shopee.co.th/shop/9883965")).toBe("https://shopee.co.th/shop/9883965")
  expect(normalizeShopeeUrl("https://s.shopee.co.th/AbCdEf")).toBe("https://s.shopee.co.th/AbCdEf")
  expect(normalizeShopeeUrl("https://shp.ee/xyz123")).toBe("https://shp.ee/xyz123")
  expect(normalizeShopeeUrl("https://shopee.co.th/x-i.1.2#reviews")).toBe("https://shopee.co.th/x-i.1.2")
})

test("rejects non-Shopee and look-alike domains", () => {
  for (const bad of [
    "", "not a url", "https://lazada.co.th/products/x", "https://shopee.co.th.evil.com/x-i.1.2",
    "https://evilshopee.co.th/x", "javascript:alert(1)", "ftp://shopee.co.th/x",
  ]) expect(normalizeShopeeUrl(bad), bad).toBeNull()
})

test("extracts shop / item ids", () => {
  expect(parseShopeeIds("https://shopee.co.th/Phone-Stand-i.9883965.23456789012")).toEqual({ shopId: "9883965", itemId: "23456789012" })
  expect(parseShopeeIds("https://shopee.co.th/product/9883965/555")).toEqual({ shopId: "9883965", itemId: "555" })
  expect(parseShopeeIds("https://shopee.co.th/shop/9883965")).toBeNull()
})

test("guesses a name from the URL slug (incl. Thai)", () => {
  expect(guessNameFromUrl("https://shopee.co.th/Phone-Stand-PLA-i.1.2")).toBe("Phone Stand PLA")
  expect(guessNameFromUrl("https://shopee.co.th/%E0%B8%82%E0%B8%B2%E0%B8%95%E0%B8%B1%E0%B9%89%E0%B8%87-i.1.2")).toBe("ขาตั้ง")
  expect(guessNameFromUrl("https://shopee.co.th/shop/1")).toBe("")
})

test("validates admin input", () => {
  const ok = validateProductInput({ url: "shopee.co.th/a-i.1.2", name: "  Stand ", price: "199.5", imageUrl: "https://x.com/a.jpg" })
  expect(ok).toEqual({ ok: true, value: { url: "https://shopee.co.th/a-i.1.2", name: "Stand", price: 199.5, imageUrl: "https://x.com/a.jpg" } })
  expect(validateProductInput({ url: "https://google.com", name: "x" }).ok).toBe(false)
  expect(validateProductInput({ url: "https://shopee.co.th/a", name: "" }).ok).toBe(false)
  expect(validateProductInput({ url: "https://shopee.co.th/a", name: "x", price: -1 }).ok).toBe(false)
  expect(validateProductInput({ url: "https://shopee.co.th/a", name: "x", imageUrl: "javascript:alert(1)" }).ok).toBe(false)
  // partial update only touches given fields
  expect(validateProductInput({ active: false }, { partial: true })).toEqual({ ok: true, value: { active: false } })
  expect(validateProductInput({ price: "" }, { partial: true })).toEqual({ ok: true, value: { price: null } })
})
