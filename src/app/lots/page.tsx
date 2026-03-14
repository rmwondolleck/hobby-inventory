import { Suspense } from 'react';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { LotCard, type LotCardLot } from '@/features/lots/components/LotCard';
import { LotFilterForm } from '@/features/lots/components/LotFilterForm';

interface PageProps {
  searchParams: Promise<{
    partId?: string;
    locationId?: string;
    status?: string;
    seller?: string;
    offset?: string;
  }>;
}

const PAGE_SIZE = 50;

async function getLotsData(params: Awaited<PageProps['searchParams']>) {
  const offset = parseInt(params.offset ?? '0');

  const where: { partId?: string; locationId?: string; status?: string } = {};
  if (params.partId) where.partId = params.partId;
  if (params.locationId) where.locationId = params.locationId;
  if (params.status) where.status = params.status;

  const [lots, total, parts, locations] = await Promise.all([
    prisma.lot.findMany({
      where,
      include: {
        part: { select: { id: true, name: true, category: true } },
        location: { select: { id: true, name: true, path: true } },
      },
      orderBy: { createdAt: 'desc' },
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

  const filteredLots = params.seller
    ? lotsWithSource.filter(lot => {
        const src = lot.source as { seller?: string };
        return src.seller?.toLowerCase().includes(params.seller!.toLowerCase());
      })
    : lotsWithSource;

  return {
    lots: filteredLots,
    total: params.seller ? filteredLots.length : total,
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
    const p = { ...params, offset: String(newOffset) };
    return `/lots?${new URLSearchParams(p as Record<string, string>)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Lots</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} lot{total !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex gap-8">
          <Suspense fallback={null}>
            <LotFilterForm
              partOptions={partOptions}
              locationOptions={locationOptions}
            />
          </Suspense>

          <div className="flex-1 min-w-0">
            {lots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500">No lots found. Try adjusting your filters.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lots.map(lot => (
                    <LotCard key={lot.id} lot={lot} />
                  ))}
                </div>

                {total > PAGE_SIZE && (
                  <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                      {offset > 0 && (
                        <a
                          href={buildPaginationUrl(offset - PAGE_SIZE)}
                          className="rounded-md border px-3 py-1 hover:bg-gray-100"
                        >
                          Previous
                        </a>
                      )}
                      {offset + PAGE_SIZE < total && (
                        <a
                          href={buildPaginationUrl(offset + PAGE_SIZE)}
                          className="rounded-md border px-3 py-1 hover:bg-gray-100"
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
