"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError("ไม่พบ token กรุณาขอลิงก์ใหม่")
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("รหัสผ่านไม่ตรงกัน"); return }
    if (password.length < 8) { setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push("/admin/login"), 3000)
      } else {
        setError(data.error ?? "เกิดข้อผิดพลาด")
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อได้")
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="text-center space-y-4">
      <div className="text-5xl">✅</div>
      <p className="text-white font-bold text-lg">ตั้งรหัสผ่านใหม่สำเร็จ!</p>
      <p className="text-gray-400 text-sm">กำลังพาคุณไปหน้า Login...</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          รหัสผ่านใหม่
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="อย่างน้อย 8 ตัวอักษร"
          required minLength={8}
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-400 transition"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          ยืนยันรหัสผ่านใหม่
        </label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
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
        disabled={loading || !token}
        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl transition text-sm"
      >
        {loading ? "⏳ กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่ →"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-white font-black text-2xl">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-gray-500 text-sm mt-1">กรุณากรอกรหัสผ่านใหม่ของคุณ</p>
        </div>
        <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Suspense fallback={<p className="text-gray-400 text-center">กำลังโหลด...</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
