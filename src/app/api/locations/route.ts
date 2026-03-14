import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildLocationPath } from '@/lib/utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

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
  const q = searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { path: { contains: q } },
          { notes: { contains: q } },
        ],
      }
    : {};

  if (tree) {
    const locations = await prisma.location.findMany({
      where,
      orderBy: { path: 'asc' },
    });
    return NextResponse.json({ data: buildTree(locations) });
  }

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

  const resolvedParentId: string | null =
    typeof parentId === 'string' && parentId.trim() !== '' ? parentId : null;

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'notes must be a string or null' },
      { status: 400 }
    );
  }

  let path: string;
  if (resolvedParentId) {
    const parent = await prisma.location.findUnique({ where: { id: resolvedParentId } });
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
      parentId: resolvedParentId,
      path,
      notes: (notes as string | null) ?? null,
    },
  });

  return NextResponse.json({ data: location }, { status: 201 });
}
