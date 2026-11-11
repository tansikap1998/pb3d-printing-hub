import { test, expect, Page } from "@playwright/test"
import { calculate } from "../../lib/priceCalculator"
import { boxStl, PNG_1PX, isolateNetwork } from "../helpers"

const CUBE = { name: "cube60.stl", mimeType: "model/stl", buffer: boxStl(60, 60, 60) }
const SMALL = { name: "small20.stl", mimeType: "model/stl", buffer: boxStl(20, 20, 20) }

const price = (o: Partial<Parameters<typeof calculate>[0]>) => calculate({
  volumeCm3: 216, dimensions: { x: 60, y: 60, z: 60 }, technology: "FDM", material: "PLA",
  infill: 25, layerHeight: 0.16, quantity: 1, shipping: "pickup", ...o,
})
const baht = (n: number) => `฿${n.toLocaleString()}`
const liveQuote = (page: Page) => page.locator("p", { hasText: "Live Quote" }).locator("xpath=following-sibling::p[1]")

test.beforeEach(async ({ page }) => { await isolateNetwork(page) })

test.describe("Home page", () => {
  test("renders and every order CTA leads to /upload", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("PB3D Hub").first()).toBeVisible()
    const ctas = page.locator('a[href="/upload"]')
    expect(await ctas.count()).toBeGreaterThan(0)
    await ctas.last().click()
    await expect(page).toHaveURL(/\/upload$/)
  })

  test("language toggle switches TH ↔ EN", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("พร้อมเริ่มโปรเจกต์แล้วหรือยัง?")).toBeVisible()
    await page.getByRole("button", { name: /EN|TH/ }).first().click()
    await expect(page.getByText("Ready to start your project?")).toBeVisible()
  })
})

test.describe("Upload / configure", () => {
  test("Next is disabled until a valid model is uploaded", async ({ page }) => {
    await page.goto("/upload")
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeDisabled()
    await expect(liveQuote(page)).toHaveText("—")
  })

  test("STL upload works even when S3 storage is unavailable, and price is live", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    await expect(page.getByText("60×60×60 mm · 216.0 cm³")).toBeVisible()
    await expect(page.getByText("อัปโหลดล้มเหลว")).toHaveCount(0)
    await expect(liveQuote(page)).toHaveText(baht(price({}).totalPrice))

    // material changes the price
    await page.getByRole("button", { name: /^ABS/ }).click()
    await expect(liveQuote(page)).toHaveText(baht(price({ material: "ABS" }).totalPrice))
    // infill changes the price
    await page.getByRole("button", { name: /Very Strong/ }).click()
    await expect(liveQuote(page)).toHaveText(baht(price({ material: "ABS", infill: 80 }).totalPrice))
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeEnabled()
  })

  test("corrupt / empty STL shows an error instead of spinning forever", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "broken.stl", mimeType: "model/stl", buffer: Buffer.from("hello world") })
    await expect(page.getByText("อัปโหลดล้มเหลว")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeDisabled()
  })

  test("oversize model blocks the order", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "huge.stl", mimeType: "model/stl", buffer: boxStl(400, 50, 50) })
    await expect(page.getByText(/400×50×50 mm/)).toBeVisible()
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeDisabled()
    await expect(liveQuote(page)).toHaveText("—")
  })

  test("two different files are each priced on their own volume", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles([CUBE, SMALL])
    await expect(page.getByText("20×20×20 mm · 8.0 cm³")).toBeVisible()
    await expect(page.getByText("60×60×60 mm · 216.0 cm³")).toBeVisible()
    const expected = price({}).pricePerPc + price({ volumeCm3: 8, dimensions: { x: 20, y: 20, z: 20 } }).pricePerPc
    await expect(liveQuote(page)).toHaveText(baht(expected))
  })

  test("removing the only file disables Next again", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(SMALL)
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeEnabled()
    await page.locator("div", { hasText: /^small20\.stl/ }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]")
      .locator("button").last().click()
    await expect(page.getByText("small20.stl")).toHaveCount(0)
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeDisabled()
  })
})

test.describe("Full order: upload → quote → checkout → success", () => {
  test("customer places an order end-to-end", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    await expect(page.getByText("60×60×60 mm · 216.0 cm³")).toBeVisible()
    await page.getByRole("button", { name: /^PETG/ }).click()
    await page.getByTitle("black").click()
    // quantity 2
    const qtyRow = page.locator("p", { hasText: /^จำนวน$/ }).locator("xpath=..")
    await qtyRow.locator("button").last().click()
    await expect(qtyRow.getByText("2", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: /ถัดไป/ }).click()
    await expect(page.getByRole("heading", { name: "จัดส่ง & ยืนยัน" })).toBeVisible()
    await page.getByRole("button", { name: /ส่งไปรษณีย์/ }).click()
    const p = price({ material: "PETG", quantity: 2, shipping: "postal" })
    await expect(page.getByText(baht(p.totalPrice))).toBeVisible()
    await page.getByRole("button", { name: /ย้อนกลับ/ }).click()
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeVisible()
    await page.getByRole("button", { name: /ถัดไป/ }).click()
    await page.getByRole("button", { name: /ยืนยันสั่งซื้อ/ }).click()

    // ── Quote ──
    await expect(page).toHaveURL(/\/quote$/)
    await expect(page.getByRole("heading", { name: "Confirm Order" })).toBeVisible()
    await expect(page.getByText("PETG").first()).toBeVisible()
    await expect(page.getByText("black").first()).toBeVisible()
    await expect(page.getByText(baht(p.totalPrice)).filter({ visible: true }).first()).toBeVisible()
    const place = page.getByRole("button", { name: /Place Order/ }).filter({ visible: true }).first()
    await expect(place).toBeDisabled()
    await page.getByPlaceholder("John Doe").fill("ทดสอบ ระบบ")
    await page.getByPlaceholder("08x-xxx-xxxx").fill("0812345678")
    await expect(place).toBeDisabled() // address still missing
    await page.getByPlaceholder("john@example.com").fill("")
    await page.getByPlaceholder("123 Street, Bangkok 10xxx").fill("99/1 ถนนทดสอบ กรุงเทพฯ 10110")
    await expect(place).toBeEnabled()
    await place.click()

    // ── Checkout ──
    await expect(page).toHaveURL(/\/checkout\/[0-9a-f-]{36}$/)
    const orderId = page.url().split("/").pop()!
    await expect(page.getByText(`฿${p.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)).toBeVisible()
    await expect(page.getByText("5981153600")).toBeVisible()
    const confirm = page.getByRole("button", { name: "Confirm Payment" })
    await expect(confirm).toBeDisabled()

    // the stored order carries the real material/colour/shipping
    const stored = await page.evaluate(id => JSON.parse(localStorage.getItem("pb3d_orders") || "[]").find((o: any) => o.id === id), orderId)
    expect(stored.status).toBe("pending")
    expect(stored.items.material).toBe("PETG")
    expect(stored.items.color).toBe("black")
    expect(stored.items.quantity).toBe(2)
    expect(stored.items.notes).toContain("ส่งไปรษณีย์")
    expect(stored.pricing.total).toBe(p.totalPrice)

    // too-large slip is rejected
    await page.getByTestId("slip-input").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
    await expect(page.locator('p[role="alert"]')).toContainText("5MB")
    await expect(confirm).toBeDisabled()
    // wrong type is rejected
    await page.getByTestId("slip-input").setInputFiles({ name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("x") })
    await expect(page.locator('p[role="alert"]')).toContainText("JPG, PNG, WEBP, HEIC หรือ PDF")
    // image types the server does not accept are rejected up front, not after upload
    await page.getByTestId("slip-input").setInputFiles({ name: "slip.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") })
    await expect(page.locator('p[role="alert"]')).toContainText("JPG, PNG, WEBP, HEIC หรือ PDF")
    await expect(confirm).toBeDisabled()
    expect(await page.getByTestId("slip-input").getAttribute("accept")).toBe("image/jpeg,image/png,image/webp,image/heic,application/pdf")
    // valid slip
    await page.getByTestId("slip-input").setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: PNG_1PX })
    await expect(page.getByAltText("Slip preview")).toBeVisible()
    await expect(page.locator('p[role="alert"]')).toHaveCount(0)
    await expect(confirm).toBeEnabled()
    // delete → disabled again, then re-add
    await page.getByRole("button", { name: "Delete" }).click()
    await expect(confirm).toBeDisabled()
    await page.getByTestId("slip-input").setInputFiles({ name: "slip.png", mimeType: "image/png", buffer: PNG_1PX })
    await confirm.click()

    // ── Success ──
    await expect(page).toHaveURL(new RegExp(`/checkout/${orderId}/success$`))
    await expect(page.getByRole("heading", { name: "Payment Received" })).toBeVisible()
    await expect(page.getByText(`#${orderId.split("-")[0]}`)).toBeVisible()
    const after = await page.evaluate(id => JSON.parse(localStorage.getItem("pb3d_orders") || "[]").find((o: any) => o.id === id), orderId)
    expect(after.status).toBe("awaiting_verification")
    expect(after.payment.slip).toMatch(/^data:image\/png;base64,/)
  })

  test("PDF slip shows its file name instead of a broken image", async ({ page }) => {
    await page.goto("/")
    const id = await page.evaluate(() => {
      const id = crypto.randomUUID()
      localStorage.setItem("pb3d_orders", JSON.stringify([{ id, status: "pending", createdAt: new Date().toISOString(),
        customer: { name: "A" }, items: {}, pricing: { total: 100 }, delivery: { trackingNumber: null } }]))
      return id
    })
    await page.goto(`/checkout/${id}`)
    await page.getByTestId("slip-input").setInputFiles({ name: "slip.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") })
    await expect(page.getByText("slip.pdf")).toBeVisible()
    await expect(page.getByAltText("Slip preview")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Confirm Payment" })).toBeEnabled()
    // "Replace" opens the file picker and swaps the slip
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByRole("button", { name: "Replace" }).click(),
    ])
    await chooser.setFiles({ name: "slip.png", mimeType: "image/png", buffer: PNG_1PX })
    await expect(page.getByAltText("Slip preview")).toBeVisible()
    await expect(page.getByText("slip.pdf")).toHaveCount(0)
  })
})

test.describe("Cookie banner", () => {
  test("shows once and remembers the choice", async ({ page }) => {
    await page.addInitScript(() => { sessionStorage.setItem("__e2e_keep_banner", "1") })
    await page.goto("/")
    await page.evaluate(() => localStorage.removeItem("pb3d_cookie_consent"))
    await page.reload()
    const banner = page.locator("div.fixed.bottom-0.z-\\[999\\]")
    await expect(banner).toBeVisible()
    await banner.getByRole("button").last().click()
    await expect(banner).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem("pb3d_cookie_consent"))).toBeTruthy()
    await page.reload()
    await expect(banner).toHaveCount(0)
  })
})

test.describe("Guards", () => {
  test("/quote without an estimate redirects to /upload", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.removeItem("pb3d-order-storage"))
    await page.goto("/quote")
    await expect(page).toHaveURL(/\/upload$/)
  })

  test("unknown checkout id redirects home", async ({ page }) => {
    await page.goto("/checkout/does-not-exist")
    await expect(page).toHaveURL(/\/$/)
  })

  test("estimate API validates input", async ({ request }) => {
    const bad = await request.post("/api/estimate", { data: { material: "PLA" } })
    expect(bad.status()).toBe(400)
    const ok = await request.post("/api/estimate", { data: { volumeCm3: 216, technology: "FDM", material: "PLA", infill: 25, layerHeight: 0.16, quantity: 1 } })
    expect(ok.status()).toBe(200)
    expect((await ok.json()).totalPrice).toBe(price({}).totalPrice)
  })
})
