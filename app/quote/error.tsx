'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw } from 'lucide-react'

// Shown if the quote page crashes while rendering (e.g. unexpected saved data).
export default function QuoteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[quote] render error', error) }, [error])

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <AlertCircle size={28} className="mx-auto mb-4 text-red-400" />
        <h1 className="font-semibold tracking-tight text-2xl">เกิดข้อผิดพลาด</h1>
        <p className="text-sm text-foreground/50 mt-2">ไม่สามารถโหลดใบเสนอราคาได้ กรุณาลองใหม่อีกครั้ง</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
            <RefreshCw size={14} /> ลองใหม่
          </button>
          <Link href="/upload"
            className="rounded-xl border border-foreground/15 px-5 py-3 text-sm text-foreground/60 hover:text-foreground transition-colors">
            อัปโหลดใหม่
          </Link>
        </div>
      </div>
    </main>
  )
}
