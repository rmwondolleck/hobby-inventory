import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildLocationPath } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

type LocationRecord = { id: string; name: string; parentId: string | null };
type ChildEntry = { child: LocationRecord; childPath: string };

async function updateDescendantPaths(
  tx: typeof prisma,
  locationId: string,
  newParentPath: string
): Promise<void> {
  let currentLevel: Array<{ parentId: string; parentPath: string }> = [
    { parentId: locationId, parentPath: newParentPath },
  ];

  while (currentLevel.length > 0) {
    // Fetch children for all nodes at the current level in parallel
    const childGroups = await Promise.all(
      currentLevel.map(({ parentId, parentPath }) =>
        (tx.location.findMany({ where: { parentId } }) as Promise<LocationRecord[]>).then(
          (children) =>
            children.map((child): ChildEntry => ({
              child,
              childPath: `${parentPath}/${child.name}`,
            }))
        )
      )
    );

    const flatChildren: ChildEntry[] = childGroups.flat();
    if (flatChildren.length === 0) break;

    // Update all nodes at this level in parallel
    await Promise.all(
      flatChildren.map(({ child, childPath }) =>
        tx.location.update({ where: { id: child.id }, data: { path: childPath } })
      )
    );

    // Advance to the next level
    currentLevel = flatChildren.map(({ child, childPath }) => ({
      parentId: child.id,
      parentPath: childPath,
    }));
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

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Location not found' },
        { status: 404 }
      );
    }

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

    const newParentId =
      'parentId' in body
        ? (typeof parentId === 'string' && parentId ? parentId : null)
        : existing.parentId;

    if (newParentId) {
      if (newParentId === id) {
        return NextResponse.json(
          { error: 'validation_error', message: 'Location cannot be its own parent' },
          { status: 400 }
        );
      }
      // Check that the new parent is not a descendant of this location
      let current = await prisma.location.findUnique({ where: { id: newParentId } });
      while (current?.parentId) {
        if (current.parentId === id) {
          return NextResponse.json(
            { error: 'validation_error', message: 'Cannot move location to one of its own descendants' },
            { status: 400 }
          );
        }
        current = await prisma.location.findUnique({ where: { id: current.parentId } });
      }

      const parent = await prisma.location.findUnique({ where: { id: newParentId } });
      if (!parent) {
        return NextResponse.json(
          { error: 'not_found', message: 'Parent location not found' },
          { status: 404 }
        );
      }
    }

    const newName = (typeof name === 'string' && name.trim()) ? name.trim() : existing.name;
    const nameChanged = newName !== existing.name;
    const parentChanged = newParentId !== existing.parentId;

    let newPath = existing.path;
    if (nameChanged || parentChanged) {
      let parentPath: string | undefined;
      if (newParentId) {
        const parent = await prisma.location.findUnique({ where: { id: newParentId } });
        parentPath = parent?.path;
      }
      newPath = buildLocationPath(newName, parentPath);
    }

    const newNotes =
      'notes' in body
        ? (typeof notes === 'string' && notes.trim() ? notes.trim() : null)
        : existing.notes;

    const location = await prisma.$transaction(async (tx: typeof prisma) => {
      const updated = await tx.location.update({
        where: { id },
        data: { name: newName, parentId: newParentId, path: newPath, notes: newNotes },
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
