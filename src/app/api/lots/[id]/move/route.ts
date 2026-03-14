import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

type RouteParams = { params: Promise<{ id: string }> };

function parseSource(source: string): Record<string, unknown> {
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({ where: { id } });
  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: `Lot ${id} not found` },
      { status: 404 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  const { locationId, notes } = body;

  // locationId is required (can be null to clear location)
  if (!('locationId' in body)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'locationId is required' },
      { status: 400 }
    );
  }

  if (locationId !== null && typeof locationId !== 'string') {
    return NextResponse.json(
      { error: 'validation_error', message: 'locationId must be a string or null' },
      { status: 400 }
    );
  }

  // Validate that the destination location exists
  if (locationId !== null && typeof locationId === 'string') {
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      return NextResponse.json(
        { error: 'not_found', message: `Location ${locationId} not found` },
        { status: 404 }
      );
    }
  }

  const fromLocationId = lot.locationId;
  const toLocationId = locationId as string | null;

  // Atomically update the lot and create the move event
  const [updatedLot] = await prisma.$transaction([
    prisma.lot.update({
      where: { id },
      data: { locationId: toLocationId },
      include: {
        part: { select: { id: true, name: true, category: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    }),
    prisma.event.create({
      data: {
        lotId: id,
        type: 'moved',
        fromLocationId: fromLocationId ?? null,
        toLocationId: toLocationId ?? null,
        notes: notes && typeof notes === 'string' ? notes : null,
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      ...updatedLot,
      source: parseSource(updatedLot.source),
    },
  });
}
