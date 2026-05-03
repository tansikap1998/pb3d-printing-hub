import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'PB3D Printing Hub | รับพิมพ์ 3 มิติ ประเมินราคาออนไลน์ทันที',
  description: 'บริการพิมพ์ 3 มิติระดับอุตสาหกรรม รวดเร็ว แม่นยำ ประเมินราคาจากไฟล์ STL/3MF ได้ทันที พร้อมจัดส่งทั่วประเทศ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className="antialiased min-h-screen bg-[#000000] selection:bg-white/20">
        <Providers>
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
