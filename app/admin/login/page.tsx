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

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/10 mb-6 shadow-2xl">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="font-header text-4xl tracking-tighter uppercase leading-none text-white">
            PB3D<span className="text-white/20">HUB</span>
          </h1>
          <p className="font-header text-[10px] tracking-[0.4em] uppercase opacity-40 mt-4">Security Gateway</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block font-header text-[10px] tracking-[0.4em] text-white/20 uppercase mb-4">
                Identity
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@pb3d.com"
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm placeholder-white/10 focus:outline-none focus:border-white/20 transition-all font-body"
              />
            </div>
            <div>
              <label className="block font-header text-[10px] tracking-[0.4em] text-white/20 uppercase mb-4">
                Access Key
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm placeholder-white/10 focus:outline-none focus:border-white/20 transition-all font-body"
              />
            </div>

            {error && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-2xl px-6 py-4 text-red-400 font-header text-[10px] tracking-widest uppercase">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-white text-black font-header text-xs tracking-[0.3em] uppercase rounded-2xl hover:bg-white/80 disabled:opacity-20 transition-all shadow-2xl"
            >
              {loading ? "Verifying..." : "Enter Portal →"}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/5 pt-8">
            <Link
              href="/admin/forgot-password"
              className="font-header text-[10px] tracking-[0.4em] text-white/20 hover:text-white transition-all uppercase"
            >
              Reset Access Key?
            </Link>
          </div>
        </div>

        <p className="text-center font-header text-[9px] tracking-[0.5em] text-white/10 mt-10 uppercase">
          PB3D Printing Hub © 2025
        </p>
      </div>
    </div>
  )
}
