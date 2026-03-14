import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildLocationPath } from '@/lib/utils';

// Build a nested tree from a flat list of locations
function buildTree(locations: LocationFlat[]): LocationNode[] {
  const map = new Map<string, LocationNode>();
  const roots: LocationNode[] = [];

  for (const loc of locations) {
    map.set(loc.id, { ...loc, children: [] });
  }

  for (const loc of locations) {
    const node = map.get(loc.id)!;
    if (loc.parentId && map.has(loc.parentId)) {
      map.get(loc.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

interface LocationFlat {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LocationNode extends LocationFlat {
  children: LocationNode[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tree = searchParams.get('tree') === 'true';

  const locations = await prisma.location.findMany({
    orderBy: { path: 'asc' },
  });

  if (tree) {
    return NextResponse.json({ data: buildTree(locations) });
  }

  return NextResponse.json({ data: locations, total: locations.length });
}

export async function POST(request: Request) {
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

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'name is required' },
      { status: 400 }
    );
  }

  if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'parentId must be a string or null' },
      { status: 400 }
    );
  }

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'notes must be a string or null' },
      { status: 400 }
    );
  }

  let path: string;
  if (parentId) {
    const parent = await prisma.location.findUnique({ where: { id: parentId as string } });
    if (!parent) {
      return NextResponse.json(
        { error: 'NotFound', message: 'Parent location not found' },
        { status: 404 }
      );
    }
    path = buildLocationPath(name.trim(), parent.path);
  } else {
    path = buildLocationPath(name.trim());
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
      parentId: (parentId as string | null) ?? null,
      path,
      notes: (notes as string | null) ?? null,
    },
  });

  return NextResponse.json({ data: location }, { status: 201 });
}
