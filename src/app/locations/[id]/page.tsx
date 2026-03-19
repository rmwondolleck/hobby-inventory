import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-sm text-gray-500 mb-6 flex-wrap"
        aria-label="Breadcrumb"
      >
        <Link href="/locations" className="hover:text-blue-600">
          Locations
        </Link>
        {pathSegments.slice(0, -1).map((segment: string, i: number) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-300">/</span>
            <span>{segment}</span>
          </span>
        ))}
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{location.name}</span>
      </nav>

      <PageHeader
        title={location.name}
        description={<span className="font-mono text-xs text-muted-foreground">{location.path}</span>}
        actions={
          <Link
            href="/locations"
            className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted flex-shrink-0"
          >
            ← Back
          </Link>
        }
      />

      {/* Notes */}
      {location.notes && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">{location.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sub-locations */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Sub-locations ({location.children.length})
          </h2>
          {location.children.length === 0 ? (
            <p className="text-sm text-gray-400">No sub-locations.</p>
          ) : (
            <div className="space-y-1">
              {(location.children as ChildLocation[]).map((child) => (
                <Link
                  key={child.id}
                  href={`/locations/${child.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm group"
                >
                  <span className="text-gray-400">📦</span>
                  <span className="font-medium text-gray-800 group-hover:text-blue-600">
                    {child.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Lots stored here */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Lots stored here ({location.lots.length})
          </h2>
          {location.lots.length === 0 ? (
            <p className="text-sm text-gray-400">No lots at this location.</p>
          ) : (
            <div className="space-y-2">
              {(location.lots as LotWithPart[]).map((lot) => (
                <div
                  key={lot.id}
                  className="p-3 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <div className="font-medium text-gray-900">{lot.part.name}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {lot.part.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {lot.part.category}
                      </span>
                    )}
                    <span className="text-gray-500">
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
                          : 'bg-gray-100 text-gray-600'
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
  );
}
