import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const ALLOWED_EMAILS = [
  "supapol_111213@hotmail.com",
  "tansika.p1998@gmail.com",
  "admin@pb3d.com", // Added based on user brief
  "owner@gmail.com"  // Added based on user brief
]

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      return ALLOWED_EMAILS.includes(user.email.toLowerCase().trim())
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = "admin"
      }
      return session
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
