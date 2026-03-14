import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({ where: { id }, select: { id: true } });
  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 },
    );
  }

  const events = await prisma.event.findMany({
    where: { lotId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: events, total: events.length });
}
