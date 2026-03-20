import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { computeStockFields } from '../_stock';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      lots: {
        include: {
          allocations: {
            include: {
              project: { select: { id: true, name: true, status: true } },
            },
          },
          location: { select: { id: true, name: true, path: true } },
        },
      },
    },
  });

  if (!part) {
    return NextResponse.json(
      { error: 'not_found', message: `Part ${id} not found` },
      { status: 404 }
    );
  }

  const stockFields = computeStockFields(part.lots);

  return NextResponse.json({
    data: {
      ...part,
      ...stockFields,
      tags: safeParseJson<string[]>(part.tags, []),
      parameters: safeParseJson<Record<string, unknown>>(part.parameters, {}),
      lots: part.lots.map((lot: { source: string } & Record<string, unknown>) => ({
        ...lot,
        source: safeParseJson<Record<string, unknown>>(lot.source, {}),
      })),
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.part.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: `Part ${id} not found` },
      { status: 404 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'validation_error', message: 'name must be a non-empty string' },
        { status: 400 }
      );
    }
    updateData.name = body.name.trim();
  }

  if ('category' in body) {
    updateData.category = body.category === null ? null : String(body.category).trim();
  }
  if ('manufacturer' in body) {
    updateData.manufacturer = body.manufacturer === null ? null : String(body.manufacturer).trim();
  }
  if ('mpn' in body) {
    updateData.mpn = body.mpn === null ? null : String(body.mpn).trim();
  }
  if ('notes' in body) {
    updateData.notes = body.notes === null ? null : String(body.notes);
  }
  if ('tags' in body) {
    const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string') : [];
    updateData.tags = JSON.stringify(tags);
  }
  if ('parameters' in body) {
    const parameters =
      body.parameters && typeof body.parameters === 'object' && !Array.isArray(body.parameters)
        ? body.parameters
        : {};
    updateData.parameters = JSON.stringify(parameters);
  }

  const updated = await prisma.part.update({ where: { id }, data: updateData });

  return NextResponse.json({
    data: {
      ...updated,
      tags: safeParseJson<string[]>(updated.tags, []),
      parameters: safeParseJson<Record<string, unknown>>(updated.parameters, {}),
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.part.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: `Part ${id} not found` },
      { status: 404 }
    );
  }

  if (existing.archivedAt) {
    return NextResponse.json(
      { error: 'already_archived', message: `Part ${id} is already archived` },
      { status: 409 }
    );
  }

  const archived = await prisma.part.update({
    where: { id },
    data: { archivedAt: new Date() },
  });

  return NextResponse.json({
    data: {
      ...archived,
      tags: safeParseJson<string[]>(archived.tags, []),
      parameters: safeParseJson<Record<string, unknown>>(archived.parameters, {}),
    },
  });
}
