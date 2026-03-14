import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

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
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const archived = searchParams.get('archived');

  const includeArchived = archived === 'true';

  // Build where clause
  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (!includeArchived) where.archivedAt = null;
  // Filter by tag using a SQL contains on the stored JSON string (e.g. `"resistor"`)
  if (tag) where.tags = { contains: JSON.stringify(tag) };

  const parts = await prisma.part.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const data = parts.map((p) => ({
    ...p,
    tags: safeParseJson<string[]>(p.tags, []),
    parameters: safeParseJson<Record<string, unknown>>(p.parameters, {}),
  }));

  return NextResponse.json({ data, total: data.length });
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
