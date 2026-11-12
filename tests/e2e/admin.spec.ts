import { test, expect, Page } from "@playwright/test"
import {
  isolateNetwork, loginAsAdmin, ADMIN_EMAIL, resetDb, createOrder, submitSlip,
  adminSetStatus, adminGetOrder, sheetTabs,
} from "../helpers"

const row = (page: Page, id: string) => page.locator("div.rounded-3xl", { has: page.getByText(`#${id.slice(-6).toUpperCase()}`) })

test.beforeEach(async ({ page }) => { await resetDb(); await isolateNetwork(page) })

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

// ─── Orders (stored in the Google Sheets emulator) ──────────────────────────
test.describe("Admin orders", () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page) })

  test("stats, filters and revenue", async ({ page, request }) => {
    await createOrder(request)
    const slip = await createOrder(request); await submitSlip(request, slip)
    const printing = await createOrder(request, { totalPrice: 500, subtotal: 500 }); await adminSetStatus(page, printing, "printing")
    const cancelled = await createOrder(request, { totalPrice: 1000, subtotal: 1000 }); await adminSetStatus(page, cancelled, "cancelled")
    await page.reload()

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

  test("full status workflow with tracking number and slip", async ({ page, request }) => {
    const id = await createOrder(request)
    await submitSlip(request, id)
    await page.reload()
    const r = row(page, id)
    await r.getByText("ลูกค้า ทดสอบ").click()
    await expect(r.getByText("จัดส่ง: รับเอง (ฟรี)")).toBeVisible()

    // the slip opens through the admin-only route (stored privately in Drive)
    const href = await r.getByTestId("slip-link").getAttribute("href")
    expect(href).toBe(`/api/admin/orders/${id}/slip`)
    const slip = await page.request.get(href!)
    expect(slip.status()).toBe(200)
    expect(slip.headers()["content-type"]).toBe("image/png")
    expect((await slip.body()).subarray(1, 4).toString()).toBe("PNG")

    await r.getByRole("button", { name: "✓ Confirm" }).click()
    await expect(r.getByText("ยืนยันแล้ว")).toBeVisible()
    expect((await adminGetOrder(page, id)).status).toBe("confirmed")
    expect((await adminGetOrder(page, id)).has_slip).toBe(true) // slip survives a status update
    await expect(r.getByRole("button", { name: "✓ Confirm" })).toBeDisabled()

    await r.getByRole("button", { name: "⬡ Printing" }).click()
    await expect(r.getByText("กำลังพิมพ์")).toBeVisible()

    // ship without tracking → blocked (in the UI and by the API)
    page.once("dialog", d => { expect(d.message()).toContain("เลขพัสดุ"); d.accept() })
    await r.getByRole("button", { name: "→ Ship" }).click()
    expect((await adminGetOrder(page, id)).status).toBe("printing")
    expect((await page.request.patch(`/api/admin/orders/${id}`, { data: { status: "shipped" } })).status()).toBe(400)
    expect((await page.request.patch(`/api/admin/orders/${id}`, { data: { status: "shipped", trackingNumber: "  " } })).status()).toBe(400)

    // save tracking (persists) then ship
    await r.getByPlaceholder("กรอกเลขพัสดุ...").fill("TH123456789")
    await r.getByRole("button", { name: "บันทึก" }).click()
    await expect(r.getByRole("button", { name: "✓ บันทึกแล้ว" })).toBeVisible()
    expect((await adminGetOrder(page, id)).tracking_number).toBe("TH123456789")
    await page.reload()
    await row(page, id).getByText("ลูกค้า ทดสอบ").click()
    await expect(row(page, id).getByText("TH123456789").first()).toBeVisible()

    await row(page, id).getByRole("button", { name: "→ Ship" }).click()
    await expect(row(page, id).getByText("จัดส่งแล้ว")).toBeVisible()
    await row(page, id).getByRole("button", { name: "✓ Delivered" }).click()
    await expect(row(page, id).getByText("ส่งถึงแล้ว")).toBeVisible()
    expect((await adminGetOrder(page, id)).status).toBe("delivered")
    await expect(row(page, id).getByRole("button", { name: "✕ Cancel" })).toBeDisabled()
  })

  test("cancel asks for confirmation and locks the order", async ({ page, request }) => {
    const id = await createOrder(request)
    await page.reload()
    const r = row(page, id)
    await r.getByText("ลูกค้า ทดสอบ").click()
    page.once("dialog", d => d.dismiss())
    await r.getByRole("button", { name: "✕ Cancel" }).click()
    expect((await adminGetOrder(page, id)).status).toBe("pending")
    page.once("dialog", d => d.accept())
    await r.getByRole("button", { name: "✕ Cancel" }).click()
    await expect(r.getByText("ยกเลิก", { exact: true })).toBeVisible()
    for (const b of ["✓ Confirm", "⬡ Printing", "→ Ship", "✓ Delivered", "✕ Cancel"])
      await expect(r.getByRole("button", { name: b })).toBeDisabled()
    // a cancelled order no longer accepts a slip
    const late = await request.post(`/api/orders/${id}/slip`, { multipart: { file: { name: "s.png", mimeType: "image/png", buffer: Buffer.from("x") } } })
    expect(late.status()).toBe(409)
  })

  test("order details show up in admin and in the sheet", async ({ page, request }) => {
    const id = await createOrder(request, {
      customer: { name: "สมชาย", phone: "0899999999", address: "Chiang Mai", email: "" },
      fileName: "bracket.stl", material: "PETG", color: "black", infill: 50, layerHeight: 0.08, quantity: 3,
      notes: "จัดส่ง: ส่งไปรษณีย์ (+฿45)",
    })
    await page.reload()
    const r = row(page, id)
    await r.getByText("สมชาย").click()
    await expect(r.getByText("PETG (FDM)")).toBeVisible()
    await expect(r.getByText("black")).toBeVisible()
    await expect(r.getByText("0.08mm / 50%")).toBeVisible()
    await expect(r.getByText("3 ชิ้น")).toBeVisible()
    await expect(r.getByText("จัดส่ง: ส่งไปรษณีย์ (+฿45)")).toBeVisible()
    await expect(r.getByRole("link", { name: /Email/ })).toHaveCount(0) // no email given

    // the row really is in the "Orders" tab, phone kept as text with its leading zero
    const [titles, data] = sheetTabs().Orders
    const cell = (title: string) => data[titles.indexOf(title)]
    expect(cell("Order ID")).toBe(id)
    expect(cell("ชื่อลูกค้า")).toBe("สมชาย")
    expect(cell("เบอร์โทร")).toBe("0899999999")
    expect(cell("สถานะ")).toBe("pending")
    expect(cell("ยอดรวม (บาท)")).toBe(365)
    expect(cell("วันที่สั่ง")).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+07:00$/)
  })
})

test("admin order API: visitors are rejected, ids are checked", async ({ page, request }) => {
  const id = await createOrder(request)
  expect((await request.patch(`/api/admin/orders/${id}`, { data: { status: "delivered" } })).status()).toBe(401)
  expect((await request.get("/api/admin/orders")).status()).toBe(401)
  expect((await request.get(`/api/admin/orders/${id}/slip`)).status()).toBe(401)
  await loginAsAdmin(page)
  expect((await page.request.patch("/api/admin/orders/not-a-uuid", { data: { status: "delivered" } })).status()).toBe(404)
  expect((await page.request.patch("/api/admin/orders/11111111-2222-4333-8444-555555555555", { data: { status: "confirmed" } })).status()).toBe(404)
  expect((await page.request.patch(`/api/admin/orders/${id}`, { data: { status: "bogus" } })).status()).toBe(400)
  expect((await page.request.get(`/api/admin/orders/${id}/slip`)).status()).toBe(404) // no slip yet
})

test("public order API: no listing, no personal data, validated input", async ({ request }) => {
  expect((await request.get("/api/orders")).status()).toBe(405) // there is no "list all orders"
  expect((await request.get("/api/orders/not-a-uuid")).status()).toBe(404)
  expect((await request.get("/api/orders/11111111-2222-4333-8444-555555555555")).status()).toBe(404)
  expect((await request.post("/api/orders", { data: {} })).status()).toBe(400)
  expect((await request.post("/api/orders", { data: { customer: { name: "x", phone: "1", address: "a" }, totalPrice: -1 } })).status()).toBe(400)

  const id = await createOrder(request)
  const pub = (await (await request.get(`/api/orders/${id}`)).json()).order
  expect(pub).toMatchObject({ id, status: "pending", total_price: 365, has_slip: false,
    customer_name: "ลูกค้า ทดสอบ", customer_phone_masked: "081-xxx-5678", file_name: "part.stl", quantity: 1 })
  // never the full phone, address or email
  const json = JSON.stringify(pub)
  expect(json).not.toContain("0812345678")
  expect(json).not.toContain("Bangkok")
  expect(pub).not.toHaveProperty("customer_phone")
  expect(pub).not.toHaveProperty("customer_address")
  expect(pub).not.toHaveProperty("customer_email")

  expect((await request.post(`/api/orders/not-a-uuid/slip`, { multipart: { file: { name: "s.png", mimeType: "image/png", buffer: Buffer.from("x") } } })).status()).toBe(404)
  expect((await request.post(`/api/orders/${id}/slip`, { multipart: { file: { name: "s.gif", mimeType: "image/gif", buffer: Buffer.from("x") } } })).status()).toBe(400)
})

// ─── Shopee products ─────────────────────────────────────────────────────────
test.describe("Shopee product links", () => {
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
