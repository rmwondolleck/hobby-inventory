import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      part: true,
      location: true,
      allocations: {
        include: {
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...lot,
    source: safeParseJson<Record<string, unknown>>(lot.source, {}),
    part: {
      ...lot.part,
      tags: safeParseJson<string[]>(lot.part.tags, []),
      parameters: safeParseJson<Record<string, unknown>>(lot.part.parameters, {}),
    },
  });
}
