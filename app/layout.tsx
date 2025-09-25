import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShopConnect',
  description: 'Connect with local shops',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}