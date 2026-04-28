"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <span className="text-3xl">⚙️</span>
          </div>
          <h1 className="text-white font-black text-2xl">
            PB<span className="text-violet-400">3D</span> Admin
          </h1>
          <p className="text-gray-500 text-sm mt-1">Printing Hub Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-400 transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm mt-2"
            >
              {loading ? "⏳ กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ →"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a
              href="/admin/forgot-password"
              className="text-violet-400 hover:text-violet-300 text-sm transition"
            >
              ลืมรหัสผ่าน?
            </a>
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          PB3D Printing Hub © 2025
        </p>
      </div>
    </div>
  )
}
