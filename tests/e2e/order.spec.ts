import { test, expect, Page } from "@playwright/test"
import { calculate, flatRateOrder } from "../../lib/priceCalculator"
import { computeQuote } from "../../lib/quotePricing"
import { DEFAULT_QUOTE_CONFIG } from "../../lib/quoteConfig"
import { boxStl, box3mf, PNG_1PX, isolateNetwork, resetDb, createOrder, sheetOrder, confirmPriceInSheet } from "../helpers"

const CUBE = { name: "cube60.stl", mimeType: "model/stl", buffer: boxStl(60, 60, 60) }
const SMALL = { name: "small20.stl", mimeType: "model/stl", buffer: boxStl(20, 20, 20) }

// The upload page measures the real mesh: for a box, volume = x·y·z and surface = 2(xy + yz + zx)
const boxStats = (d: { x: number; y: number; z: number }) =>
  ({ meshVolumeCm3: (d.x * d.y * d.z) / 1000, surfaceCm2: (2 * (d.x * d.y + d.y * d.z + d.z * d.x)) / 100 })
const price = (o: Partial<Parameters<typeof calculate>[0]>) => {
  const dimensions = o.dimensions ?? { x: 60, y: 60, z: 60 }
  return calculate({
    volumeCm3: 216, dimensions, technology: "FDM", material: "PLA",
    infill: 15, layerHeight: 0.4, quantity: 1, shipping: "pickup", ...boxStats(dimensions), ...o,
  })
}
const baht = (n: number) => `฿${n.toLocaleString()}`
/** What the upload page shows: weight/time from calculate(), price from the itemised quote. */
const quoteFor = (o: { material?: any; infill?: number; quantity?: number; shipping?: "pickup" | "postal"; sanding?: boolean; painting?: boolean; rush?: boolean; colors?: number } = {}) => {
  const e = price({ material: o.material ?? "PLA", infill: o.infill ?? 15 })
  return computeQuote({
    material: o.material ?? "PLA", parts: [{ name: "cube60.stl", weightG: e.weightG, printMin: e.printTimeSec / 60, quantity: o.quantity ?? 1, colors: o.colors ?? 1 }],
    sanding: !!o.sanding, painting: !!o.painting, rush: !!o.rush, shipping: o.shipping ?? "pickup",
  }, DEFAULT_QUOTE_CONFIG)
}
const liveQuote = (page: Page) => page.locator("p", { hasText: "Live Quote" }).locator("xpath=following-sibling::p[1]")

test.beforeEach(async ({ page }) => { await resetDb(); await isolateNetwork(page) })

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

  for (const production of [false, true]) {
    test(`3MF upload works (${production ? "Bambu / Orca style, mesh in a separate file" : "plain 3MF"})`, async ({ page }) => {
      await page.goto("/upload")
      await page.locator('input[type="file"]').setInputFiles({
        name: production ? "Feelings_Totem.3mf" : "plain.3mf", mimeType: "model/3mf", buffer: box3mf(60, 60, 60, { production }),
      })
      await expect(page.getByText("60×60×60 mm · 216.0 cm³")).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText("อัปโหลดล้มเหลว")).toHaveCount(0)
      await expect(liveQuote(page)).toHaveText(baht(price({}).totalPrice))
      await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeEnabled()
    })
  }

  test("a broken 3MF says why it failed", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "broken.3mf", mimeType: "model/3mf", buffer: Buffer.from("not a zip") })
    await expect(page.getByText("อัปโหลดล้มเหลว: ไฟล์ 3MF เสียหรือไม่ใช่ไฟล์ zip")).toBeVisible({ timeout: 10_000 })
  })

  test("Bambu-style 3MF where each object file reuses id 1", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "panels.3mf", mimeType: "model/3mf", buffer: box3mf(30, 30, 30, { production: true, copies: 3, separateFiles: true }) })
    // three 30 mm cubes 10 mm apart → 110 × 30 × 30 overall
    await expect(page.getByText("110×30×30 mm")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("อัปโหลดล้มเหลว")).toHaveCount(0)
  })

  test("Bambu-style 3MF with two plate objects is measured as a whole", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "two.3mf", mimeType: "model/3mf", buffer: box3mf(30, 30, 30, { production: true, copies: 2 }) })
    // two 30 mm cubes 10 mm apart → 70 × 30 × 30 overall
    await expect(page.getByText("70×30×30 mm")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("อัปโหลดล้มเหลว")).toHaveCount(0)
  })

  test("STL upload works even when S3 storage is unavailable, and price is live", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    await expect(page.getByText("60×60×60 mm · 216.0 cm³")).toBeVisible()
    await expect(page.getByText("อัปโหลดล้มเหลว")).toHaveCount(0)
    await expect(liveQuote(page)).toHaveText(baht(price({}).totalPrice))

    // material changes the price (TPU: grams + machine hours)
    await page.getByTestId("material-TPU").click()
    await expect(liveQuote(page)).toHaveText(baht(quoteFor({ material: "TPU" }).total))
    // infill changes the price
    await page.getByTestId("infill-100").click()
    await expect(liveQuote(page)).toHaveText(baht(quoteFor({ material: "TPU", infill: 100 }).total))
    // materials the shop has switched off are not offered
    await expect(page.getByTestId("material-ABS")).toHaveCount(0)
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
    // PLA: the whole order is priced by total grams (3 ฿/g, 1.5 ฿/g from 250 g)
    const grams = price({}).weightG + price({ volumeCm3: 8, dimensions: { x: 20, y: 20, z: 20 } }).weightG
    const order = flatRateOrder(grams)
    await expect(liveQuote(page)).toHaveText(baht(order.subtotal))
    // how many ฿59 units to buy in Shopee
    await expect(page.getByTestId("shopee-units").first()).toHaveText(`${order.shopeeUnits} ชิ้น`)
    await expect(page.getByTestId("shopee-units-calc").first()).toContainText(`÷ 59 = ${order.shopeeUnits} ชิ้น`)
    await expect(page.getByTestId("shopee-order-link").first()).toHaveAttribute("href", "https://shopee.co.th/product/9883965/24267343976")
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
    await page.getByTestId("material-PETG").click()
    await page.getByRole("button", { name: "สีดำ", exact: true }).click()
    // quantity 2
    const qtyRow = page.locator("p", { hasText: /^จำนวน$/ }).locator("xpath=..")
    await qtyRow.locator("button").last().click()
    await expect(qtyRow.getByText("2", { exact: true })).toBeVisible()
    // add-ons: sanding + rush → itemised live quote
    await page.getByTestId("addon-sanding").check()
    await page.getByTestId("addon-rush").check()
    const live = page.getByTestId("live-items")
    await expect(live).toContainText("ขัดผิว")
    await expect(live).toContainText("งานด่วน")
    await expect(page.getByTestId("expected-date")).toContainText("คาดว่าได้รับ")
    await expect(liveQuote(page)).toHaveText(baht(quoteFor({ material: "PETG", quantity: 2, sanding: true, rush: true }).total))

    await page.getByRole("button", { name: /ถัดไป/ }).click()
    await expect(page.getByRole("heading", { name: "จัดส่ง & ยืนยัน" })).toBeVisible()
    await page.getByRole("button", { name: /ส่งไปรษณีย์/ }).click()
    const q = quoteFor({ material: "PETG", quantity: 2, sanding: true, rush: true, shipping: "postal" })
    await expect(page.getByText(baht(q.total))).toBeVisible()
    await page.getByRole("button", { name: /ย้อนกลับ/ }).click()
    await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeVisible()
    await page.getByRole("button", { name: /ถัดไป/ }).click()
    await page.getByRole("button", { name: /ยืนยันสั่งซื้อ/ }).click()

    // ── Quote: itemised, expected date, printable PDF ──
    await expect(page).toHaveURL(/\/quote$/)
    await expect(page.getByRole("heading", { name: "ใบเสนอราคา" })).toBeVisible()
    const items = page.getByTestId("quote-items")
    for (const t of ["ค่าพิมพ์ PETG", "ขัดผิว", "งานด่วน", "ค่าจัดส่ง"]) await expect(items).toContainText(t)
    await expect(page.getByTestId("quote-total")).toHaveText(baht(q.total))
    await expect(page.getByTestId("quote-sentence")).toContainText(`= ${q.total.toLocaleString()} บาท`)
    await expect(page.getByTestId("quote-expected-date")).toContainText("คาดว่าได้รับ")
    await expect(page.getByTestId("download-pdf")).toBeVisible()
    await page.emulateMedia({ media: "print" })
    await expect(page.getByTestId("printable-quote")).toBeVisible()
    await expect(page.getByTestId("printable-quote")).toContainText("ใบเสนอราคา / Quotation")
    await page.emulateMedia({ media: "screen" })
    await expect(page.getByText("ดำ").filter({ visible: true }).first()).toBeVisible()

    const place = page.getByRole("button", { name: /ส่งให้ร้านตรวจไฟล์/ }).filter({ visible: true }).first()
    await expect(place).toBeDisabled()
    await page.getByPlaceholder("John Doe").fill("ทดสอบ ระบบ")
    await page.getByPlaceholder("08x-xxx-xxxx").fill("0812345678")
    await expect(place).toBeDisabled() // postal: address still missing
    await page.getByPlaceholder(/บ้านเลขที่/).fill("99/1 ถนนทดสอบ กรุงเทพฯ 10110")
    await page.getByPlaceholder("บอกร้านเพิ่มเติมได้ที่นี่").fill("ฐานสีดำทั้งหมด")
    await expect(place).toBeEnabled()
    await place.click()

    // ── Status page: waiting for the shop to confirm the price ──
    await expect(page).toHaveURL(/\/checkout\/[0-9a-f-]{36}$/)
    const orderId = page.url().split("/").pop()!
    await expect(page.getByTestId("awaiting-review")).toBeVisible()
    await expect(page.getByTestId("payment")).toHaveCount(0)
    await expect(page.getByTestId("status-items")).toContainText("ขัดผิว")
    await expect(page.getByTestId("status-expected-date")).toContainText("งานด่วน")

    // order summary: details + name + masked phone, never the full phone or address
    const summary = page.getByTestId("order-summary")
    for (const t of ["ทดสอบ ระบบ", "081-xxx-5678", "cube60.stl", "PETG · ดำ", "2 ชิ้น", "15% · 0.40 mm", "ขัดผิว", "จัดส่งพัสดุ"])
      await expect(summary).toContainText(t)
    await expect(summary).not.toContainText("0812345678")
    await expect(summary).not.toContainText("ถนนทดสอบ")

    // the order row in the Google Sheet carries the real details
    const stored = sheetOrder(orderId)!
    expect(stored["สถานะ"]).toBe("reviewing")
    expect(stored["ชื่อลูกค้า"]).toBe("ทดสอบ ระบบ")
    expect(stored["เบอร์โทร"]).toBe("0812345678")
    expect(stored["วัสดุ"]).toBe("PETG")
    expect(stored["สี"]).toBe("ดำ")
    expect(stored["จำนวน"]).toBe(2)
    expect(stored["หมายเหตุ"]).toContain("ฐานสีดำทั้งหมด")
    expect(stored["Layer (mm)"]).toBe(0.4)
    expect(stored["ยอดรวม (บาท)"]).toBe(q.total)
    expect(stored["ราคาประมาณการ (บาท)"]).toBe(q.total)
    expect(stored["การรับสินค้า"]).toBe("postal")
    expect(stored["งานด่วน"]).toBe(true)
    expect(JSON.parse(stored["รายการราคา"]).map((i: any) => i.label)).toContain("ขัดผิว")
    expect(stored["สลิป (Drive file ID)"]).toBe("")

    // ── the shop confirms the price → payment opens ──
    confirmPriceInSheet(orderId)
    await page.reload()
    await expect(page.getByTestId("payment")).toBeVisible()
    await expect(page.getByText(`฿${q.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`).first()).toBeVisible()
    await expect(page.getByText("5981153600")).toBeVisible()
    const confirm = page.getByRole("button", { name: "Confirm Payment" })
    await expect(confirm).toBeDisabled()

    // too-large slip is rejected
    await page.getByTestId("slip-input").setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(4 * 1024 * 1024 + 1) })
    await expect(page.locator('p[role="alert"]')).toContainText("4MB")
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
    const after = sheetOrder(orderId)!
    expect(after["สถานะ"]).toBe("awaiting_verification")
    expect(after["สลิป (Drive file ID)"]).not.toBe("")
  })

  test("PDF slip shows its file name instead of a broken image", async ({ page, request }) => {
    const id = await createOrder(request)
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

test.describe("Ported from the -qe site", () => {
  test("only the 0.4 mm layer is offered", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    const layerCard = page.locator("p", { hasText: /^Layer$/ }).locator("xpath=..")
    await expect(layerCard.getByRole("button")).toHaveCount(1)
    await expect(layerCard.getByRole("button")).toContainText("0.4 mm")
  })

  test("zoom buttons work without errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", e => errors.push(e.message))
    page.on("console", m => { if (m.type() === "error" && /dolly|zoom/i.test(m.text())) errors.push(m.text()) })
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    await expect(page.getByText("216.0 cm³").first()).toBeVisible()
    const zoomBtns = page.locator("canvas").first().locator("xpath=ancestor::div[contains(@class,'relative')][1]").locator("button")
    await zoomBtns.nth(0).click()
    await zoomBtns.nth(1).click()
    expect(errors).toEqual([])
  })

  test("send quote to LINE copies the quote and opens LINE", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await context.route(/lin\.ee/, r => r.fulfill({ status: 200, contentType: "text/html", body: "LINE stub" }))
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    await page.getByRole("button", { name: /ถัดไป/ }).click()
    await page.getByRole("button", { name: /ยืนยันสั่งซื้อ/ }).click()
    await expect(page).toHaveURL(/\/quote$/)
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByTestId("send-to-line").click(),
    ])
    await popup.waitForLoadState()
    expect(popup.url()).toContain("lin.ee")
    await expect(page.getByRole("status")).toContainText("คัดลอกใบเสนอราคาแล้ว")
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain("cube60.stl ×1")
    expect(text).toContain(`฿${price({}).totalPrice.toLocaleString()}`)
    expect(text).toContain(`สั่งผ่าน Shopee: บริการพิมพ์ 3D ชิ้นละ ฿59 จำนวน ${price({}).shopeeUnits} ชิ้น`)
    expect(text.split("\n").length).toBeGreaterThan(4) // real line breaks, not "\\n"
  })

  test("broken saved quote data sends the customer back to upload", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.setItem("pb3d-order-storage",
      JSON.stringify({ state: { estimateData: { models: [{ name: 1 }], result: { totalPrice: "abc" } } }, version: 0 })))
    await page.goto("/quote")
    await expect(page).toHaveURL(/\/upload$/)
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
    const ok = await request.post("/api/estimate", { data: { volumeCm3: 216, technology: "FDM", material: "PLA", infill: 25, layerHeight: 0.4, quantity: 1 } })
    expect(ok.status()).toBe(200)
    // without mesh stats the API falls back to the bounding-box estimate
    expect((await ok.json()).totalPrice).toBe(price({ infill: 25, meshVolumeCm3: 0, surfaceCm2: 0 }).totalPrice)
    const withMesh = await request.post("/api/estimate", { data: { volumeCm3: 216, technology: "FDM", material: "PLA", infill: 25, layerHeight: 0.4, quantity: 1, meshVolumeCm3: 216, surfaceCm2: 216 } })
    expect((await withMesh.json()).totalPrice).toBe(price({ infill: 25 }).totalPrice)
  })
})

test.describe("No 3D file, LINE OA, file checks, multi-colour", () => {
  test("home links to the no-file form and order tracking; LINE button floats there", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("line-float")).toHaveAttribute("href", "https://lin.ee/R8Vd7q5")
    await page.getByTestId("cta-no-file").click()
    await expect(page).toHaveURL(/\/no-file$/)
    await page.goto("/upload")
    await expect(page.getByTestId("line-float")).toHaveCount(0) // the upload page has its own LINE link
  })

  test("no-file request: photos + description reach the sheet and the shop is e-mailed", async ({ page }) => {
    // shop e-mail comes from the quote settings
    const { emulatorPost } = await import("../../lib/sheetsEmulator")
    const { EMULATOR_FILE, sentMail, sheetTabs } = await import("../helpers")
    emulatorPost(EMULATOR_FILE, "s", { secret: "s", action: "settings.set", key: "quoteConfig", value: JSON.stringify({ contact: { shopEmail: "shop@example.com" } }) })

    await page.goto("/no-file")
    await page.getByTestId("nf-name").fill("คุณลูกค้า")
    await page.getByTestId("nf-description").fill("ฝาครอบปุ่มรีโมทแตก อยากได้ชิ้นใหม่สีดำ")
    await page.getByTestId("nf-submit").click()
    await expect(page.getByText(/อย่างน้อยหนึ่งช่อง/).filter({ visible: true }).last()).toBeVisible() // no phone / LINE / e-mail
    await page.getByTestId("nf-phone").fill("0812345678")
    await page.getByTestId("nf-email").fill("cust@example.com")
    await page.getByTestId("nf-photos").setInputFiles({ name: "remote.png", mimeType: "image/png", buffer: PNG_1PX })
    await page.getByTestId("nf-submit").click()
    await expect(page.getByTestId("no-file-done")).toBeVisible()

    const tab = sheetTabs().NoFileRequests
    expect(tab).toHaveLength(2)
    const row = Object.fromEntries(tab[0].map((h: string, i: number) => [h, tab[1][i]]))
    expect(row).toMatchObject({ "ชื่อ": "คุณลูกค้า", "เบอร์โทร": "0812345678", "ต้องการ": "ออกแบบให้" })
    expect(String(row["รูป (Drive file IDs)"])).not.toBe("")
    const mails = sentMail()
    expect(mails.some(m => m.to === "shop@example.com" && /ไม่มีไฟล์/.test(m.subject))).toBe(true)
    expect(mails.some(m => m.to === "cust@example.com")).toBe(true)
  })

  test("tiny model warns about inch units and converts with one click", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "inch.stl", mimeType: "model/stl", buffer: boxStl(2, 2, 1) })
    await expect(page.getByTestId("file-warning")).toContainText("หน่วยนิ้ว")
    await page.getByTestId("convert-inch").click()
    // 2 in → 50.8 mm in the size inputs
    await expect(page.locator('input[type="number"]').first()).toHaveValue(/^50\.8/)
  })

  test("an open (non-watertight) mesh is flagged", async ({ page }) => {
    // a box with its top two triangles missing
    const full = boxStl(30, 30, 30)
    const open = Buffer.concat([full.subarray(0, 84 + 2 * 50), full.subarray(84 + 4 * 50)])
    open.writeUInt32LE(10, 80)
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "open.stl", mimeType: "model/stl", buffer: open })
    await expect(page.getByTestId("file-warning")).toContainText("ไม่ปิดสนิท")
  })

  test("several colours on one file add the multi-colour charge", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles(CUBE)
    await expect(liveQuote(page)).toHaveText(baht(quoteFor({}).total))
    await page.getByRole("button", { name: "cube60.stl สีแดง" }).click()
    await page.getByRole("button", { name: "cube60.stl สีน้ำเงิน" }).click()
    await expect(page.getByTestId("live-items")).toContainText("หลายสี")
    await expect(liveQuote(page)).toHaveText(baht(quoteFor({ colors: 3 }).total))
    await expect(page.getByTestId("file-colors")).toContainText("ขาว + แดง + น้ำเงิน")
  })

  test("rush is not offered for long prints", async ({ page }) => {
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "big.stl", mimeType: "model/stl", buffer: boxStl(200, 200, 200) })
    await expect(page.getByTestId("rush-unavailable")).toBeVisible()
    await expect(page.getByTestId("addon-rush")).toBeDisabled()
  })
})

test("new pages fit a phone screen (no sideways scrolling)", async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 760 })
  const id = await createOrder(request)
  for (const url of ["/no-file", "/track", `/checkout/${id}`]) {
    await page.goto(url)
    await page.waitForLoadState("networkidle")
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, url).toBeLessThanOrEqual(1)
  }
})
