"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
import ThemeToggle from "@/components/ThemeToggle"

/** Find an order with its short number (8 characters) + the phone number used. */
export default function TrackPage() {
  const router = useRouter()
  const [orderNo, setOrderNo] = useState("")
  const [phone, setPhone] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      const r = await fetch("/api/orders/track", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNo, phone }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      router.push(`/checkout/${d.id}`)
    } catch (e: any) { setError(e.message) }
    setBusy(false)
  }

  const input = "w-full bg-foreground/[0.04] border border-foreground/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400/50"
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="px-5 sm:px-8 py-6 flex items-center justify-between border-b border-foreground/5">
        <Link href="/" className="font-header text-3xl tracking-tighter uppercase leading-none">PB3D<span className="text-foreground/20">HUB</span></Link>
        <ThemeToggle />
      </nav>
      <main className="max-w-md mx-auto px-5 pt-16">
        <h1 className="font-semibold tracking-tight text-3xl mb-2">เช็กสถานะงาน</h1>
        <p className="text-sm text-foreground/50 mb-8">ใส่เลขคำสั่งซื้อ (8 ตัว เช่น 1A2B3C4D) และเบอร์โทรที่ใช้สั่ง</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">เลขคำสั่งซื้อ</span>
            <input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="1A2B3C4D" className={input} data-testid="track-no" required /></label>
          <label className="block"><span className="text-xs text-foreground/50 mb-1.5 block">เบอร์โทร</span>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" type="tel" className={input} data-testid="track-phone" required /></label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={busy} data-testid="track-submit"
            className="w-full py-3.5 rounded-xl bg-foreground text-background font-medium flex items-center justify-center gap-2 disabled:opacity-40">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}ค้นหา
          </button>
        </form>
      </main>
    </div>
  )
}
