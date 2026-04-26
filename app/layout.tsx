import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PB3D Printing Hub',
  description: 'พิมพ์โมเดล 3 มิติออนไลน์ ประเมินราคาทันที',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen bg-[#0a0a0f]">{children}</body>
    </html>
  )
}
