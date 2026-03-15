import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const limit = Math.max(0, Math.min(Number(searchParams.get('limit')) || 50, 500));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
  const partId = searchParams.get('partId');
  const locationId = searchParams.get('locationId');
  const status = searchParams.get('status');
  const seller = searchParams.get('seller');

  const where: { partId?: string; locationId?: string; status?: string } = {};
  if (partId) where.partId = partId;
  if (locationId) where.locationId = locationId;
  if (status) where.status = status;

  // When seller filter is active, fetch all matching rows first (source is a JSON string
  // field and cannot be filtered at the database level), then apply in-memory filtering
  // before slicing for pagination.
  if (seller) {
    const allLots = await prisma.lot.findMany({
      where,
      include: {
        part: { select: { id: true, name: true, category: true } },
        location: { select: { id: true, name: true, path: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sellerLower = seller.toLowerCase();
    const filtered = allLots.filter(lot => {
      const src = safeParseJson<{ seller?: string }>(lot.source, {});
      return src.seller?.toLowerCase().includes(sellerLower);
    });

    const page = filtered.slice(offset, offset + limit).map(lot => ({
      ...lot,
      source: safeParseJson<Record<string, unknown>>(lot.source, {}),
    }));

    return NextResponse.json({
      data: page,
      total: filtered.length,
      limit,
      offset,
    });
  }

  const [lots, total] = await Promise.all([
    prisma.lot.findMany({
      where,
      include: {
        part: { select: { id: true, name: true, category: true } },
        location: { select: { id: true, name: true, path: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.lot.count({ where }),
  ]);

  const lotsWithSource = lots.map(lot => ({
    ...lot,
    source: safeParseJson<Record<string, unknown>>(lot.source, {}),
  }));

  return NextResponse.json({
    data: lotsWithSource,
    total,
    limit,
    offset,
  });
}
