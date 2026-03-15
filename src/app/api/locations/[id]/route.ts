import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      children: { orderBy: { name: 'asc' } },
      lots: {
        include: {
          part: { select: { id: true, name: true, category: true } },
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json(
      { error: 'not_found', message: 'Location not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(location);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: 'Location not found' },
      { status: 404 }
    );
  }

  const body = await request.json() as { name?: string; notes?: string };
  const { name, notes } = body;

  const updates: { name?: string; path?: string; notes?: string | null } = {};
  if (name !== undefined) {
    updates.name = name.trim();
    const segments = existing.path.split('/');
    segments[segments.length - 1] = name.trim();
    updates.path = segments.join('/');
  }
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  let location;
  if (updates.path && updates.path !== existing.path) {
    const oldPath = existing.path;
    const newPath = updates.path;
    const descendants = await prisma.location.findMany({
      where: { path: { startsWith: oldPath + '/' } },
    });
    const ops = [
      ...descendants.map((d: { id: string; path: string }) =>
        prisma.location.update({
          where: { id: d.id },
          data: { path: d.path.replace(oldPath, newPath) },
        })
      ),
      prisma.location.update({ where: { id }, data: updates }),
    ];
    const results = await prisma.$transaction(ops);
    location = results[results.length - 1];
  } else {
    location = await prisma.location.update({ where: { id }, data: updates });
  }
  return NextResponse.json(location);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.location.findUnique({
    where: { id },
    include: { children: true, lots: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: 'Location not found' },
      { status: 404 }
    );
  }

  if (existing.children.length > 0) {
    return NextResponse.json(
      { error: 'has_children', message: 'Cannot delete a location that has children' },
      { status: 409 }
    );
  }

  if (existing.lots.length > 0) {
    return NextResponse.json(
      { error: 'has_lots', message: 'Cannot delete a location that has lots' },
      { status: 409 }
    );
  }

  await prisma.location.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
