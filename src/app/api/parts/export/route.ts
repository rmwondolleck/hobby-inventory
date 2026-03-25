import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { recordsToCSV } from '@/lib/csv';

const PARTS_EXPORT_HEADERS = ['name', 'category', 'manufacturer', 'mpn', 'tags', 'notes'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? undefined;
  const archived = searchParams.get('archived');

  const where = {
    ...(category ? { category } : {}),
    ...(archived === 'true'
      ? { archivedAt: { not: null } }
      : archived === 'false'
      ? { archivedAt: null }
      : {}),
  };

  try {
    const parts = await prisma.part.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        name: true,
        category: true,
        manufacturer: true,
        mpn: true,
        tags: true,
        notes: true,
      },
    });

    const records = parts.map((part) => ({
      name: part.name ?? '',
      category: part.category ?? '',
      manufacturer: part.manufacturer ?? '',
      mpn: part.mpn ?? '',
      tags: safeParseJson<string[]>(part.tags, []).join(';'),
      notes: part.notes ?? '',
    }));

    const csv = recordsToCSV(PARTS_EXPORT_HEADERS, records);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="parts-export-${date}.csv"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to export parts' },
      { status: 500 }
    );
  }
}
