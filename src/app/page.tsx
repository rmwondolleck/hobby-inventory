import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Hobby Inventory</h1>
        <p className="mt-2 text-gray-500">
          Track parts, lots, and locations for all your hobby projects.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/intake"
            className="group flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">＋</span>
            <h2 className="text-base font-semibold text-blue-800">Add to Inventory</h2>
            <p className="text-sm text-blue-600">
              Quick-add new parts and lots in under 60 seconds.
            </p>
          </Link>

          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm opacity-60">
            <span className="text-2xl">📦</span>
            <h2 className="text-base font-semibold text-gray-800">Browse Parts</h2>
            <p className="text-sm text-gray-500">Coming soon — search and filter your parts catalog.</p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm opacity-60">
            <span className="text-2xl">📍</span>
            <h2 className="text-base font-semibold text-gray-800">Locations</h2>
            <p className="text-sm text-gray-500">Coming soon — manage storage locations and hierarchy.</p>
          </div>
        </div>
      </div>
    </main>
  )
}

