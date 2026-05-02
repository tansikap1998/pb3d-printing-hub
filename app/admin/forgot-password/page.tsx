"use client"
import { useState } from "react"
import Link from "next/link"

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
        setError(d.error ?? "An error occurred")
      }
    } catch {
      setError("Cannot connect to server")
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
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.02] border border-white/10 mb-4 shadow-2xl opacity-80">
            <span className="text-xl">🔑</span>
          </div>
          <h1 className="font-header text-3xl tracking-normal uppercase leading-none text-white font-bold">
            PB3D<span className="text-white/20">HUB</span>
          </h1>
          <p className="font-body text-sm text-white/60 mt-2">Access Recovery</p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          {sent ? (
            <div className="text-center space-y-6">
              <div className="text-4xl">📨</div>
              <div>
                <p className="font-header text-xl tracking-tighter uppercase">Link Sent</p>
                <p className="font-body text-sm text-white/60 mt-2 leading-relaxed">
                  Check your inbox at <span className="text-white">{email}</span>
                  <br />The link expires in <strong className="text-white">15 minutes</strong>
                </p>
              </div>
              <Link
                href="/admin/login"
                className="block w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 font-header text-lg font-semibold tracking-normal uppercase rounded-xl transition-all mt-4 text-center"
              >
                ← Return to Portal
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-header text-[10px] tracking-[0.4em] text-white/20 uppercase mb-3">
                  Identity (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@pb3d.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-white/10 focus:outline-none focus:border-white/30 transition-all font-body"
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
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="mt-8 text-center border-t border-white/5 pt-8">
                <Link
                  href="/admin/login"
                  className="font-header text-sm text-white/60 hover:text-white transition-all uppercase tracking-normal"
                >
                  ← Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
        
        <p className="text-center font-header text-[9px] tracking-[0.5em] text-white/10 mt-10 uppercase">
          PB3D Printing Hub © 2025
        </p>
      </div>
    </div>
  )
}
