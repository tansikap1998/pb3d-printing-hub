import { test, expect, Page } from "@playwright/test"
import {
  isolateNetwork, loginAsAdmin, ADMIN_EMAIL, resetDb, createOrder, submitSlip,
  adminSetStatus, adminGetOrder, sheetTabs, EMULATOR_FILE,
} from "../helpers"

const row = (page: Page, id: string) => page.locator("div.rounded-3xl", { has: page.getByText(`#${id.slice(-6).toUpperCase()}`) })

test.beforeEach(async ({ page }) => { await resetDb(); await isolateNetwork(page) })

// ─── Auth ────────────────────────────────────────────────────────────────────
test.describe("Admin auth", () => {
  test("dashboard requires login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test("signing in after being sent to the login page lands on the dashboard", async ({ page }) => {
    await page.goto("/admin") // → redirected to /admin/login
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByPlaceholder("Admin Email").fill(ADMIN_EMAIL)
    await page.getByPlaceholder("••••••••").fill("wrong")
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
    await expect(page.getByText("อีเมล์หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible()
    await page.getByPlaceholder("••••••••").fill("e2e-test-password")
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByText("Order Dashboard")).toBeVisible()
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

    // Seller Centre link → explained, can't be saved
    await form.locator('input[name="url"]').fill("https://seller.shopee.co.th/portal/product/24267343976")
    await expect(form.getByTestId("seller-link-warning")).toContainText("Seller Centre")
    await expect(submit).toBeDisabled()

    // valid link → ids shown, name guessed from slug (and re-guessed when the link changes)
    await form.locator('input[name="url"]').fill("https://shopee.co.th/Old-Name-i.1.2")
    await expect(form.locator('input[name="name"]')).toHaveValue("Old Name")
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

test("health endpoint reports backend status without revealing the secret", async ({ request }) => {
  const r = await request.get("/api/health")
  expect(r.status()).toBe(200)
  const h = await r.json()
  expect(h.backend).toBe("emulator")
  expect(h.ping).toEqual({ ok: true })
  expect(h.script).toBe("latest")
  expect(h.secret).toMatchObject({ set: false, length: 0 })
  expect(h.webhookUrl.source).toContain("Vercel") // the e2e server sets the variable (empty)
  expect(JSON.stringify(h)).not.toMatch(/secret"\s*:\s*"/) // never a secret value
})

test.describe("Admins tab in the Google Sheet", () => {
  test("an admin added in the sheet can sign in; disabled or removed ones cannot", async ({ page }) => {
    const { readFileSync, writeFileSync } = await import("fs")
    const { EMULATOR_FILE } = await import("../helpers")
    await page.request.get("/api/health") // makes the emulator create its file
    const db = JSON.parse(readFileSync(EMULATOR_FILE, "utf8"))
    db.sheets.Admins = [["อีเมล", "รหัสผ่าน", "ชื่อ", "ปิดใช้งาน"],
      ["staff@pb3d.test", "sheet-pass-123", "พนักงาน", false],
      ["gone@pb3d.test", "gone-pass", "", true]]
    writeFileSync(EMULATOR_FILE, JSON.stringify(db))

    const login = async (email: string, pw: string) => {
      await page.goto("/admin/login")
      await page.getByPlaceholder("Admin Email").fill(email)
      await page.getByPlaceholder("••••••••").fill(pw)
      await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
    }
    await login("gone@pb3d.test", "gone-pass")
    await expect(page.getByText("อีเมล์หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible()
    await login("staff@pb3d.test", "wrong")
    await expect(page.getByText("อีเมล์หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible()

    await login("staff@pb3d.test", "sheet-pass-123")
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByText("Order Dashboard")).toBeVisible()
    // the session is a real admin session for the APIs too
    expect((await page.request.get("/api/admin/orders")).status()).toBe(200)
  })
})

test.describe("Selling-price calculator", () => {
  test("API is admin only", async ({ request }) => {
    expect((await request.get("/api/admin/sell-pricing")).status()).toBe(401)
    expect((await request.put("/api/admin/sell-pricing", { data: { settings: {} } })).status()).toBe(401)
  })

  test("calculates live, seeds market prices, and saves settings to the sheet", async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
    const root = page.getByTestId("sell-pricing")
    await expect(root).toBeVisible()
    await expect(root.getByText(/สร้างแท็บ MarketPrices/)).toBeVisible()

    // 100 g, 2 h with default settings → total cost ฿126.50; Shopee recommended ฿299
    await page.getByTestId("sp-grams").fill("100")
    await page.getByTestId("sp-hours").fill("2")
    await page.getByTestId("sp-category").selectOption({ label: "อื่น ๆ (ไม่เทียบราคาตลาด)" })
    await expect(page.getByTestId("sp-total-cost")).toHaveText("฿126.50")
    await expect(page.getByTestId("sp-row-shopee").getByTestId("sp-recommended")).toHaveText("฿299")

    // flat 1 ฿/g at any weight
    await page.getByTestId("sp-grams").fill("401")
    await expect(page.getByTestId("sp-cost")).toContainText("ค่าวัสดุ (1 ฿/g)")
    await expect(page.getByTestId("sp-cost")).toContainText("฿401.00")

    // pick another material rate
    await page.getByTestId("sp-material").selectOption({ label: "PETG — 1.2 ฿/g" })
    await expect(page.getByTestId("sp-cost")).toContainText("ค่าวัสดุ (1.2 ฿/g)")
    await expect(page.getByTestId("sp-cost")).toContainText("฿481.20")
    // edit a rate and add a material in the settings
    await page.getByTestId("sp-settings").locator("summary").click()
    await page.getByTestId("sp-material-rate-2").fill("1.5")
    await expect(page.getByTestId("sp-cost")).toContainText("฿601.50")
    await page.getByTestId("sp-material-add").click()
    await page.getByTestId("sp-material-name-6").fill("Resin")
    await page.getByTestId("sp-material-rate-6").fill("3")
    await page.getByTestId("sp-material").selectOption({ label: "Resin — 3 ฿/g" })
    await expect(page.getByTestId("sp-cost")).toContainText("฿1,203.00")
    await page.getByTestId("sp-material").selectOption({ label: "PLA — 1 ฿/g" })
    await page.getByTestId("sp-settings").locator("summary").click()

    // change the minimum profit and save → stored in the Settings tab (materials too)
    await page.getByTestId("sp-settings").locator("summary").click()
    await page.getByTestId("sp-min-profit").fill("60")
    await page.getByTestId("sp-save").click()
    await expect(page.getByRole("status")).toContainText("บันทึกค่าตั้งค่าลง Google Sheet แล้ว")
    const saved = JSON.parse((sheetTabs().Settings ?? []).find(r => r[0] === "sellPricing")?.[1] ?? "{}")
    expect(saved.minProfitPct).toBe(60)
    expect(saved.materials.find((m: any) => m.name === "Resin")?.perG).toBe(3)

    // reload → settings come back from the sheet, market rows from MarketPrices
    await page.reload()
    await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
    await page.getByTestId("sp-settings").locator("summary").click()
    await expect(page.getByTestId("sp-min-profit")).toHaveValue("60")
    expect((sheetTabs().MarketPrices ?? []).length).toBeGreaterThan(5)
    await expect(page.getByTestId("sp-market")).toBeVisible()
  })
})

test("saving to the sheet requires name, weight and print time", async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
  await page.getByTestId("sp-grams").fill("0")
  await page.getByTestId("sp-hours").fill("")
  await page.getByTestId("sp-catalog-save").click()
  await expect(page.getByTestId("sp-catalog-msg")).toHaveText("กรอกช่องที่มีเครื่องหมาย * ให้ครบก่อนบันทึก")
  await expect(page.getByTestId("sp-name-error")).toHaveText("กรอกชื่อสินค้า")
  await expect(page.getByTestId("sp-grams-error")).toHaveText("น้ำหนักต้องมากกว่า 0 g")
  await expect(page.getByTestId("sp-hours-error")).toHaveText("เวลาพิมพ์ต้องมากกว่า 0 ชม.")
  await expect(page.getByTestId("sp-name")).toBeFocused()
  expect(sheetTabs()["PB3D Product 2027"]).toBeUndefined() // nothing sent

  // errors clear as the fields are fixed
  await page.getByTestId("sp-name").fill("ขา")
  await expect(page.getByTestId("sp-name-error")).toContainText("สั้นเกินไป")
  await page.getByTestId("sp-name").fill("ขาตั้งมือถือ")
  await page.getByTestId("sp-grams").fill("80")
  await page.getByTestId("sp-hours").fill("1.5")
  await expect(page.getByTestId("sp-name-error")).toHaveCount(0)
  await expect(page.getByTestId("sp-grams-error")).toHaveCount(0)
  await page.getByTestId("sp-catalog-save").click()
  await expect(page.getByTestId("sp-catalog-msg")).toHaveText("บันทึกลงแท็บ PB3D Product 2027 แล้ว")

  // the API checks too
  const r = await page.request.post("/api/admin/catalog", { data: { product: { id: "abcdef12", name: "", grams: 10, print_hours: 1, category: "x", material: "PLA" } } })
  expect(r.status()).toBe(400)
  expect((await r.json()).errors).toEqual({ name: "กรอกชื่อสินค้า" })
})

test("cost checkboxes and saving the product to the PB3D Product 2027 tab", async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
  await page.getByTestId("sp-name").fill("ขาตั้งมือถือรุ่นแมว")
  await page.getByTestId("sp-category").selectOption({ label: "อื่น ๆ (ไม่เทียบราคาตลาด)" })
  await expect(page.getByTestId("sp-total-cost")).toHaveText("฿126.50")
  await page.getByTestId("sp-include-packaging").uncheck()
  await expect(page.getByTestId("sp-total-cost")).toHaveText("฿111.50")
  await page.getByTestId("sp-include-electricity").uncheck()
  await page.getByTestId("sp-include-depreciation").uncheck()
  await expect(page.getByTestId("sp-total-cost")).toHaveText("฿100.00")
  await page.getByTestId("sp-include-depreciation").check()
  await expect(page.getByTestId("sp-total-cost")).toHaveText("฿110.00")

  await page.getByTestId("ai-generate").click()
  await expect(page.getByTestId("ai-result")).toBeVisible()
  await page.getByTestId("shopee-box-pick").selectOption("1")

  await page.getByTestId("sp-catalog-save").click()
  await expect(page.getByTestId("sp-catalog-msg")).toHaveText("บันทึกลงแท็บ PB3D Product 2027 แล้ว")
  let tab = sheetTabs()["PB3D Product 2027"]
  expect(tab).toHaveLength(2)
  const row = Object.fromEntries(tab[0].map((h: string, i: number) => [h, tab[1][i]]))
  expect(row).toMatchObject({
    "ชื่อสินค้า": "ขาตั้งมือถือรุ่นแมว", "วัสดุ": "PLA", "น้ำหนัก (g)": 100, "เวลาพิมพ์ (ชม.)": 2,
    "ค่าวัสดุ": 100, "ค่าไฟ": 0, "ค่าเสื่อมเครื่อง": 10, "ค่าแพ็กเกจ": 0, "ต้นทุนรวม/ชิ้น": 110,
    "ต้นทุนที่นับรวม": "ค่าวัสดุ, ค่าเสื่อมเครื่อง, ค่าอื่น ๆ",
    "ชื่อสำหรับลงขาย": "ขาตั้งโทรศัพท์ลายแมว ตั้งโต๊ะ", "น้ำหนักพัสดุ (kg)": 0.15,
    "บันทึกโดย": ADMIN_EMAIL,
  })
  expect(row["Shopee ราคาแนะนำ"]).toBeGreaterThan(110)
  expect(String(row["รายละเอียดสินค้า"])).toContain("• ปรับองศาได้ 3 ระดับ")

  // saving again updates the same row; "new product" adds a row
  await page.getByTestId("sp-grams").fill("200")
  await page.getByTestId("sp-catalog-save").click()
  await expect(page.getByTestId("sp-catalog-msg")).toHaveText("อัปเดตแถวเดิมในแท็บ PB3D Product 2027 แล้ว")
  tab = sheetTabs()["PB3D Product 2027"]
  expect(tab).toHaveLength(2)
  await page.getByTestId("sp-catalog-new").click()
  await page.getByTestId("sp-catalog-save").click()
  await expect(page.getByTestId("sp-catalog-msg")).toHaveText("บันทึกลงแท็บ PB3D Product 2027 แล้ว")
  expect(sheetTabs()["PB3D Product 2027"]).toHaveLength(3)
  expect((await page.request.post("/api/admin/catalog", { data: { product: { id: "x" } } })).status()).toBe(400)
})

test("an existing MarketPrices tab gets the new starter categories once", async ({ page }) => {
  await loginAsAdmin(page)
  // a sheet seeded by an older version: only one (edited) category, no version flag
  const { emulatorPost } = await import("../../lib/sheetsEmulator")
  emulatorPost(EMULATOR_FILE, "s", { secret: "s", action: "market.seed", rows: [
    { category: "พวงกุญแจ / ป้ายชื่อเล็ก", example: "", typicalWeightG: 15, low: 1, typical: 77, high: 100, source: "สำรวจเอง", updated: "" },
  ] })
  await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
  await expect(page.getByTestId("sell-pricing").getByText(/เพิ่มหมวดสินค้าใหม่ 15 หมวด/)).toBeVisible()
  const options = page.getByTestId("sp-category").locator("option")
  await expect(options).toHaveCount(17) // 16 categories + "no comparison"
  const tab = sheetTabs().MarketPrices
  expect(tab).toHaveLength(17) // header + 16
  expect(tab[1]).toContain(77) // edited row kept
  // second visit: nothing re-added
  await page.reload()
  await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
  await expect(page.getByTestId("sp-category").locator("option")).toHaveCount(17)
  expect(sheetTabs().MarketPrices).toHaveLength(17)
})

test("selling-price calculator fits a phone screen (cards instead of a table)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await loginAsAdmin(page)
  await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
  await expect(page.getByTestId("sp-channel-cards")).toBeVisible()
  await expect(page.getByTestId("sp-channels")).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})

test.describe("AI product copy", () => {
  const LOG = require("path").join(process.cwd(), "test-results", "anthropic-requests.json")
  const fs = require("fs")
  test.beforeEach(() => { fs.rmSync(LOG, { force: true }) })

  test("API is admin only", async ({ request }) => {
    expect((await request.post("/api/admin/ai-copy", { data: { name: "x" } })).status()).toBe(401)
    expect((await request.post("/api/admin/slicer-read", { data: { image: "x", mimeType: "image/png" } })).status()).toBe(401)
  })

  test("writes titles + description from the calculator's product", async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: /คำนวณราคาขาย/ }).click()
    const ai = page.getByTestId("ai-copy")
    await expect(ai.getByTestId("ai-generate")).toBeDisabled()
    await page.getByTestId("sp-name").fill("ขาตั้งมือถือรุ่นแมว")
    await ai.getByTestId("ai-features").fill("ปรับองศาได้ 3 ระดับ")
    await ai.getByTestId("ai-generate").click()

    const result = ai.getByTestId("ai-result")
    await expect(result).toBeVisible()
    await expect(result.getByTestId("ai-title")).toHaveCount(2) // duplicate dropped
    await expect(result.getByTestId("ai-description")).toContainText("• ปรับองศาได้ 3 ระดับ")
    await expect(result.getByTestId("ai-description")).toContainText("#3DPrinting")

    const [call] = JSON.parse(fs.readFileSync(LOG, "utf8"))
    expect(call.headers["x-api-key"] ?? call.headers.authorization).toMatch(/test-anthropic-key/)
    expect(call.body.model).toBe("claude-opus-5-5")
    expect(call.body.output_config.format.type).toBe("json_schema")
    const prompt = call.body.messages[0].content
    expect(prompt).toContain("ขาตั้งมือถือรุ่นแมว")
    expect(prompt).toContain("ปรับองศาได้ 3 ระดับ")
    expect(prompt).toContain("- น้ำหนักชิ้นงาน (กรัม): 100")
    expect(prompt).toMatch(/- ราคาขาย \(บาท\): \d+/)
  })

  test("Shopee listing box has every field ready to copy", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
    await page.getByTestId("sp-name").fill("ขาตั้งมือถือรุ่นแมว")
    await page.getByTestId("ai-generate").click()
    const box = page.getByTestId("shopee-box")
    await expect(box.getByTestId("shopee-box-title-value")).toHaveText("ขาตั้งมือถือรุ่นแมว พิมพ์ 3 มิติ ปรับองศาได้")
    await box.getByTestId("shopee-box-pick").selectOption("1")
    await expect(box.getByTestId("shopee-box-title-value")).toHaveText("ขาตั้งโทรศัพท์ลายแมว ตั้งโต๊ะ")
    await expect(box.getByTestId("shopee-box-price-value")).toHaveText("299")
    await expect(box.getByTestId("shopee-box-weight-value")).toHaveText("0.15") // 100 g + 50 g
    await box.getByTestId("shopee-box-packaging").fill("120")
    await expect(box.getByTestId("shopee-box-weight-value")).toHaveText("0.22")
    await box.getByTestId("shopee-box-description").getByRole("button", { name: "คัดลอก" }).click()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain("จุดเด่น\n• ปรับองศาได้ 3 ระดับ")
  })

  test("sends a chosen title, price and pitch to the Shopee product form", async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
    await page.getByTestId("sp-name").fill("ขาตั้งมือถือรุ่นแมว")
    await page.getByTestId("ai-generate").click()
    await page.getByTestId("ai-to-shopee").nth(1).click()

    await expect(page.getByRole("tab", { name: "สินค้า Shopee" })).toHaveAttribute("aria-selected", "true")
    const form = page.getByTestId("shopee-form")
    await expect(form.getByText("เติมชื่อ ราคา และคำอธิบายจาก AI แล้ว")).toBeVisible()
    await expect(form.locator('input[name="name"]')).toHaveValue("ขาตั้งโทรศัพท์ลายแมว ตั้งโต๊ะ")
    await expect(form.locator('input[name="price"]')).toHaveValue("299") // Shopee recommended for 100 g / 2 h
    await expect(form.locator('input[name="description"]')).toHaveValue("ขาตั้งมือถือน่ารักสำหรับโต๊ะทำงาน")
    // pasting the link keeps the AI title
    await form.locator('input[name="url"]').fill("https://shopee.co.th/Cat-Stand-i.9883965.111")
    await expect(form.locator('input[name="name"]')).toHaveValue("ขาตั้งโทรศัพท์ลายแมว ตั้งโต๊ะ")
    await form.getByRole("button", { name: "เพิ่มสินค้า" }).click()
    await expect(page.getByTestId("shopee-admin-row")).toContainText("฿299")
  })

  test("slicer screenshot fills grams and print time", async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: "คำนวณราคาขาย" }).click()
    expect((await page.request.post("/api/admin/slicer-read", { data: { image: "x", mimeType: "text/plain" } })).status()).toBe(400)

    const png = (marker: string) => ({ name: "slicer.png", mimeType: "image/png", buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from(marker)]) })
    await page.getByTestId("slicer-file").setInputFiles(png("slicer"))
    await expect(page.getByTestId("slicer-result")).toContainText("363.58 g · 11 ชม. 8 นาที · 7 เพลต")
    await expect(page.getByTestId("sp-grams")).toHaveValue("363.58")
    await expect(page.getByTestId("sp-hours")).toHaveValue("11.13")

    const [call] = JSON.parse(fs.readFileSync(LOG, "utf8"))
    expect(call.body.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/png" } })

    await page.getByTestId("slicer-file").setInputFiles(png("NOT-SLICER"))
    await expect(page.getByTestId("slicer-error")).toContainText("ไม่พบน้ำหนักหรือเวลาพิมพ์")
    await expect(page.getByTestId("sp-grams")).toHaveValue("363.58") // unchanged
  })

  test("shows a clear message when the AI declines", async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole("tab", { name: /คำนวณราคาขาย/ }).click()
    await page.getByTestId("sp-name").fill("REFUSE-ME")
    await page.getByTestId("ai-generate").click()
    await expect(page.getByTestId("ai-error")).toContainText("AI ไม่สามารถเขียน")
  })
})
