import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const part = await prisma.part.findUnique({ where: { id }, select: { id: true } });
    if (!part) {
      return NextResponse.json(
        { error: 'not_found', message: 'Part not found' },
        { status: 404 },
      );
    }

    const lots = await prisma.lot.findMany({
      where: { partId: id },
      select: { id: true },
    });
    const lotIds = lots.map((l: { id: string }) => l.id);

    if (lotIds.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    const events = await prisma.event.findMany({
      where: { lotId: { in: lotIds } },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich events with location data for moved events
    const locationIds = Array.from(
      new Set(
        events.flatMap((e: { fromLocationId: string | null; toLocationId: string | null }) =>
          [e.fromLocationId, e.toLocationId].filter(Boolean) as string[]
        )
      )
    );

    const locationMap = new Map<string, { name: string; path: string }>();
    if (locationIds.length > 0) {
      const locations = await prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true, path: true },
      });
      for (const loc of locations) {
        locationMap.set(loc.id, { name: loc.name, path: loc.path });
      }
    }

    type PrismaEvent = {
      id: string;
      lotId: string;
      type: string;
      delta: number | null;
      fromLocationId: string | null;
      toLocationId: string | null;
      projectId: string | null;
      notes: string | null;
      createdAt: Date;
    };

    const enrichedEvents = events.map((e: PrismaEvent) => ({
      id: e.id,
      lotId: e.lotId,
      type: e.type,
      delta: e.delta,
      fromLocationId: e.fromLocationId,
      toLocationId: e.toLocationId,
      projectId: e.projectId,
      notes: e.notes,
      createdAt: e.createdAt,
      fromLocation: e.fromLocationId ? (locationMap.get(e.fromLocationId) ?? null) : null,
      toLocation: e.toLocationId ? (locationMap.get(e.toLocationId) ?? null) : null,
    }));

    return NextResponse.json({ data: enrichedEvents, total: enrichedEvents.length });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
