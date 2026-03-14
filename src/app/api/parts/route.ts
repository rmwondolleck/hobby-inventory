import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === 'string');
  return [];
}

function parseParameters(parameters: unknown): Record<string, unknown> {
  if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
    return parameters as Record<string, unknown>;
  }
  return {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const tagsParam = searchParams.get('tags') ?? undefined;
  const archived = searchParams.get('archived');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const includeArchived = archived === 'true';
  const tagList = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const where = {
    ...(!includeArchived ? { archivedAt: null } : {}),
    ...(category ? { category } : {}),
    ...(q || tagList.length > 0
      ? {
          AND: [
            ...(q
              ? [
                  {
                    OR: [
                      { name: { contains: q } },
                      { mpn: { contains: q } },
                      { manufacturer: { contains: q } },
                      { tags: { contains: q } },
                      { notes: { contains: q } },
                    ],
                  },
                ]
              : []),
            ...(tagList.length > 0
              ? tagList.map((tag) => ({ tags: { contains: tag } }))
              : []),
          ],
        }
      : {}),
  };

  const [total, parts] = await Promise.all([
    prisma.part.count({ where }),
    prisma.part.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const data = parts.map((part: (typeof parts)[number]) => ({
    ...part,
    tags: safeParseJson<string[]>(part.tags, []),
    parameters: safeParseJson<Record<string, unknown>>(part.parameters, {}),
  }));

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  const { name, category, manufacturer, mpn, tags, notes, parameters } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'name is required' },
      { status: 400 }
    );
  }

  // Duplicate warning: same MPN + manufacturer (non-archived)
  let duplicateWarning: { id: string; name: string } | null = null;
  if (mpn && typeof mpn === 'string' && manufacturer && typeof manufacturer === 'string') {
    const existing = await prisma.part.findFirst({
      where: {
        mpn: mpn.trim(),
        manufacturer: manufacturer.trim(),
        archivedAt: null,
      },
      select: { id: true, name: true },
    });
    if (existing) {
      duplicateWarning = existing;
    }
  }

  const part = await prisma.part.create({
    data: {
      name: (name as string).trim(),
      category: category && typeof category === 'string' ? category.trim() : undefined,
      manufacturer: manufacturer && typeof manufacturer === 'string' ? manufacturer.trim() : undefined,
      mpn: mpn && typeof mpn === 'string' ? mpn.trim() : undefined,
      tags: JSON.stringify(parseTags(tags)),
      notes: notes && typeof notes === 'string' ? notes : undefined,
      parameters: JSON.stringify(parseParameters(parameters)),
    },
  });

  const response = {
    data: {
      ...part,
      tags: safeParseJson<string[]>(part.tags, []),
      parameters: safeParseJson<Record<string, unknown>>(part.parameters, {}),
    },
    ...(duplicateWarning
      ? {
          warning: {
            code: 'duplicate_mpn',
            message: `A part with the same MPN and manufacturer already exists`,
            existing: duplicateWarning,
          },
        }
      : {}),
  };

  return NextResponse.json(response, { status: 201 });
}
