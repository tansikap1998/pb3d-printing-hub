import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

export const ALLOWED_EMAILS = [
  "supapol_111213@hotmail.com",
  "tansika.p1998@gmail.com",
  "admin@pb3d.com",
]

// Fallback admin password — override with ADMIN_PASSWORD env var in Vercel
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pb3d-admin-2025"

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Email + Password (works without Google Console setup) ──
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
        if (credentials.password !== ADMIN_PASSWORD) return null
        return { id: "1", name: "Admin", email }
      },
    }),

    // ── Google OAuth (optional — works when GOOGLE_CLIENT_ID is set) ──
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // For Google: check allowed emails
      if (account?.provider === "google") {
        if (!user.email) return false
        return ALLOWED_EMAILS.includes(user.email.toLowerCase().trim())
      }
      // Credentials: already checked in authorize()
      return true
    },
    async session({ session }) {
      if (session.user) (session.user as any).role = "admin"
      return session
    },
  },

  pages: {
    signIn: "/admin/login",
    error:  "/admin/login",
  },

  secret: process.env.NEXTAUTH_SECRET || "pb3d-hub-fallback-secret-yjMFxp52e4QJ5adoXkE4MTfOfm4tlp8bGIjcwUbXizQ",
}
