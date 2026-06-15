"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Mail, Lock, AlertCircle, LogIn } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/admin"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    setLoading(false)

    if (res?.error) {
      setError("Invalid email or password")
    } else if (res?.ok) {
      router.push(callbackUrl)
    }
  }

  const oauthEnabled = !!(typeof window !== "undefined")

  return (
    <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center p-6">

      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mb-5">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="font-header text-3xl tracking-tighter uppercase text-white">
            PB3D<span className="text-white/20">HUB</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-7 space-y-5 shadow-2xl">

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-white/50 mb-2 block">Email</label>
              <div className="relative flex items-center">
                <Mail size={15} className="absolute left-4 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tansika.p1998@gmail.com"
                  required
                  className="w-full bg-white/[0.04] border border-white/12 rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-400/50 focus:bg-blue-500/5 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-white/50 mb-2 block">Password</label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-4 text-white/25" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.04] border border-white/12 rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-400/50 focus:bg-blue-500/5 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-4 bg-white text-black font-header text-base uppercase tracking-[0.15em] rounded-2xl hover:bg-gray-100 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" />Signing in…</>
                : <><LogIn size={16} />Sign In</>
              }
            </button>
          </form>

          {/* Google OAuth — only shown if credentials are set */}
          <div className="pt-4 border-t border-white/8">
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full py-3.5 border border-white/10 bg-white/[0.03] rounded-2xl font-header text-sm uppercase tracking-[0.1em] text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.06] transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Default credentials hint */}
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl px-5 py-4 space-y-1">
          <p className="text-xs font-medium text-amber-400">Default credentials</p>
          <p className="text-xs text-amber-400/70">Password: <span className="font-mono">pb3d-admin-2025</span></p>
          <p className="text-[10px] text-amber-400/50 mt-2">Set ADMIN_PASSWORD in Vercel env vars to change</p>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-white/25 hover:text-white/60 transition-colors">
            ← Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
