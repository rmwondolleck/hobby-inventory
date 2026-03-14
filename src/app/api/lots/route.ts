import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const partId = searchParams.get('partId');
  const locationId = searchParams.get('locationId');
  const status = searchParams.get('status');
  const seller = searchParams.get('seller');

  const where: { partId?: string; locationId?: string; status?: string } = {};
  if (partId) where.partId = partId;
  if (locationId) where.locationId = locationId;
  if (status) where.status = status;

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

  // Seller filter is applied post-parse since source is stored as JSON
  const filteredLots = seller
    ? lotsWithSource.filter(lot => {
        const src = lot.source as { seller?: string };
        return src.seller?.toLowerCase().includes(seller.toLowerCase());
      })
    : lotsWithSource;

  return NextResponse.json({
    data: filteredLots,
    total: seller ? filteredLots.length : total,
    limit,
    offset,
  });
}
