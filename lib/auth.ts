import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { AUTH_SECRET } from "./authSecret"
import { timingSafeEqual, createHash } from "crypto"
import { db, SheetsNotConfigured } from "./sheetsDb"

// Emergency admins: can always sign in with ADMIN_PASSWORD (Vercel).
// Day-to-day admins are managed in the "Admins" tab of the Google Sheet.
export const ALLOWED_EMAILS = [
  "supapol_111213@hotmail.com",
  "tansika.p1998@gmail.com",
]

// The admin password must come from the environment (Vercel → ADMIN_PASSWORD).
// There is no built-in default on the live site: a password written in a public
// repo is not a password. Local development keeps a default for convenience.
export const NO_ADMIN_PASSWORD = "ADMIN_PASSWORD_NOT_SET"
export const LOGIN_LOCKED = "LOGIN_LOCKED"
function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD
  return process.env.NODE_ENV === "production" ? null : "pb3d-admin-dev"
}
const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest())

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email.toLowerCase().trim()
        const password = credentials.password

        // 1) emergency password from Vercel (works even if Google Sheets is down)
        const envPassword = adminPassword()
        if (envPassword && ALLOWED_EMAILS.includes(email) && sameSecret(password, envPassword)) {
          return { id: email, name: "Admin", email }
        }

        // 2) admins listed in the "Admins" tab of the Google Sheet
        let sheetsAvailable = true
        try {
          const r = await db.admins.verify(email, password)
          if (r.admin) return { id: email, name: r.admin.name || "Admin", email }
          if (r.locked) throw new Error(LOGIN_LOCKED)
        } catch (e) {
          if ((e as Error).message === LOGIN_LOCKED) throw e
          if (e instanceof SheetsNotConfigured) sheetsAvailable = false
          else console.error("admin sign-in: Google Sheets check failed", e)
        }

        // nothing to check against at all → say so instead of "wrong password"
        if (!envPassword && !sheetsAvailable) throw new Error(NO_ADMIN_PASSWORD)
        return null
      },
    }),
  ],
  // Only admins can sign in at all, so every session is an admin session. Keep it
  // short-lived so removing someone from the Admins tab takes effect the same day.
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).admin = true
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = (token as any).admin ? "admin" : undefined
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
    error:  "/admin/login",
  },
  secret: AUTH_SECRET,
}
