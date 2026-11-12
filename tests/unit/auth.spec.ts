import { test, expect } from "@playwright/test"

// authorize() of the credentials provider, called directly
async function authorize(creds: { email: string; password: string }, env: Record<string, string | undefined>) {
  const old = { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, NODE_ENV: process.env.NODE_ENV }
  Object.assign(process.env, env)
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]
  try {
    const { authOptions } = await import("../../lib/auth")
    return await (authOptions.providers[0] as any).options.authorize(creds)
  } finally {
    for (const [k, v] of Object.entries(old)) { if (v === undefined) delete process.env[k]; else (process.env as any)[k] = v }
  }
}
const admin = "tansika.p1998@gmail.com"

test("correct password signs in, wrong password or unknown email does not", async () => {
  expect(await authorize({ email: admin, password: "s3cret" }, { ADMIN_PASSWORD: "s3cret" })).toMatchObject({ email: admin })
  expect(await authorize({ email: admin, password: "nope" }, { ADMIN_PASSWORD: "s3cret" })).toBeNull()
  expect(await authorize({ email: "x@y.z", password: "s3cret" }, { ADMIN_PASSWORD: "s3cret" })).toBeNull()
})

test("live site without ADMIN_PASSWORD refuses every login (no public default)", async () => {
  await expect(authorize({ email: admin, password: "pb3d-admin-2025" }, { ADMIN_PASSWORD: undefined, NODE_ENV: "production" }))
    .rejects.toThrow("ADMIN_PASSWORD_NOT_SET")
})
