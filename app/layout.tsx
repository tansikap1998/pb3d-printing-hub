import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PB3D Printing Hub',
  description: 'Smart 3D printing estimations, automatic slicing, and seamless checkout.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen bg-gray-100">{children}</body>
    </html>
  )
}
