import { test, expect, Page } from "@playwright/test"
import { promises as fs } from "fs"
import path from "path"
import { isolateNetwork, loginAsAdmin, ADMIN_EMAIL } from "../helpers"

const DATA_FILE = path.join(__dirname, "..", "..", "test-results", "shopee-products.e2e.json")

function makeOrder(over: Record<string, any> = {}) {
  return {
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "pending",
    customer: { name: "ลูกค้า ทดสอบ", email: "", phone: "0812345678", address: "Bangkok" },
    items: { fileName: "part.stl", technology: "FDM", material: "PLA", color: "white", infill: 25, layerHeight: 0.16, quantity: 1, notes: "จัดส่ง: รับเอง (ฟรี)" },
    pricing: { total: 365, subtotal: 365, shippingCost: 0, weightG: 107, printTimeMin: 48 },
    delivery: { trackingNumber: null },
    ...over,
  }
}

async function seedOrders(page: Page, orders: any[]) {
  await page.evaluate(o => localStorage.setItem("pb3d_orders", JSON.stringify(o)), orders)
  await page.reload()
}
const stored = (page: Page, id: string) =>
  page.evaluate(id => JSON.parse(localStorage.getItem("pb3d_orders") || "[]").find((o: any) => o.id === id), id)

const row = (page: Page, id: string) => page.locator("div.rounded-3xl", { has: page.getByText(`#${id.slice(-6).toUpperCase()}`) })

test.beforeEach(async ({ page }) => { await isolateNetwork(page) })

// ─── Auth ────────────────────────────────────────────────────────────────────
test.describe("Admin auth", () => {
  test("dashboard requires login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("wrong password and non-admin email are rejected", async ({ page }) => {
    await page.goto("/admin/login")
    await page.getByPlaceholder("Admin Email").fill(ADMIN_EMAIL)
    await page.getByPlaceholder("••••••••").fill("wrong")
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
    await expect(page.getByText("อีเมล์หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible()
    await page.getByPlaceholder("Admin Email").fill("someone@example.com")
    await page.getByPlaceholder("••••••••").fill("e2e-test-password")
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
    await expect(page.getByText("อีเมล์หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible()
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("login, then logout", async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible()
    await page.getByRole("button", { name: /Logout/ }).click()
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
})

// ─── Orders ──────────────────────────────────────────────────────────────────
test.describe("Admin orders", () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page) })

  test("stats, filters and revenue", async ({ page }) => {
    await seedOrders(page, [
      makeOrder({ status: "pending" }),
      makeOrder({ status: "awaiting_verification", payment: { slip: "data:image/png;base64,AAAA" } }),
      makeOrder({ status: "printing", pricing: { total: 500 } }),
      makeOrder({ status: "cancelled", pricing: { total: 1000 } }),
    ])
    await expect(page.getByText("฿1,230")).toBeVisible() // 365+365+500, cancelled excluded
    await expect(page.getByText("1 คำสั่งซื้อส่งสลิปแล้ว รอตรวจสอบ")).toBeVisible()
    const card = (label: string) => page.getByRole("button", { name: new RegExp(`^\\s*\\d+\\s*${label}\\s*$`) })
    await expect(card("All Orders")).toContainText("4")
    await card("Slip Sent").click()
    await expect(page.getByText(/^#/)).toHaveCount(1)
    await expect(page.getByText("รอตรวจสลิป")).toBeVisible()
    await card("Cancelled").click()
    await expect(page.getByText(/^#/)).toHaveCount(1)
    await card("Delivered").click()
    await expect(page.getByText("No orders found")).toBeVisible()
    await card("All Orders").click()
    await expect(page.getByText(/^#/)).toHaveCount(4)
  })

  test("full status workflow with tracking number", async ({ page }) => {
    const o = makeOrder({ status: "awaiting_verification", payment: { slip: "data:image/png;base64,AAAA" } })
    await seedOrders(page, [o])
    const r = row(page, o.id)
    await r.getByText(o.customer.name).click()
    await expect(r.getByText("จัดส่ง: รับเอง (ฟรี)")).toBeVisible()
    await expect(r.getByTestId("slip-link")).toHaveAttribute("href", /^data:image\/png/)

    await r.getByRole("button", { name: "✓ Confirm" }).click()
    await expect(r.getByText("ยืนยันแล้ว")).toBeVisible()
    expect((await stored(page, o.id)).status).toBe("confirmed")
    // slip/payment data must survive a status update
    expect((await stored(page, o.id)).payment.slip).toContain("data:image")
    await expect(r.getByRole("button", { name: "✓ Confirm" })).toBeDisabled()

    await r.getByRole("button", { name: "⬡ Printing" }).click()
    await expect(r.getByText("กำลังพิมพ์")).toBeVisible()

    // ship without tracking → blocked
    page.once("dialog", d => { expect(d.message()).toContain("เลขพัสดุ"); d.accept() })
    await r.getByRole("button", { name: "→ Ship" }).click()
    expect((await stored(page, o.id)).status).toBe("printing")

    // save tracking (persists) then ship
    await r.getByPlaceholder("กรอกเลขพัสดุ...").fill("TH123456789")
    await r.getByRole("button", { name: "บันทึก" }).click()
    await expect(r.getByRole("button", { name: "✓ บันทึกแล้ว" })).toBeVisible()
    expect((await stored(page, o.id)).delivery.trackingNumber).toBe("TH123456789")
    await page.reload()
    await row(page, o.id).getByText(o.customer.name).click()
    await expect(row(page, o.id).getByText("TH123456789").first()).toBeVisible()

    await row(page, o.id).getByRole("button", { name: "→ Ship" }).click()
    await expect(row(page, o.id).getByText("จัดส่งแล้ว")).toBeVisible()
    await row(page, o.id).getByRole("button", { name: "✓ Delivered" }).click()
    await expect(row(page, o.id).getByText("ส่งถึงแล้ว")).toBeVisible()
    expect((await stored(page, o.id)).status).toBe("delivered")
    await expect(row(page, o.id).getByRole("button", { name: "✕ Cancel" })).toBeDisabled()
  })

  test("cancel asks for confirmation and locks the order", async ({ page }) => {
    const o = makeOrder()
    await seedOrders(page, [o])
    const r = row(page, o.id)
    await r.getByText(o.customer.name).click()
    page.once("dialog", d => d.dismiss())
    await r.getByRole("button", { name: "✕ Cancel" }).click()
    expect((await stored(page, o.id)).status).toBe("pending")
    page.once("dialog", d => d.accept())
    await r.getByRole("button", { name: "✕ Cancel" }).click()
    await expect(r.getByText("ยกเลิก", { exact: true })).toBeVisible()
    for (const b of ["✓ Confirm", "⬡ Printing", "→ Ship", "✓ Delivered", "✕ Cancel"])
      await expect(r.getByRole("button", { name: b })).toBeDisabled()
  })

  test("order placed in the shop shows up in admin with correct details", async ({ page }) => {
    // simulates the record written by /quote
    const o = makeOrder({
      customer: { name: "สมชาย", email: "", phone: "0899999999", address: "Chiang Mai" },
      items: { fileName: "bracket.stl", technology: "FDM", material: "PETG", color: "black", infill: 50, layerHeight: 0.08, quantity: 3, notes: "จัดส่ง: ส่งไปรษณีย์ (+฿45)" },
    })
    await seedOrders(page, [o])
    const r = row(page, o.id)
    await r.getByText("สมชาย").click()
    await expect(r.getByText("PETG (FDM)")).toBeVisible()
    await expect(r.getByText("black")).toBeVisible()
    await expect(r.getByText("0.08mm / 50%")).toBeVisible()
    await expect(r.getByText("3 ชิ้น")).toBeVisible()
    await expect(r.getByText("จัดส่ง: ส่งไปรษณีย์ (+฿45)")).toBeVisible()
    await expect(r.getByRole("link", { name: /Email/ })).toHaveCount(0) // no email given
  })
})

test("admin order API: rejects visitors, needs the service-role key on the server", async ({ page, request }) => {
  const id = "11111111-2222-4333-8444-555555555555"
  expect((await request.patch(`/api/admin/orders/${id}`, { data: { status: "delivered" } })).status()).toBe(401)
  expect((await request.get("/api/admin/orders")).status()).toBe(401)
  await loginAsAdmin(page)
  // test server runs without SUPABASE_SERVICE_ROLE_KEY
  expect((await page.request.patch(`/api/admin/orders/${id}`, { data: { status: "delivered" } })).status()).toBe(503)
  expect((await page.request.patch("/api/admin/orders/not-a-uuid", { data: { status: "delivered" } })).status()).toBe(404)
  expect((await page.request.get("/api/admin/orders")).status()).toBe(503)
})

test("sheet sync API: admin only, and reports when Google Sheets isn't configured", async ({ page, request }) => {
  expect((await request.post("/api/admin/orders/sync-sheet")).status()).toBe(401)
  await loginAsAdmin(page)
  const r = await page.request.post("/api/admin/orders/sync-sheet")
  expect(r.status()).toBe(503)
  expect((await r.json()).error).toContain("GOOGLE_SHEETS_WEBHOOK_URL")
})

test("public order API: no listing, ids must be UUIDs, needs the service-role key", async ({ request }) => {
  const id = "11111111-2222-4333-8444-555555555555"
  expect((await request.get("/api/orders")).status()).toBe(405) // there is no "list all orders"
  expect((await request.get("/api/orders/not-a-uuid")).status()).toBe(404)
  expect((await request.get(`/api/orders/${id}`)).status()).toBe(503)
  expect((await request.post(`/api/orders/not-a-uuid/slip`, { multipart: { file: { name: "s.png", mimeType: "image/png", buffer: Buffer.from("x") } } })).status()).toBe(404)
  expect((await request.post(`/api/orders/${id}/slip`, { multipart: { file: { name: "s.png", mimeType: "image/png", buffer: Buffer.from("x") } } })).status()).toBe(503)
  expect((await request.post("/api/orders", { data: {} })).status()).toBe(503)
})

// ─── Shopee products ─────────────────────────────────────────────────────────
test.describe("Shopee product links", () => {
  test.beforeAll(async () => { await fs.rm(DATA_FILE, { force: true }) })

  test("API: public can read, only admin can write", async ({ request }) => {
    const pub = await request.get("/api/shopee-products")
    expect(pub.status()).toBe(200)
    expect(Array.isArray((await pub.json()).products)).toBe(true)
    expect((await request.get("/api/shopee-products?all=1")).status()).toBe(401)
    expect((await request.post("/api/shopee-products", { data: { name: "x", url: "https://shopee.co.th/x-i.1.2" } })).status()).toBe(401)
    expect((await request.patch("/api/shopee-products/abc", { data: { active: false } })).status()).toBe(401)
    expect((await request.delete("/api/shopee-products/abc")).status()).toBe(401)
  })

  test("home page hides the section when there are no products", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("PB3D Hub").first()).toBeVisible()
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("shopee-products")).toHaveCount(0)
  })

  test("admin adds, edits, hides and deletes a Shopee product; home page shows a working order button", async ({ page, context }) => {
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: "สินค้า Shopee" }).click()
    await expect(page.getByText("ยังไม่มีสินค้า")).toBeVisible()

    const form = page.getByTestId("shopee-form")
    const submit = form.getByRole("button", { name: "เพิ่มสินค้า" })

    // non-Shopee link is rejected client-side
    await form.locator('input[name="url"]').fill("https://www.lazada.co.th/products/abc")
    await expect(form.getByText("ต้องเป็นลิงก์จาก shopee.co.th")).toBeVisible()
    await expect(submit).toBeDisabled()

    // valid link → ids shown, name guessed from slug
    await form.locator('input[name="url"]').fill("https://shopee.co.th/Phone-Stand-PLA-i.9883965.23456789012?sp_atk=abc")
    await expect(form.getByText("Shop ID 9883965 · Item ID 23456789012")).toBeVisible()
    await expect(form.locator('input[name="name"]')).toHaveValue("Phone Stand PLA")
    await form.locator('input[name="name"]').fill("ขาตั้งโทรศัพท์")
    await form.locator('input[name="price"]').fill("199")
    await form.locator('input[name="description"]').fill("PLA หลายสี")
    // bad image URL rejected by the server
    await form.locator('input[name="imageUrl"]').fill("not-a-url")
    await submit.click()
    await expect(form.getByRole("alert")).toContainText("ลิงก์รูปภาพไม่ถูกต้อง")
    await form.locator('input[name="imageUrl"]').fill("")
    await submit.click()
    await expect(form.getByText("เพิ่มสินค้าแล้ว")).toBeVisible()

    const rows = page.getByTestId("shopee-admin-row")
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText("ขาตั้งโทรศัพท์")
    await expect(rows.first()).toContainText("฿199")

    // a second product via a short link
    await form.locator('input[name="url"]').fill("shp.ee/abc123")
    await form.locator('input[name="name"]').fill("กล่องเก็บของ")
    await form.locator('input[name="sortOrder"]').fill("5")
    await submit.click()
    await expect(rows).toHaveCount(2)
    await expect(rows.first()).toContainText("ขาตั้งโทรศัพท์") // sortOrder 0 first

    // edit price
    await rows.first().getByRole("button", { name: "แก้ไขสินค้า" }).click()
    await expect(form.locator('input[name="price"]')).toHaveValue("199")
    await form.locator('input[name="price"]').fill("249")
    await form.getByRole("button", { name: "บันทึกการแก้ไข" }).click()
    await expect(form.getByText("อัปเดตสินค้าแล้ว")).toBeVisible()
    await expect(rows.first()).toContainText("฿249")

    // ── home page shows both with order buttons ──
    const home = await context.newPage()
    await isolateNetwork(home)
    await home.goto("/")
    const section = home.getByTestId("shopee-products")
    await expect(section).toBeVisible()
    await expect(section.getByText("สินค้าพร้อมส่งจาก Shopee")).toBeVisible()
    const cards = section.getByTestId("shopee-product-card")
    await expect(cards).toHaveCount(2)
    await expect(cards.first()).toContainText("ขาตั้งโทรศัพท์")
    await expect(cards.first()).toContainText("฿249")
    const buy = cards.first().getByTestId("shopee-buy")
    await expect(buy).toHaveText(/สั่งซื้อ/)
    await expect(buy).toHaveAttribute("href", "https://shopee.co.th/Phone-Stand-PLA-i.9883965.23456789012?sp_atk=abc")
    await expect(buy).toHaveAttribute("target", "_blank")
    await expect(buy).toHaveAttribute("rel", /noopener/)
    // clicking opens Shopee in a new tab (stub the real site)
    await context.route(/shopee\.co\.th/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<h1>Shopee stub</h1>" }))
    const [popup] = await Promise.all([home.waitForEvent("popup"), buy.click()])
    await popup.waitForLoadState()
    expect(popup.url()).toContain("shopee.co.th/Phone-Stand-PLA-i.9883965.23456789012")
    await popup.close()
    // English label
    await home.getByRole("button", { name: /^EN$/ }).first().click()
    await expect(cards.first().getByTestId("shopee-buy")).toHaveText(/Buy now/)

    // ── hide one → disappears from home ──
    await rows.nth(1).getByRole("button", { name: "ซ่อนสินค้า" }).click()
    await expect(rows.nth(1).getByRole("button", { name: "แสดงสินค้า" })).toBeVisible()
    await home.reload()
    await expect(home.getByTestId("shopee-product-card")).toHaveCount(1)

    // ── delete both → section gone ──
    for (let i = 0; i < 2; i++) {
      page.once("dialog", d => d.accept())
      await rows.first().getByRole("button", { name: "ลบสินค้า" }).click()
      await expect(rows).toHaveCount(1 - i)
    }
    await expect(page.getByText("ยังไม่มีสินค้า")).toBeVisible()
    await home.reload()
    await home.waitForLoadState("networkidle")
    await expect(home.getByTestId("shopee-products")).toHaveCount(0)
  })
})
