"use client"

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function CheckoutSuccessPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-[#000000] text-[#F2F2F2] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse" />
        <CheckCircle className="w-32 h-32 text-green-500 relative z-10" />
      </div>
      <h1 className="font-header text-5xl uppercase tracking-tighter mb-6">Payment Received</h1>
      <div className="max-w-md space-y-4 mb-16">
        <p className="font-serif italic text-2xl text-white/80">
          "Thank you! Our team will verify your payment within 1 hour."
        </p>
        <p className="font-body text-sm text-white/40 uppercase tracking-[0.2em]">
          Order ID: #{params.id.split('-')[0]}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <Link href="/" className="px-12 py-5 bg-white text-black font-header text-xs tracking-[0.3em] uppercase rounded-2xl hover:bg-gray-200 transition-all shadow-2xl">
          Return to Home
        </Link>
        <a href="https://line.me/ti/p/@pb3d" target="_blank" className="px-12 py-5 border border-white/20 text-white font-header text-xs tracking-[0.3em] uppercase rounded-2xl hover:bg-white/10 transition-all">
          Contact Support
        </a>
      </div>
    </div>
  )
}
