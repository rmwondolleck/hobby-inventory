import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

interface ChildLocation {
  id: string;
  name: string;
}

interface LotWithPart {
  id: string;
  quantityMode: string;
  quantity: number | null;
  unit: string | null;
  qualitativeStatus: string | null;
  status: string;
  part: { id: string; name: string; category: string | null };
}

export default async function LocationDetailPage({ params }: Params) {
  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      parent: true,
      children: { orderBy: { name: 'asc' } },
      lots: {
        include: {
          part: { select: { id: true, name: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!location) {
    notFound();
  }

  const pathSegments = (location.path as string).split('/');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap"
          aria-label="Breadcrumb"
        >
          <Link href="/locations" className="hover:text-primary">
            Locations
          </Link>
          {pathSegments.slice(0, -1).map((segment: string, i: number) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <span>{segment}</span>
            </span>
          ))}
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{location.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{location.name}</h1>
            <p className="text-muted-foreground text-xs mt-1 font-mono truncate">{location.path}</p>
          </div>
          <Link
            href="/locations"
            className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-accent flex-shrink-0"
          >
            ← Back
          </Link>
        </div>

        {/* Notes */}
        {location.notes && (
          <div className="mb-6 p-4 bg-muted border border-border rounded-lg">
            <p className="text-sm text-foreground">{location.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sub-locations */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Sub-locations ({location.children.length})
            </h2>
            {location.children.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sub-locations.</p>
            ) : (
              <div className="space-y-1">
                {(location.children as ChildLocation[]).map((child) => (
                  <Link
                    key={child.id}
                    href={`/locations/${child.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent text-sm group"
                  >
                    <span className="text-muted-foreground">📦</span>
                    <span className="font-medium text-foreground group-hover:text-primary">
                      {child.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Lots stored here */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Lots stored here ({location.lots.length})
            </h2>
            {location.lots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lots at this location.</p>
            ) : (
              <div className="space-y-2">
                {(location.lots as LotWithPart[]).map((lot) => (
                  <div
                    key={lot.id}
                    className="p-3 border border-border rounded-lg text-sm bg-card"
                  >
                    <div className="font-medium text-foreground">{lot.part.name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {lot.part.category && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          {lot.part.category}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {lot.quantityMode === 'exact'
                          ? `${lot.quantity ?? 0} ${lot.unit || 'pcs'}`
                          : lot.qualitativeStatus}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded capitalize ${
                          lot.status === 'in_stock'
                            ? 'bg-green-100 text-green-700'
                            : lot.status === 'low'
                            ? 'bg-yellow-100 text-yellow-700'
                            : lot.status === 'out'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {lot.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
