import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const where: Prisma.LocationWhereInput = q
    ? {
        OR: [
          { name: { contains: q } },
          { path: { contains: q } },
          { notes: { contains: q } },
        ],
      }
    : {};

  const [total, locations] = await Promise.all([
    prisma.location.count({ where }),
    prisma.location.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { path: 'asc' },
    }),
  ]);

  return NextResponse.json({ data: locations, total, limit, offset });
}
