import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground">Welcome to Hobby Inventory</h1>
        <p className="mt-2 text-muted-foreground">
          Track parts, lots, and locations for all your hobby projects.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/intake"
            className="group flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/10 p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">＋</span>
            <h2 className="text-base font-semibold text-primary">Add to Inventory</h2>
            <p className="text-sm text-primary/80">
              Quick-add new parts and lots in under 60 seconds.
            </p>
          </Link>

          <Link
            href="/parts"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">📦</span>
            <h2 className="text-base font-semibold text-foreground">Browse Parts</h2>
            <p className="text-sm text-muted-foreground">Search and filter your parts catalog.</p>
          </Link>

          <Link
            href="/lots"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">🗂️</span>
            <h2 className="text-base font-semibold text-foreground">Lots</h2>
            <p className="text-sm text-muted-foreground">View stock quantities, sources, and locations.</p>
          </Link>

          <Link
            href="/locations"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">📍</span>
            <h2 className="text-base font-semibold text-foreground">Locations</h2>
            <p className="text-sm text-muted-foreground">Manage storage locations and hierarchy.</p>
          </Link>

          <Link
            href="/projects"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">🔧</span>
            <h2 className="text-base font-semibold text-foreground">Projects</h2>
            <p className="text-sm text-muted-foreground">Track part allocations across builds.</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
