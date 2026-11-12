"use client"
import ThemeToggle from '@/components/ThemeToggle'
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const callbackUrl = "/admin"

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })
      if (res?.error === "ADMIN_PASSWORD_NOT_SET") {
        setError("ยังไม่ได้ตั้งรหัสผ่านแอดมินบนเซิร์ฟเวอร์ (ADMIN_PASSWORD ใน Vercel)")
      } else if (res?.error) {
        setError("อีเมล์หรือรหัสผ่านไม่ถูกต้อง")
      } else if (res?.ok) {
        router.push(callbackUrl)
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่")
      }
    } catch {
      setError("เครือข่ายขัดข้อง กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <ThemeToggle className="absolute top-5 right-5" />
      <div className="w-full max-w-sm space-y-5">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-foreground/5 border border-foreground/10 mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="font-semibold tracking-tight text-3xl">
            PB3D<span className="text-foreground/20">HUB</span>
          </h1>
          <p className="text-sm text-foreground/40 mt-1">Admin Portal</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleLogin} className="bg-foreground/[0.03] border border-foreground/10 rounded-3xl p-7 space-y-4 shadow-2xl">

          <div>
            <label className="text-sm font-medium text-foreground/50 mb-2 block">Email</label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-4 text-foreground/25 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError("") }}
                placeholder="Admin Email"
                required
                autoComplete="email"
                className="w-full bg-foreground/[0.04] border border-foreground/12 rounded-2xl pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-foreground/20 outline-none focus:border-blue-400/50 focus:bg-blue-500/5 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground/50 mb-2 block">Password</label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-4 text-foreground/25 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError("") }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-foreground/[0.04] border border-foreground/12 rounded-2xl pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-foreground/20 outline-none focus:border-blue-400/50 focus:bg-blue-500/5 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-4 bg-foreground text-background font-header text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-foreground/90 transition-all disabled:opacity-30 flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98] mt-1"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" />กำลังเข้าสู่ระบบ…</>
              : "เข้าสู่ระบบ"
            }
          </button>
        </form>

        <div className="text-center">
          <Link href="/" className="text-sm text-foreground/25 hover:text-foreground/60 transition-colors">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}
