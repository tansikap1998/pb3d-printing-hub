"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push("/admin")
        router.refresh()
      } else {
        setError(data.error ?? "เกิดข้อผิดพลาด")
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 flex items-center justify-center p-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-md md:max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 mb-4 shadow-2xl opacity-80">
            <span className="text-xl">🔐</span>
          </div>
          <h1 className="font-header text-3xl tracking-normal uppercase leading-none text-white font-bold">
            PB3D<span className="text-white/20">HUB</span>
          </h1>
          <p className="font-body text-sm text-white/60 mt-2">Security Gateway</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block font-header text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">
                Identity
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@pb3d.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-body"
              />
            </div>
            <div>
              <label className="block font-header text-[10px] tracking-[0.3em] text-white/40 uppercase mb-3">
                Access Key
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-body"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 font-body text-sm">
                 {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black font-header text-lg font-semibold tracking-normal uppercase rounded-xl hover:bg-gray-300 disabled:opacity-20 transition-all shadow-2xl"
            >
              {loading ? "Verifying..." : "Enter Portal →"}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4 text-center border-t border-white/5 pt-8">
            <Link
              href="/admin/forgot-password"
              className="font-header text-sm tracking-normal text-white/60 hover:text-white transition-all uppercase"
            >
              Reset Access Key?
            </Link>
            <Link
              href="/"
              className="font-header text-sm tracking-normal text-white/60 hover:text-white transition-all uppercase"
            >
              ← Return to Home
            </Link>
          </div>
        </div>

        <p className="text-center font-header text-xs tracking-[0.4em] text-white/20 mt-12 uppercase">
          PB3D Printing Hub © 2025
        </p>
      </div>
    </div>
  )
}
