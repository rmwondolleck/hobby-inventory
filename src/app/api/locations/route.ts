import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT)), MAX_LIMIT);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const withChildren = searchParams.get('withChildren') === 'true';

  const [data, total] = await Promise.all([
    prisma.location.findMany({
      take: limit,
      skip: offset,
      orderBy: { path: 'asc' },
      include: withChildren
        ? { children: { select: { id: true, name: true, path: true }, orderBy: { name: 'asc' } } }
        : undefined,
    }),
    prisma.location.count(),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; parentId?: string; notes?: string };
    const { name, parentId, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name is required' },
        { status: 400 }
      );
    }

    let path = name.trim();
    if (parentId) {
      const parent = await prisma.location.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json(
          { error: 'not_found', message: 'Parent location not found' },
          { status: 404 }
        );
      }
      path = `${parent.path}/${name.trim()}`;
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        parentId: parentId ?? null,
        path,
        notes: notes?.trim() ?? null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create location' },
      { status: 500 }
    );
  }
}
