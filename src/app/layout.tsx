import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hobby Inventory',
  description: 'Hobby component inventory management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  )
}
