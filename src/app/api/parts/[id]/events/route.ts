import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  return NextResponse.json({ data: events, total: events.length });
}
