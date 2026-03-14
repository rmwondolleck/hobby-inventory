import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const VALID_STATUSES = ['in_stock', 'low', 'out', 'reserved', 'installed', 'lost', 'scrapped'];
const VALID_QUANTITY_MODES = ['exact', 'qualitative'];
const VALID_QUALITATIVE_STATUSES = ['plenty', 'low', 'out'];

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
  const partId = searchParams.get('partId');
  const locationId = searchParams.get('locationId');
  const status = searchParams.get('status');
  const sourceSeller = searchParams.get('source.seller');

  const where: Record<string, unknown> = {};
  if (partId) where.partId = partId;
  if (locationId) where.locationId = locationId;
  if (status) where.status = status;

  let lots = await prisma.lot.findMany({
    where,
    include: {
      part: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true, path: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by source.seller in-memory since source is stored as a JSON string
  if (sourceSeller) {
    lots = lots.filter((lot) => parseSource(lot.source)?.seller === sourceSeller);
  }

  const data = lots.map((lot) => ({
    ...lot,
    source: parseSource(lot.source),
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

  // Validate partId
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

  // Validate quantityMode
  const mode = (quantityMode ?? 'exact') as string;
  if (!VALID_QUANTITY_MODES.includes(mode)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'quantityMode must be "exact" or "qualitative"' },
      { status: 400 }
    );
  }

  // Validate quantity for exact mode
  if (mode === 'exact' && quantity !== undefined && quantity !== null) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'quantity must be a non-negative integer' },
        { status: 400 }
      );
    }
  }

  // Validate qualitativeStatus
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

  // Validate status
  const lotStatus = (status ?? 'in_stock') as string;
  if (!VALID_STATUSES.includes(lotStatus)) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  // Validate locationId if provided
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

  // Validate receivedAt if provided
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
      status: lotStatus,
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
