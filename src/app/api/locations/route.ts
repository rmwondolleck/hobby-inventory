import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildLocationPath } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  const locations = await prisma.location.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { path: { contains: search } },
            { notes: { contains: search } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { children: true, lots: true } },
    },
    orderBy: { path: 'asc' },
  });

  return NextResponse.json({ data: locations, total: locations.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, parentId, notes } = body as {
      name: unknown;
      parentId?: unknown;
      notes?: unknown;
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name is required' },
        { status: 400 }
      );
    }

    let parentPath: string | undefined;
    if (parentId && typeof parentId === 'string') {
      const parent = await prisma.location.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json(
          { error: 'not_found', message: 'Parent location not found' },
          { status: 404 }
        );
      }
      parentPath = parent.path;
    }

    const path = buildLocationPath(name.trim(), parentPath);

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        parentId: (typeof parentId === 'string' && parentId) ? parentId : null,
        path,
        notes: (typeof notes === 'string' && notes.trim()) ? notes.trim() : null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('POST /api/locations error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create location' },
      { status: 500 }
    );
  }
}
