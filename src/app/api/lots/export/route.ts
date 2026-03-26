import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { recordsToCSV } from '@/lib/csv';

const LOTS_EXPORT_HEADERS = [
  'partName',
  'partMpn',
  'quantity',
  'unit',
  'status',
  'locationPath',
  'seller',
  'sourceUrl',
  'unitCost',
  'currency',
  'purchaseDate',
  'notes',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status') ?? undefined;
  const locationId = searchParams.get('locationId') ?? undefined;

  const date = new Date().toISOString().slice(0, 10);
  const downloadHeaders = {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="lots-export-${date}.csv"`,
  };

  // Resolve locationId to include all descendant locations via path-prefix query
  let locationIds: string[] | undefined;
  if (locationId) {
    const rootLocation = await prisma.location.findUnique({ where: { id: locationId } });
    if (!rootLocation) {
      return new NextResponse(recordsToCSV(LOTS_EXPORT_HEADERS, []), { headers: downloadHeaders });
    }
    const childLocations = await prisma.location.findMany({
      where: { path: { startsWith: rootLocation.path } },
      select: { id: true },
    });
    locationIds = childLocations.map((l) => l.id);
  }

  const statusList = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const where = {
    AND: [
      ...(statusList && statusList.length > 0 ? [{ status: { in: statusList } }] : []),
      ...(locationIds !== undefined ? [{ locationId: { in: locationIds } }] : []),
    ],
  };

  try {
    const lots = await prisma.lot.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        part: { select: { name: true, mpn: true } },
        location: { select: { path: true } },
      },
    });

    const records = lots.map((lot) => {
      const src = safeParseJson<{
        seller?: string;
        sourceUrl?: string;
        unitCost?: number | string;
        currency?: string;
        purchaseDate?: string;
      }>(lot.source, {});

      return {
        partName: lot.part.name ?? '',
        partMpn: lot.part.mpn ?? '',
        quantity: lot.quantity != null ? String(lot.quantity) : '',
        unit: lot.unit ?? '',
        status: lot.status,
        locationPath: lot.location?.path ?? '',
        seller: src.seller ?? '',
        sourceUrl: src.sourceUrl ?? '',
        unitCost: src.unitCost != null ? String(src.unitCost) : '',
        currency: src.currency ?? '',
        purchaseDate: src.purchaseDate ?? '',
        notes: lot.notes ?? '',
      };
    });

    return new NextResponse(recordsToCSV(LOTS_EXPORT_HEADERS, records), { headers: downloadHeaders });
  } catch {
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to export lots' },
      { status: 500 }
    );
  }
}
