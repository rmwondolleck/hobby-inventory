import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: 'Hobby Inventory',
  description: 'Manage your hobby parts and components',
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4">
              <div className="flex items-center gap-6 h-14">
                <Link href="/" className="font-semibold text-gray-900 text-sm hover:text-blue-600">
                  Hobby Inventory
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    href="/parts"
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Parts
                  </Link>
                  <Link
                    href="/projects"
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Projects
                  </Link>
                  <Link
                    href="/locations"
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Locations
                  </Link>
                  <Link
                    href="/intake"
                    className="ml-4 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Add Items
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
