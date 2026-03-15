import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limit') ?? '', 10);
  const limit = Math.min(Number.isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : rawLimit, MAX_LIMIT);
  const rawOffset = parseInt(searchParams.get('offset') ?? '', 10);
  const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;
  const locationId = searchParams.get('locationId');
  const partId = searchParams.get('partId');
  const status = searchParams.get('status');

  const where: Record<string, string | null> = {};
  if (locationId !== null) where.locationId = locationId || null;
  if (partId) where.partId = partId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.lot.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        part: { select: { id: true, name: true, category: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    }),
    prisma.lot.count({ where }),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      partId?: string;
      quantity?: number;
      quantityMode?: string;
      qualitativeStatus?: string;
      unit?: string;
      status?: string;
      locationId?: string;
      notes?: string;
    };
    const { partId, quantity, quantityMode, qualitativeStatus, unit, status, locationId, notes } = body;

    if (!partId) {
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
    const lot = await prisma.lot.create({
      data: {
        partId,
        quantity: resolvedMode === 'qualitative' ? null : (quantity ?? null),
        quantityMode: resolvedMode,
        qualitativeStatus: resolvedMode === 'qualitative' ? (qualitativeStatus ?? 'plenty') : null,
        unit: unit?.trim() ?? null,
        status: status ?? 'in_stock',
        locationId: locationId ?? null,
        notes: notes?.trim() ?? null,
      },
      include: {
        part: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    });

    return NextResponse.json(lot, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create lot' },
      { status: 500 }
    );
  }
}
