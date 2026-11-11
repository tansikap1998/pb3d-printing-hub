import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import CookieBanner from '@/components/CookieBanner'
import { themeInitScript } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'PB3D Printing Hub | รับพิมพ์ 3 มิติ ประเมินราคาออนไลน์ทันที',
  description: 'บริการพิมพ์ 3 มิติระดับอุตสาหกรรม รวดเร็ว แม่นยำ ประเมินราคาจากไฟล์ STL/3MF ได้ทันที พร้อมจัดส่งทั่วประเทศ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#080810' },
    { media: '(prefers-color-scheme: light)', color: '#f7f7fa' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground font-sans">
        <Providers>
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
