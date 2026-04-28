"use client"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const d = await res.json()
        setError(d.error ?? "เกิดข้อผิดพลาด")
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-white font-black text-2xl">ลืมรหัสผ่าน</h1>
          <p className="text-gray-500 text-sm mt-1">ระบบจะส่งลิงก์รีเซ็ตไปที่อีเมลของคุณ</p>
        </div>

        <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <p className="text-white font-bold text-lg">ส่งอีเมลแล้ว!</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                ตรวจสอบกล่องจดหมายที่ <span className="text-violet-400">{email}</span>
                <br />ลิงก์จะหมดอายุใน <strong className="text-white">15 นาที</strong>
              </p>
              <a
                href="/admin/login"
                className="block w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition text-sm mt-4"
              >
                ← กลับหน้า Login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  อีเมล Admin
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

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
              >
                {loading ? "⏳ กำลังส่ง..." : "ส่งลิงก์รีเซ็ต →"}
              </button>

              <a
                href="/admin/login"
                className="block text-center text-gray-500 hover:text-gray-400 text-sm transition mt-2"
              >
                ← กลับหน้า Login
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
