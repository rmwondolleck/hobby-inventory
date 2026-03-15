import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

/**
 * Parse `parameters.*` query params from the URL.
 * e.g. ?parameters.ble=true&parameters.voltage=3.3V => { ble: 'true', voltage: '3.3V' }
 */
function parseParameterFilters(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of Array.from(searchParams.entries())) {
    if (key.startsWith('parameters.')) {
      const paramKey = key.slice('parameters.'.length);
      if (paramKey) filters[paramKey] = value;
    }
  }
  return filters;
}

/**
 * Match a part's parameters object against the filter map.
 * Coerces booleans and numbers for comparison.
 */
function matchesParameterFilters(
  parameters: Record<string, unknown>,
  filters: Record<string, string>
): boolean {
  for (const [key, rawValue] of Object.entries(filters)) {
    const actual = parameters[key];
    if (actual === undefined) return false;

    // Coerce filter value for boolean comparison
    if (rawValue === 'true' || rawValue === 'false') {
      if (actual !== (rawValue === 'true')) return false;
    } else if (!isNaN(Number(rawValue))) {
      if (Number(actual) !== Number(rawValue)) return false;
    } else {
      if (String(actual) !== rawValue) return false;
    }
  }
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT));
  const rawOffset = parseInt(searchParams.get('offset') ?? '0');
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const category = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const archived = searchParams.get('archived');
  const paramFilters = parseParameterFilters(searchParams);
  const hasParamFilters = Object.keys(paramFilters).length > 0;

  try {
    const where = {
      ...(category ? { category } : {}),
      ...(archived === 'true'
        ? { archivedAt: { not: null } }
        : archived === 'false'
        ? { archivedAt: null }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { manufacturer: { contains: search } },
              { mpn: { contains: search } },
              { notes: { contains: search } },
            ],
          }
        : {}),
    };

    // When parameter filters are present, fetch all matching (without pagination)
    // and apply in-memory filtering, then paginate manually.
    if (hasParamFilters) {
      const all = await prisma.part.findMany({ where, orderBy: { createdAt: 'desc' } });

      const filtered = all.filter((part: { parameters: string }) => {
        const params = safeParseJson<Record<string, unknown>>(part.parameters, {});
        return matchesParameterFilters(params, paramFilters);
      });

      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);

      return NextResponse.json({
        data: page.map((p: { tags: string; parameters: string }) => ({
          ...p,
          tags: safeParseJson<string[]>(p.tags, []),
          parameters: safeParseJson<Record<string, unknown>>(p.parameters, {}),
        })),
        total,
        limit,
        offset,
      });
    }

    const [parts, total] = await prisma.$transaction([
      prisma.part.findMany({ where, take: limit, skip: offset, orderBy: { createdAt: 'desc' } }),
      prisma.part.count({ where }),
    ]);

    return NextResponse.json({
      data: parts.map((p: { tags: string; parameters: string }) => ({
        ...p,
        tags: safeParseJson<string[]>(p.tags, []),
        parameters: safeParseJson<Record<string, unknown>>(p.parameters, {}),
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/parts error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch parts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Request body must be an object' },
      { status: 400 }
    );
  }

  const {
    name,
    category,
    manufacturer,
    mpn,
    tags,
    notes,
    parameters,
  } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'name is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'tags must be an array' },
      { status: 400 }
    );
  }

  if (parameters !== undefined && (typeof parameters !== 'object' || Array.isArray(parameters) || parameters === null)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'parameters must be an object' },
      { status: 400 }
    );
  }

  try {
    const part = await prisma.part.create({
      data: {
        name: (name as string).trim(),
        category: typeof category === 'string' ? category.trim() || null : null,
        manufacturer: typeof manufacturer === 'string' ? manufacturer.trim() || null : null,
        mpn: typeof mpn === 'string' ? mpn.trim() || null : null,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        parameters: JSON.stringify(
          parameters && typeof parameters === 'object' ? parameters : {}
        ),
      },
    });

    return NextResponse.json(
      {
        ...part,
        tags: safeParseJson<string[]>(part.tags, []),
        parameters: safeParseJson<Record<string, unknown>>(part.parameters, {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/parts error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create part' },
      { status: 500 }
    );
  }
}
