import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createEvent } from '@/lib/events';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const VALID_STATUSES = ['in_stock', 'low', 'out', 'reserved', 'installed', 'lost', 'scrapped'];
const VALID_QUANTITY_MODES = ['exact', 'qualitative'];
const VALID_QUALITATIVE_STATUSES = ['plenty', 'low', 'out'];

const LOTS_SORT_ALLOWLIST = ['updatedAt', 'createdAt', 'quantity', 'status'] as const;
type LotsSortField = (typeof LOTS_SORT_ALLOWLIST)[number];

function parseSource(source: unknown): Record<string, unknown> {
  if (typeof source === 'string') {
    try {
      return JSON.parse(source) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return source as Record<string, unknown>;
  }
  return {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') ?? undefined;
  const statusParam = searchParams.get('status') ?? undefined;
  const locationId = searchParams.get('locationId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const partId = searchParams.get('partId') ?? undefined;
  const sourceSeller = searchParams.get('source.seller') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const sortByParam = searchParams.get('sortBy');
  const sortDirParam = searchParams.get('sortDir') ?? 'desc';
  const sortBy: LotsSortField =
    sortByParam && (LOTS_SORT_ALLOWLIST as readonly string[]).includes(sortByParam)
      ? (sortByParam as LotsSortField)
      : 'updatedAt';
  const sortDir: 'asc' | 'desc' = sortDirParam === 'asc' ? 'asc' : 'desc';

  const staleSince = searchParams.get('staleSince') ?? undefined;
  let staleSinceDate: Date | undefined;
  if (staleSince) {
    staleSinceDate = new Date(staleSince);
    if (isNaN(staleSinceDate.getTime())) {
      return NextResponse.json({ error: 'invalid_param', message: 'staleSince must be a valid ISO date string' }, { status: 400 });
    }
  }

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
      return NextResponse.json({ data: [], total: 0, limit, offset });
    }
  }

  // Parse comma-separated status list
  const statusList = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const where = {
    AND: [
      ...(partId ? [{ partId }] : []),
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
      ...(sourceSeller ? [{ source: { contains: sourceSeller } }] : []),
      ...(staleSinceDate
        ? [
            {
              OR: [
                { events: { none: { createdAt: { gt: staleSinceDate } } } },
                { events: { none: {} } },
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
      orderBy: { [sortBy]: sortDir },
      include: {
        part: { select: { id: true, name: true, category: true, mpn: true, reorderPoint: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    }),
  ]);

  const data = lots.map((lot: (typeof lots)[number]) => ({
    ...lot,
    source: parseSource(lot.source),
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

  const {
    partId,
    quantity,
    quantityMode,
    qualitativeStatus,
    unit,
    status,
    locationId,
    source,
    receivedAt,
    notes,
  } = body;

  if (!partId || typeof partId !== 'string') {
    return NextResponse.json(
      { error: 'validation_error', message: 'partId is required' },
      { status: 400 }
    );
  }

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) {
    return NextResponse.json(
      { error: 'not_found', message: `Part ${partId} not found` },
      { status: 404 }
    );
  }

  const mode = (quantityMode ?? 'exact') as string;
  if (!VALID_QUANTITY_MODES.includes(mode)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'quantityMode must be "exact" or "qualitative"' },
      { status: 400 }
    );
  }

  if (mode === 'exact' && quantity !== undefined && quantity !== null) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'quantity must be a non-negative integer' },
        { status: 400 }
      );
    }
  }

  if (
    mode === 'qualitative' &&
    qualitativeStatus !== undefined &&
    qualitativeStatus !== null
  ) {
    if (!VALID_QUALITATIVE_STATUSES.includes(qualitativeStatus as string)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'qualitativeStatus must be "plenty", "low", or "out"',
        },
        { status: 400 }
      );
    }
  }

  const lotStatus = (status ?? 'in_stock') as string;
  // Auto-derive initial status when caller didn't supply one explicitly
  const initialStatus = !status && mode === 'exact' && typeof quantity === 'number' && quantity === 0
    ? 'out'
    : lotStatus;
  if (!VALID_STATUSES.includes(initialStatus)) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  if (locationId !== undefined && locationId !== null) {
    if (typeof locationId !== 'string') {
      return NextResponse.json(
        { error: 'validation_error', message: 'locationId must be a string' },
        { status: 400 }
      );
    }
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json(
        { error: 'not_found', message: `Location ${locationId} not found` },
        { status: 404 }
      );
    }
  }

  let receivedAtDate: Date | null = null;
  if (receivedAt !== undefined && receivedAt !== null) {
    receivedAtDate = new Date(receivedAt as string);
    if (isNaN(receivedAtDate.getTime())) {
      return NextResponse.json(
        { error: 'validation_error', message: 'receivedAt must be a valid ISO date string' },
        { status: 400 }
      );
    }
  }

  const parsedSource = parseSource(source);

  const lot = await prisma.lot.create({
    data: {
      partId,
      quantity:
        mode === 'exact' && quantity !== undefined && quantity !== null
          ? (quantity as number)
          : null,
      quantityMode: mode,
      qualitativeStatus:
        mode === 'qualitative' && qualitativeStatus !== undefined && qualitativeStatus !== null
          ? (qualitativeStatus as string)
          : null,
      unit: unit && typeof unit === 'string' ? unit : null,
      status: initialStatus,
      locationId:
        locationId !== undefined && locationId !== null ? (locationId as string) : null,
      source: JSON.stringify(parsedSource),
      receivedAt: receivedAtDate,
      notes: notes && typeof notes === 'string' ? notes : null,
    },
    include: {
      part: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true, path: true } },
    },
  });

  await createEvent({ lotId: lot.id, type: 'received' });

  return NextResponse.json(
    {
      data: {
        ...lot,
        source: parsedSource,
      },
    },
    { status: 201 }
  );
}
