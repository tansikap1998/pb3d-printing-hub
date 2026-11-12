import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { AUTH_SECRET } from "./authSecret"
import { timingSafeEqual, createHash } from "crypto"

export const ALLOWED_EMAILS = [
  "supapol_111213@hotmail.com",
  "tansika.p1998@gmail.com",
]

// The admin password must come from the environment (Vercel → ADMIN_PASSWORD).
// There is no built-in default on the live site: a password written in a public
// repo is not a password. Local development keeps a default for convenience.
export const NO_ADMIN_PASSWORD = "ADMIN_PASSWORD_NOT_SET"
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
        if (!ALLOWED_EMAILS.includes(email)) return null
        const expected = adminPassword()
        // checked at sign-in, not at import, so a missing setting never breaks the build
        if (!expected) throw new Error(NO_ADMIN_PASSWORD)
        if (!sameSecret(credentials.password, expected)) return null
        return { id: "1", name: "Admin", email }
      },
    }),
  ],
  callbacks: {
    async session({ session }) {
      if (session.user) (session.user as any).role = "admin"
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
    error:  "/admin/login",
  },
  secret: AUTH_SECRET,
}
