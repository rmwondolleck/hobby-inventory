import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') ?? undefined;
  const statusParam = searchParams.get('status') ?? undefined;
  const locationId = searchParams.get('locationId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  // Resolve locationId filter - include children via path prefix match
  let locationIds: string[] | undefined;
  if (locationId) {
    const rootLocation = await prisma.location.findUnique({ where: { id: locationId } });
    if (rootLocation) {
      const childLocations = await prisma.location.findMany({
        where: { path: { startsWith: rootLocation.path } },
        select: { id: true },
      });
      locationIds = childLocations.map((l: { id: string }) => l.id);
    } else {
      // Unknown locationId - return empty
      return NextResponse.json({ data: [], total: 0, limit, offset });
    }
  }

  // Parse comma-separated status list
  const statusList = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const where: Prisma.LotWhereInput = {
    AND: [
      ...(statusList && statusList.length > 0
        ? [{ status: { in: statusList } }]
        : []),
      ...(locationIds !== undefined
        ? [{ locationId: { in: locationIds } }]
        : []),
      ...(projectId
        ? [{ allocations: { some: { projectId } } }]
        : []),
      ...(q
        ? [
            {
              OR: [
                { part: { name: { contains: q } } },
                { part: { mpn: { contains: q } } },
                { notes: { contains: q } },
                { source: { contains: q } },
                { location: { name: { contains: q } } },
              ],
            },
          ]
        : []),
    ],
  };

  const [total, lots] = await Promise.all([
    prisma.lot.count({ where }),
    prisma.lot.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        part: { select: { id: true, name: true, category: true, mpn: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    }),
  ]);

  const data = lots.map((lot: (typeof lots)[number]) => ({
    ...lot,
    source: (() => { try { return JSON.parse(lot.source); } catch { return {}; } })(),
  }));

  return NextResponse.json({ data, total, limit, offset });
}
