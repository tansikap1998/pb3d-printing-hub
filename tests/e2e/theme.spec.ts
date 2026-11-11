import { test, expect, Page } from "@playwright/test"
import { isolateNetwork, boxStl, loginAsAdmin } from "../helpers"

test.beforeEach(async ({ page }) => { await isolateNetwork(page) })

const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const fg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).color)

async function seedOrder(page: Page) {
  await page.goto("/")
  return page.evaluate(() => {
    const id = crypto.randomUUID()
    localStorage.setItem("pb3d_orders", JSON.stringify([{ id, status: "pending", createdAt: new Date().toISOString(),
      customer: { name: "Theme Test", phone: "0812345678", address: "BKK" }, items: { fileName: "a.stl", material: "PLA" },
      pricing: { total: 365 }, delivery: { trackingNumber: null } }]))
    return id
  })
}

test("dark is the default, toggle switches to light and is remembered across pages", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect.poll(() => bg(page)).toBe("rgb(8, 8, 16)")
  await expect.poll(() => fg(page)).toBe("rgb(242, 242, 242)")

  await page.getByTestId("theme-toggle").first().click()
  await expect(page.locator("html")).toHaveClass(/light/)
  await expect.poll(() => bg(page)).toBe("rgb(247, 247, 250)")
  await expect.poll(() => fg(page)).toBe("rgb(17, 17, 26)")
  expect(await page.evaluate(() => localStorage.getItem("pb3d_theme"))).toBe("light")

  // every page starts in the saved theme (no flash: class is set before hydration)
  const id = await seedOrder(page)
  for (const path of ["/upload", "/privacy", "/admin/login", `/checkout/${id}`, `/checkout/${id}/success`]) {
    await page.goto(path)
    await expect(page.locator("html"), path).toHaveClass(/light/)
    await expect.poll(() => bg(page), path).toBe("rgb(247, 247, 250)")
    await expect(page.getByTestId("theme-toggle").first(), path).toBeVisible()
  }

  await page.getByTestId("theme-toggle").first().click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("admin pages have the toggle too", async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).toHaveClass(/light/)
  await expect.poll(() => bg(page)).toBe("rgb(247, 247, 250)")
})

test("all pages share one font family and background", async ({ page }) => {
  const id = await seedOrder(page)
  const seen = new Set<string>()
  for (const path of ["/", "/upload", "/privacy", "/admin/login", `/checkout/${id}`, `/checkout/${id}/success`]) {
    await page.goto(path)
    const { font, rootBg } = await page.evaluate(() => {
      const main = document.querySelector("body > div") as HTMLElement
      return { font: getComputedStyle(main).fontFamily, rootBg: getComputedStyle(document.body).backgroundColor }
    })
    expect(font, path).toMatch(/^Inter/)
    seen.add(rootBg)
  }
  expect(Array.from(seen)).toEqual(["rgb(8, 8, 16)"])
})

test("root font size scales with the screen width", async ({ page }) => {
  const size = async (w: number) => {
    await page.setViewportSize({ width: w, height: 800 })
    await page.goto("/")
    return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  }
  const phone = await size(375), tablet = await size(1024), desktop = await size(1600)
  expect(phone).toBe(15)
  expect(tablet).toBeGreaterThan(15.5)
  expect(desktop).toBe(17)
})

for (const theme of ["dark", "light"] as const) {
  test(`no horizontal scrolling on a phone (${theme})`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem("pb3d_theme", t), theme)
    await page.setViewportSize({ width: 360, height: 780 })
    const id = await seedOrder(page)
    const check = async (path: string) => {
      const w = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(w, `${path} is ${w}px wide`).toBeLessThanOrEqual(360)
    }
    for (const path of ["/", "/privacy", "/admin/login", `/checkout/${id}`, `/checkout/${id}/success`]) {
      await page.goto(path); await page.waitForTimeout(300); await check(path)
    }
    await page.goto("/upload")
    await page.locator('input[type="file"]').setInputFiles({ name: "c.stl", mimeType: "model/stl", buffer: boxStl(60, 60, 60) })
    await expect(page.getByText(/216\.0 cm³/)).toBeVisible()
    await check("/upload")
    await page.getByRole("button", { name: /ถัดไป/ }).click()
    await page.getByRole("button", { name: /ยืนยันสั่งซื้อ/ }).click()
    await page.waitForURL(/quote/); await check("/quote")
  })
}

test("headings on every page use the same font as the home page", async ({ page }) => {
  const id = await seedOrder(page)
  const style = () => page.evaluate(() => {
    const h = document.querySelector("h1, h2") as HTMLElement
    const cs = getComputedStyle(h)
    return { family: cs.fontFamily, weight: cs.fontWeight, transform: cs.textTransform }
  })
  await page.goto("/")
  const home = await style()
  expect(home.family).toMatch(/^Inter/)
  for (const path of ["/privacy", "/admin/login", `/checkout/${id}`, `/checkout/${id}/success`]) {
    await page.goto(path)
    expect(await style(), path).toEqual(home)
  }
  await loginAsAdmin(page)
  expect(await style(), "/admin").toEqual(home)
  // nothing on the site still uses the old display font
  const anton = await page.evaluate(() => Array.from(document.querySelectorAll("*")).some(e => getComputedStyle(e).fontFamily.includes("Anton")))
  expect(anton).toBe(false)
})
