import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const limit = Math.max(0, Math.min(Number(searchParams.get('limit')) || 50, 500));
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  const lot = await prisma.lot.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 }
    );
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: { lotId: id },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.event.count({ where: { lotId: id } }),
  ]);

  return NextResponse.json({ data: events, total, limit, offset });
}
