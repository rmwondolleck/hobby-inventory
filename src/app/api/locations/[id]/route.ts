import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildLocationPath } from '@/lib/utils';
import type { Prisma } from '@prisma/client';

type Params = { params: Promise<{ id: string }> };

type LocationChild = { id: string; name: string; parentId: string | null };
type ChildEntry = { id: string; path: string };

async function updateDescendantPaths(
  tx: Prisma.TransactionClient,
  locationId: string,
  newParentPath: string
): Promise<void> {
  // Map from location ID → its newly computed path, for the current BFS level
  let parentMap = new Map<string, string>([[locationId, newParentPath]]);

  while (parentMap.size > 0) {
    const parentIds = Array.from(parentMap.keys());

    // Single query for all children across this entire level
    const children = (await tx.location.findMany({
      where: { parentId: { in: parentIds } },
      select: { id: true, name: true, parentId: true },
    })) as LocationChild[];

    if (children.length === 0) break;

    // Compute new paths using the shared helper
    const childEntries: ChildEntry[] = children.map((child) => ({
      id: child.id,
      path: buildLocationPath(child.name, parentMap.get(child.parentId!)!),
    }));

    // Update all children at this level in parallel
    await Promise.all(
      childEntries.map(({ id: childId, path }: ChildEntry) =>
        tx.location.update({ where: { id: childId }, data: { path } })
      )
    );

    // Advance to the next level
    parentMap = new Map(childEntries.map(({ id: childId, path }: ChildEntry) => [childId, path]));
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      parent: true,
      children: { orderBy: { name: 'asc' } },
      lots: {
        include: {
          part: { select: { id: true, name: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
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

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { name, parentId, notes } = body as {
      name?: unknown;
      parentId?: unknown;
      notes?: unknown;
    };

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    if (typeof name === 'string' && name.includes('/')) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name cannot contain "/" character' },
        { status: 400 }
      );
    }

    // Early 404 check (before any heavy validation)
    const locationExists = await prisma.location.findUnique({ where: { id }, select: { id: true } });
    if (!locationExists) {
      return NextResponse.json(
        { error: 'not_found', message: 'Location not found' },
        { status: 404 }
      );
    }

    // Determine the desired new parentId from the request body
    // undefined = field not present → inherit from existing inside the transaction
    const hasParentId = 'parentId' in body;
    const desiredParentId = hasParentId
      ? (typeof parentId === 'string' && parentId ? parentId : null)
      : undefined;

    if (desiredParentId !== undefined && desiredParentId !== null) {
      if (desiredParentId === id) {
        return NextResponse.json(
          { error: 'validation_error', message: 'Location cannot be its own parent' },
          { status: 400 }
        );
      }
      // Check that the new parent is not a descendant of this location
      let current = await prisma.location.findUnique({ where: { id: desiredParentId } });
      while (current?.parentId) {
        if (current.parentId === id) {
          return NextResponse.json(
            { error: 'validation_error', message: 'Cannot move location to one of its own descendants' },
            { status: 400 }
          );
        }
        current = await prisma.location.findUnique({ where: { id: current.parentId } });
      }

      const parentExists = await prisma.location.findUnique({ where: { id: desiredParentId }, select: { id: true } });
      if (!parentExists) {
        return NextResponse.json(
          { error: 'not_found', message: 'Parent location not found' },
          { status: 404 }
        );
      }
    }

    const hasNotes = 'notes' in body;

    const location = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-fetch inside the transaction so path/notes computation uses consistent, fresh state
      const existing = await tx.location.findUniqueOrThrow({ where: { id } });

      const resolvedParentId = desiredParentId !== undefined ? desiredParentId : existing.parentId;
      const newName = (typeof name === 'string' && name.trim()) ? name.trim() : existing.name;
      const nameChanged = newName !== existing.name;
      const parentChanged = resolvedParentId !== existing.parentId;

      let newPath = existing.path;
      if (nameChanged || parentChanged) {
        let parentPath: string | undefined;
        if (resolvedParentId) {
          const parent = await tx.location.findUnique({ where: { id: resolvedParentId } });
          parentPath = parent?.path;
        }
        newPath = buildLocationPath(newName, parentPath);
      }

      const newNotes = hasNotes
        ? (typeof notes === 'string' && notes.trim() ? notes.trim() : null)
        : existing.notes;

      const updated = await tx.location.update({
        where: { id },
        data: { name: newName, parentId: resolvedParentId, path: newPath, notes: newNotes },
      });

      if (nameChanged || parentChanged) {
        await updateDescendantPaths(tx, id, newPath);
      }

      return updated;
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('PATCH /api/locations/[id] error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const location = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { lots: true, children: true } } },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'not_found', message: 'Location not found' },
        { status: 404 }
      );
    }

    if (location._count.children > 0) {
      return NextResponse.json(
        {
          error: 'has_children',
          message: `Cannot delete: this location has ${location._count.children} sub-location(s). Delete them first.`,
        },
        { status: 409 }
      );
    }

    if (location._count.lots > 0) {
      return NextResponse.json(
        {
          error: 'not_empty',
          message: `Cannot delete: this location contains ${location._count.lots} lot(s). Move or reassign them first.`,
        },
        { status: 409 }
      );
    }

    await prisma.location.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/locations/[id] error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to delete location' },
      { status: 500 }
    );
  }
}
