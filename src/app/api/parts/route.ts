import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') ?? '';
    const category = searchParams.get('category') ?? '';
    const tags = searchParams.get('tags') ?? '';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    );
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (!includeArchived) {
      where.archivedAt = null;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { mpn: { contains: search } },
        { manufacturer: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [parts, total] = await Promise.all([
      prisma.part.findMany({
        where,
        include: {
          lots: {
            where: { status: 'in_stock' },
            select: {
              quantity: true,
              quantityMode: true,
              qualitativeStatus: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.part.count({ where }),
    ]);

    const tagFilter = tags.split(',').filter(Boolean);

    const enriched = parts.map((part) => ({
      ...part,
      tags: safeJsonParse<string[]>(part.tags, []),
      parameters: safeJsonParse<Record<string, unknown>>(part.parameters, {}),
      totalQuantity: part.lots
        .filter((l) => l.quantityMode === 'exact')
        .reduce((sum, l) => sum + (l.quantity ?? 0), 0),
      qualitativeStatuses: Array.from(
        new Set(
          part.lots
            .filter((l) => l.quantityMode === 'qualitative' && l.qualitativeStatus)
            .map((l) => l.qualitativeStatus as string)
        )
      ),
      lotCount: part.lots.length,
    }));

    const filtered =
      tagFilter.length > 0
        ? enriched.filter((p) => tagFilter.some((t) => p.tags.includes(t)))
        : enriched;

    return NextResponse.json({
      data: filtered,
      total: tagFilter.length > 0 ? filtered.length : total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[GET /api/parts]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch parts' },
      { status: 500 }
    );
  }
}
