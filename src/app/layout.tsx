import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hobby Inventory',
  description: 'Track your hobby parts, lots, and projects',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-6">
            <Link href="/" className="text-lg font-bold text-gray-900">
              Hobby Inventory
            </Link>
            <Link href="/lots" className="text-sm text-gray-600 hover:text-gray-900">
              Lots
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
