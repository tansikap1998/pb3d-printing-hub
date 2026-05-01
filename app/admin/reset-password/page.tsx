"use client"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

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
    if (!token) setError("Invalid or missing token")
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords do not match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
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
        setError(data.error ?? "An error occurred")
      }
    } catch {
      setError("Cannot connect to server")
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="text-center space-y-6">
      <div className="text-5xl">✅</div>
      <div>
        <p className="font-header text-xl tracking-tighter uppercase">Access Restored</p>
        <p className="font-body text-xs text-white/40 mt-2">Redirecting to login portal...</p>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block font-header text-[10px] tracking-[0.4em] text-white/20 uppercase mb-4">
          New Access Key
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          required minLength={8}
          className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm placeholder-white/10 focus:outline-none focus:border-white/20 transition-all font-body"
        />
      </div>
      <div>
        <label className="block font-header text-[10px] tracking-[0.4em] text-white/20 uppercase mb-4">
          Confirm Access Key
        </label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
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
        disabled={loading || !token}
        className="w-full py-6 bg-white text-black font-header text-xs tracking-[0.3em] uppercase rounded-2xl hover:bg-white/80 disabled:opacity-20 transition-all shadow-2xl"
      >
        {loading ? "Updating..." : "Update Access Key"}
      </button>

      <div className="mt-8 text-center border-t border-white/5 pt-8">
        <Link
          href="/admin/login"
          className="font-header text-[10px] tracking-[0.4em] text-white/20 hover:text-white transition-all uppercase"
        >
          ← Return to Login
        </Link>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] font-sans selection:bg-white/20 flex items-center justify-center p-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;700;900&display=swap');
        .font-header { font-family: 'Anton', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/10 mb-6 shadow-2xl">
            <span className="text-4xl">🔑</span>
          </div>
          <h1 className="font-header text-4xl tracking-tighter uppercase leading-none text-white">
            PB3D<span className="text-white/20">HUB</span>
          </h1>
          <p className="font-header text-[10px] tracking-[0.4em] uppercase opacity-40 mt-4">Access Configuration</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl">
          <Suspense fallback={<p className="font-header text-xs tracking-widest uppercase text-white/40 text-center">Loading Data...</p>}>
            <ResetForm />
          </Suspense>
        </div>
        
        <p className="text-center font-header text-[9px] tracking-[0.5em] text-white/10 mt-10 uppercase">
          PB3D Printing Hub © 2025
        </p>
      </div>
    </div>
  )
}
