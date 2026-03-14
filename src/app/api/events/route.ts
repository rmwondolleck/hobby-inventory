import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { EventType } from '@/lib/types';

const VALID_EVENT_TYPES: EventType[] = [
  'created', 'received', 'moved', 'allocated', 'installed',
  'returned', 'lost', 'scrapped', 'edited',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lotId = searchParams.get('lotId') ?? undefined;
  const partId = searchParams.get('partId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const typeParam = searchParams.get('type') ?? undefined;
  const since = searchParams.get('since') ?? undefined;
  const until = searchParams.get('until') ?? undefined;
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  if (isNaN(limit) || limit < 1) {
    return NextResponse.json(
      { error: 'invalid_param', message: 'limit must be a positive integer' },
      { status: 400 },
    );
  }
  if (isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: 'invalid_param', message: 'offset must be a non-negative integer' },
      { status: 400 },
    );
  }

  if (typeParam && !VALID_EVENT_TYPES.includes(typeParam as EventType)) {
    return NextResponse.json(
      { error: 'invalid_param', message: `type must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  let lotIds: string[] | undefined;

  if (partId) {
    const lots = await prisma.lot.findMany({
      where: { partId },
      select: { id: true },
    });
    lotIds = lots.map((l) => l.id);
    if (lotIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, limit, offset });
    }
  }

  if (lotId) {
    const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { id: true } });
    if (!lot) {
      return NextResponse.json(
        { error: 'not_found', message: 'Lot not found' },
        { status: 404 },
      );
    }
    lotIds = lotIds ? lotIds.filter((id) => id === lotId) : [lotId];
  }

  const where = {
    ...(lotIds ? { lotId: { in: lotIds } } : {}),
    ...(projectId ? { projectId } : {}),
    ...(typeParam ? { type: typeParam } : {}),
    ...((since || until)
      ? {
          createdAt: {
            ...(since ? { gte: new Date(since) } : {}),
            ...(until ? { lte: new Date(until) } : {}),
          },
        }
      : {}),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.event.count({ where }),
  ]);

  return NextResponse.json({ data: events, total, limit, offset });
}
