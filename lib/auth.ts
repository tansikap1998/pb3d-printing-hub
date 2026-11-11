import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { AUTH_SECRET } from "./authSecret"

export const ALLOWED_EMAILS = [
  "supapol_111213@hotmail.com",
  "tansika.p1998@gmail.com",
]

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pb3d-admin-2025"

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
        if (credentials.password !== ADMIN_PASSWORD) return null
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
