import { Page, expect } from "@playwright/test"

export const ADMIN_EMAIL = "tansika.p1998@gmail.com"
export const ADMIN_PASSWORD = "e2e-test-password"

/** Binary STL of an axis-aligned box (12 triangles). */
export function boxStl(x: number, y: number, z: number): Buffer {
  const v = [
    [0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0],
    [0, 0, z], [x, 0, z], [x, y, z], [0, y, z],
  ]
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ]
  const buf = Buffer.alloc(84 + faces.length * 50)
  buf.writeUInt32LE(faces.length, 80)
  faces.forEach((f, i) => {
    let o = 84 + i * 50 + 12 // skip normal
    for (const idx of f) for (const c of v[idx]) { buf.writeFloatLE(c, o); o += 4 }
  })
  return buf
}

/** 1×1 PNG */
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
)

/** Block every request that would leave localhost (S3 uploads, Google fonts, images…). */
export async function isolateNetwork(page: Page) {
  // Pre-accept the cookie banner so it doesn't cover buttons (it has its own test).
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("__e2e_keep_banner"))
      localStorage.setItem("pb3d_cookie_consent", JSON.stringify({ necessary: true, analytics: false, marketing: false }))
  })
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort())
  // S3 presign has no credentials in tests — prove the upload flow survives it failing.
  await page.route("**/api/upload/presigned", r => r.fulfill({ status: 500, body: '{"error":"no s3"}' }))
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login")
  await page.getByPlaceholder("Admin Email").fill(ADMIN_EMAIL)
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD)
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText("Order Dashboard")).toBeVisible()
}
