import { Suspense } from 'react';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { LotCard, type LotCardLot } from '@/features/lots/components/LotCard';
import { LotFilterForm } from '@/features/lots/components/LotFilterForm';
import { PageHeader } from '@/components/PageHeader';

interface PageProps {
  searchParams: Promise<{
    partId?: string;
    locationId?: string;
    status?: string;
    seller?: string;
    offset?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}

const PAGE_SIZE = 50;

const LOTS_SORT_ALLOWLIST = ['updatedAt', 'createdAt', 'quantity', 'status'] as const;
type LotsSortField = (typeof LOTS_SORT_ALLOWLIST)[number];

async function getLotsData(params: Awaited<PageProps['searchParams']>) {
  const offset = Math.max(0, Number(params.offset) || 0);

  const sortBy: LotsSortField =
    params.sortBy && (LOTS_SORT_ALLOWLIST as readonly string[]).includes(params.sortBy)
      ? (params.sortBy as LotsSortField)
      : 'updatedAt';
  const sortDir: 'asc' | 'desc' = params.sortDir === 'asc' ? 'asc' : 'desc';

  const where: { partId?: string; locationId?: string; status?: string } = {};
  if (params.partId) where.partId = params.partId;
  if (params.locationId) where.locationId = params.locationId;
  if (params.status) where.status = params.status;

  // When seller filter is active, fetch all matching rows first (source is a JSON string
  // field and cannot be filtered at the database level), then apply in-memory filtering
  // before slicing for pagination.
  if (params.seller) {
    const sellerLower = params.seller.toLowerCase();
    const [allLots, parts, locations] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          part: { select: { id: true, name: true, category: true } },
          location: { select: { id: true, name: true, path: true } },
        },
        orderBy: { [sortBy]: sortDir },
      }),
      prisma.part.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.location.findMany({ select: { id: true, name: true, path: true }, orderBy: { path: 'asc' } }),
    ]);

    const filtered = allLots.filter(lot => {
      const src = safeParseJson<{ seller?: string }>(lot.source, {});
      return src.seller?.toLowerCase().includes(sellerLower);
    });
    const lots = filtered.slice(offset, offset + PAGE_SIZE).map(lot => ({
      ...lot,
      source: safeParseJson<Record<string, unknown>>(lot.source, {}),
    })) satisfies LotCardLot[];

    return { lots, total: filtered.length, parts, locations, offset };
  }

  const [lots, total, parts, locations] = await Promise.all([
    prisma.lot.findMany({
      where,
      include: {
        part: { select: { id: true, name: true, category: true } },
        location: { select: { id: true, name: true, path: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: offset,
      take: PAGE_SIZE,
    }),
    prisma.lot.count({ where }),
    prisma.part.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({
      select: { id: true, name: true, path: true },
      orderBy: { path: 'asc' },
    }),
  ]);

  const lotsWithSource = lots.map(lot => ({
    ...lot,
    source: safeParseJson<Record<string, unknown>>(lot.source, {}),
  })) satisfies LotCardLot[];

  return {
    lots: lotsWithSource,
    total,
    parts,
    locations,
    offset,
  };
}

export default async function LotsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { lots, total, parts, locations, offset } = await getLotsData(params);

  const partOptions = parts.map(p => ({ value: p.id, label: p.name }));
  const locationOptions = locations.map(l => ({
    value: l.id,
    label: l.path || l.name,
  }));

  const buildPaginationUrl = (newOffset: number) => {
    const p = new URLSearchParams();
    if (params.partId) p.set('partId', params.partId);
    if (params.locationId) p.set('locationId', params.locationId);
    if (params.status) p.set('status', params.status);
    if (params.seller) p.set('seller', params.seller);
    if (params.sortBy) p.set('sortBy', params.sortBy);
    if (params.sortDir) p.set('sortDir', params.sortDir);
    p.set('offset', String(newOffset));
    return `/lots?${p.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Lots"
          description={`${total} lot${total !== 1 ? 's' : ''} found`}
        />

        <div className="flex gap-8">
          <Suspense fallback={null}>
            <LotFilterForm
              partOptions={partOptions}
              locationOptions={locationOptions}
            />
          </Suspense>

          <div className="flex-1 min-w-0">
            {lots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No lots found. Try adjusting your filters.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lots.map(lot => (
                    <LotCard key={lot.id} lot={lot} />
                  ))}
                </div>

                {total > PAGE_SIZE && (
                  <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                      {offset > 0 && (
                        <a
                          href={buildPaginationUrl(offset - PAGE_SIZE)}
                          className="rounded-md border px-3 py-1 hover:bg-muted"
                        >
                          Previous
                        </a>
                      )}
                      {offset + PAGE_SIZE < total && (
                        <a
                          href={buildPaginationUrl(offset + PAGE_SIZE)}
                          className="rounded-md border px-3 py-1 hover:bg-muted"
                        >
                          Next
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
