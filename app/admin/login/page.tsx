"use client"
import { signIn } from "next-auth/react"
import Link from "next/link"

export default function AdminLoginPage() {
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
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl text-center">
          <div className="mb-8">
            <h2 className="font-header text-xl tracking-tight uppercase mb-2">Admin Portal</h2>
            <p className="font-body text-xs text-white/40">Exclusive access for authorized personnel only.</p>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/admin" })}
            className="w-full py-4 bg-white text-black font-header text-lg font-semibold tracking-normal uppercase rounded-xl hover:bg-gray-300 transition-all shadow-2xl flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="mt-8 pt-8 border-t border-white/5">
            <Link
              href="/"
              className="font-header text-sm tracking-normal text-white/60 hover:text-white transition-all uppercase"
            >
              ← Return to Home
            </Link>
          </div>
        </div>

        <p className="text-center font-header text-xs tracking-normal text-white/10 mt-12 uppercase">
          PB3D Printing Hub © 2025
        </p>
      </div>
    </div>
  )
}
