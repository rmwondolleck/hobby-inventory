import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildLocationPath } from '@/lib/utils';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      children: {
        orderBy: { name: 'asc' },
      },
      lots: {
        orderBy: { createdAt: 'desc' },
        include: {
          part: { select: { id: true, name: true, category: true } },
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json(
      { error: 'NotFound', message: 'Location not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: location });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'NotFound', message: 'Location not found' },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'BadRequest', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'BadRequest', message: 'Request body must be a JSON object' },
      { status: 400 }
    );
  }

  const { name, parentId, notes } = body as {
    name?: unknown;
    parentId?: unknown;
    notes?: unknown;
  };

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return NextResponse.json(
      { error: 'BadRequest', message: 'name must be a non-empty string' },
      { status: 400 }
    );
  }

  if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'parentId must be a string or null' },
      { status: 400 }
    );
  }

  // Normalize empty/whitespace string parentId to null
  const resolvedParentId: string | null | undefined =
    parentId === undefined
      ? undefined
      : typeof parentId === 'string' && parentId.trim() !== ''
        ? parentId
        : null;

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'notes must be a string or null' },
      { status: 400 }
    );
  }

  // Prevent making a location its own parent or creating a cycle
  if (resolvedParentId && resolvedParentId === id) {
    return NextResponse.json(
      { error: 'BadRequest', message: 'A location cannot be its own parent' },
      { status: 400 }
    );
  }

  // Check that the new parentId exists
  const newParentId = resolvedParentId !== undefined ? resolvedParentId : existing.parentId;
  let fetchedParent: { id: string; path: string } | null = null;
  if (newParentId) {
    fetchedParent = await prisma.location.findUnique({ where: { id: newParentId } });
    if (!fetchedParent) {
      return NextResponse.json(
        { error: 'NotFound', message: 'Parent location not found' },
        { status: 404 }
      );
    }

    // Guard against cycles: new parent must not be a descendant of this location
    const isDescendant = await checkIsDescendant(id, newParentId);
    if (isDescendant) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Cannot move a location under one of its own descendants' },
        { status: 400 }
      );
    }
  }

  const newName = name !== undefined ? (name as string).trim() : existing.name;
  const newParentPath = fetchedParent ? fetchedParent.path : undefined;
  const newPath = buildLocationPath(newName, newParentPath);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.location.update({
      where: { id },
      data: {
        name: newName,
        parentId: newParentId,
        path: newPath,
        ...(notes !== undefined && { notes: notes as string | null }),
      },
    });

    // Propagate path changes to all descendants
    if (newPath !== existing.path) {
      await propagatePathUpdate(tx, id, existing.path, newPath);
    }

    return result;
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      children: { select: { id: true } },
      lots: { select: { id: true } },
    },
  });

  if (!location) {
    return NextResponse.json(
      { error: 'NotFound', message: 'Location not found' },
      { status: 404 }
    );
  }

  if (location.children.length > 0) {
    return NextResponse.json(
      { error: 'Conflict', message: 'Cannot delete a location that has child locations' },
      { status: 409 }
    );
  }

  if (location.lots.length > 0) {
    return NextResponse.json(
      { error: 'Conflict', message: 'Cannot delete a location that contains lots' },
      { status: 409 }
    );
  }

  await prisma.location.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

/** Returns true if `candidateId` is a descendant of `ancestorId` */
async function checkIsDescendant(ancestorId: string, candidateId: string): Promise<boolean> {
  let current: string | null = candidateId;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current)) break; // cycle guard
    visited.add(current);

    if (current === ancestorId) return true;

    const loc: { parentId: string | null } | null = await prisma.location.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = loc?.parentId ?? null;
  }

  return false;
}

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Update path of all descendants when a location's path changes */
async function propagatePathUpdate(
  tx: TransactionClient,
  locationId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  const children = await tx.location.findMany({
    where: { parentId: locationId },
  });

  for (const child of children) {
    const updatedChildPath = child.path.startsWith(oldPath)
      ? newPath + child.path.slice(oldPath.length)
      : child.path;
    await tx.location.update({
      where: { id: child.id },
      data: { path: updatedChildPath },
    });
    await propagatePathUpdate(tx, child.id, child.path, updatedChildPath);
  }
}
