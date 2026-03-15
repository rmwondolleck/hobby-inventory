import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeJsonParse } from '@/lib/utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

// Mirrors Prisma.PartWhereInput; replace with that import once @prisma/client is available
type PartWhereInput = {
  AND?: PartWhereInput[];
  archivedAt?: null;
  category?: string;
  OR?: Array<{
    name?: { contains: string };
    mpn?: { contains: string };
    manufacturer?: { contains: string };
    tags?: { contains: string };
  }>;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') ?? '';
    const category = searchParams.get('category') ?? '';
    const tags = searchParams.get('tags') ?? '';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Math.min(
      Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const andConditions: PartWhereInput[] = [];

    if (!includeArchived) {
      andConditions.push({ archivedAt: null });
    }

    if (category) {
      andConditions.push({ category });
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search } },
          { mpn: { contains: search } },
          { manufacturer: { contains: search } },
          { tags: { contains: search } },
        ],
      });
    }

    const tagFilter = tags.split(',').filter(Boolean);
    if (tagFilter.length > 0) {
      // Tags are stored as JSON arrays (e.g. '["resistor","0402"]').
      // Match each tag by looking for the quoted string inside the serialized JSON value.
      // Escape backslashes and quotes so user input cannot break out of the JSON pattern.
      andConditions.push({
        OR: tagFilter.map((tag) => {
          const escaped = tag.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return { tags: { contains: `"${escaped}"` } };
        }),
      });
    }

    const where: PartWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

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

    const data = parts.map((part) => ({
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

    return NextResponse.json({ data, total, limit, offset });
  } catch (error) {
    console.error('[GET /api/parts]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch parts' },
      { status: 500 }
    );
  }
}
