import { SignJWT, jwtVerify } from "jose"

export const ALLOWED_EMAILS = [
  "supapol_111213@hotmail.com",
  "tansika.p1998@gmail.com",
]

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? "pb3d-secret-change-me")

export function isAllowedEmail(email: string) {
  return ALLOWED_EMAILS.includes(email.toLowerCase().trim())
}

// ─── PBKDF2 password hashing (no bcrypt needed) ───────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await pbkdf2(password, salt)
  return Buffer.from(salt).toString("hex") + ":" + Buffer.from(key).toString("hex")
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":")
  if (!saltHex || !keyHex) return false
  const salt = Buffer.from(saltHex, "hex")
  const key = await pbkdf2(password, salt)
  return Buffer.from(key).toString("hex") === keyHex
}

async function pbkdf2(password: string, salt: Uint8Array | Buffer): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  )
  return crypto.subtle.deriveBits(
    { 
      name: "PBKDF2", 
      salt: salt as any, // Use any to bypass strict SharedArrayBuffer check in TS
      iterations: 100000, 
      hash: "SHA-256" 
    },
    keyMaterial, 256
  )
}

// ─── Get stored hash ───────────────────────────────────────────────────────
export async function getPasswordHash(email: string): Promise<string | null> {
  const e = email.toLowerCase().trim()

  // Check KV override (if Vercel KV is configured)
  if (process.env.KV_REST_API_URL) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/get/admin_pw:${encodeURIComponent(e)}`, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (data.result) return data.result
    } catch {}
  }

  // Fall back to env vars
  if (e === "supapol_111213@hotmail.com") return process.env.ADMIN_HASH_1 ?? null
  if (e === "tansika.p1998@gmail.com") return process.env.ADMIN_HASH_2 ?? null
  return null
}

export async function savePasswordHash(email: string, hash: string): Promise<boolean> {
  if (!process.env.KV_REST_API_URL) return false
  try {
    await fetch(`${process.env.KV_REST_API_URL}/set/admin_pw:${encodeURIComponent(email.toLowerCase())}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: hash }),
    })
    return true
  } catch {
    return false
  }
}

// ─── JWT ───────────────────────────────────────────────────────────────────
export async function signAdminToken(email: string) {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(getSecret())
}

export async function signResetToken(email: string) {
  return new SignJWT({ email, type: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret())
  return payload
}

// ─── Send email via Resend REST ────────────────────────────────────────────
export async function sendResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY not configured")

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#7c3aed">PB3D Printing Hub</h2>
      <p>มีการขอรีเซ็ตรหัสผ่านสำหรับ Admin Panel</p>
      <p>คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์หมดอายุใน 15 นาที)</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold">
        ตั้งรหัสผ่านใหม่ →
      </a>
      <p style="color:#999;font-size:12px">หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</p>
    </div>`

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "PB3D Admin <noreply@pb3dprint.com>",
      to,
      subject: "รีเซ็ตรหัสผ่าน — PB3D Printing Hub",
      html,
    }),
  })

  if (!res.ok) throw new Error(await res.text())
}
