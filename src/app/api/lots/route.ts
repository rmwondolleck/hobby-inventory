import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { detectSourceType } from '@/lib/utils';
import type { SourceData, CreateLotBody } from '@/features/lots/types';
import type { SourceType } from '@/lib/types';

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

    const partId = searchParams.get('partId') ?? '';
    const locationId = searchParams.get('locationId') ?? '';
    const status = searchParams.get('status') ?? '';
    const seller = searchParams.get('seller') ?? '';
    const sourceType = searchParams.get('sourceType') ?? '';
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Math.min(isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit, MAX_LIMIT);
    const offset = isNaN(rawOffset) ? 0 : rawOffset;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (partId) {
      where.partId = partId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    if (status) {
      where.status = status;
    }

    // Filter by seller or sourceType via JSON string contains
    if (seller && sourceType) {
      where.AND = [
        { source: { contains: seller } },
        { source: { contains: `"type":"${sourceType}"` } },
      ];
    } else if (seller) {
      where.source = { contains: seller };
    } else if (sourceType) {
      where.source = { contains: `"type":"${sourceType}"` };
    }

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          part: {
            select: { id: true, name: true, category: true, mpn: true },
          },
          location: {
            select: { id: true, name: true, path: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.lot.count({ where }),
    ]);

    const data = lots.map((lot) => ({
      ...lot,
      source: safeJsonParse<SourceData | Record<string, never>>(lot.source, {}),
    }));

    return NextResponse.json({ data, total, limit, offset });
  } catch (error) {
    console.error('[GET /api/lots]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch lots' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateLotBody;

    const { partId, quantity, quantityMode, qualitativeStatus, unit, status, locationId, source, receivedAt, notes } = body;

    if (!partId || typeof partId !== 'string' || !partId.trim()) {
      return NextResponse.json(
        { error: 'validation_error', message: 'partId is required' },
        { status: 400 }
      );
    }

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) {
      return NextResponse.json(
        { error: 'not_found', message: 'Part not found' },
        { status: 404 }
      );
    }

    const resolvedMode = quantityMode ?? 'exact';

    if (resolvedMode === 'exact' && quantity !== undefined && typeof quantity !== 'number') {
      return NextResponse.json(
        { error: 'validation_error', message: 'quantity must be a number' },
        { status: 400 }
      );
    }

    if (locationId && typeof locationId === 'string') {
      const loc = await prisma.location.findUnique({ where: { id: locationId } });
      if (!loc) {
        return NextResponse.json(
          { error: 'not_found', message: 'Location not found' },
          { status: 404 }
        );
      }
    }

    // Auto-detect source type from URL if not provided
    let resolvedSource: SourceData | Record<string, never> = {};
    if (source && typeof source === 'object') {
      const detectedType: SourceType =
        !source.type && source.url
          ? (detectSourceType(source.url) as SourceType)
          : (source.type as SourceType) ?? 'manual';

      resolvedSource = {
        ...source,
        type: detectedType,
      } as SourceData;
    }

    const lot = await prisma.lot.create({
      data: {
        partId,
        quantity: resolvedMode === 'exact' ? (quantity ?? null) : null,
        quantityMode: resolvedMode,
        qualitativeStatus: resolvedMode === 'qualitative' ? (qualitativeStatus ?? null) : null,
        unit: (typeof unit === 'string' && unit.trim()) ? unit.trim() : null,
        status: status ?? 'in_stock',
        locationId: (typeof locationId === 'string' && locationId) ? locationId : null,
        source: JSON.stringify(resolvedSource),
        receivedAt: receivedAt ? new Date(receivedAt) : null,
        notes: (typeof notes === 'string' && notes.trim()) ? notes.trim() : null,
      },
      include: {
        part: { select: { id: true, name: true, category: true, mpn: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    });

    return NextResponse.json(
      {
        data: {
          ...lot,
          source: resolvedSource,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/lots]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create lot' },
      { status: 500 }
    );
  }
}
