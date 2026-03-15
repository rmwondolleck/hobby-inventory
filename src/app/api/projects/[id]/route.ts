import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { isValidProjectTransition } from '@/lib/state-transitions';
import type { ProjectStatus } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_STATUSES: ProjectStatus[] = ['idea', 'planned', 'active', 'deployed', 'retired'];

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      allocations: {
        orderBy: { createdAt: 'desc' },
        include: {
          lot: {
            select: {
              id: true,
              quantity: true,
              quantityMode: true,
              qualitativeStatus: true,
              unit: true,
              status: true,
              part: { select: { id: true, name: true, category: true } },
              location: { select: { id: true, name: true, path: true } },
            },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: 'not_found', message: `Project ${id} not found` },
      { status: 404 },
    );
  }

  // Group allocations by status
  const allocationsByStatus = project.allocations.reduce<
    Record<string, typeof project.allocations>
  >((acc, allocation) => {
    const s = allocation.status;
    if (!acc[s]) acc[s] = [];
    acc[s].push(allocation);
    return acc;
  }, {});

  return NextResponse.json({
    data: {
      ...project,
      tags: safeParseJson<string[]>(project.tags, []),
      allocationsByStatus,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: `Project ${id} not found` },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  const updateData: {
    name?: string;
    status?: string;
    notes?: string | null;
    tags?: string;
    wishlistNotes?: string | null;
  } = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'validation_error', message: 'name must be a non-empty string' },
        { status: 400 },
      );
    }
    updateData.name = body.name.trim();
  }

  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status as ProjectStatus)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    const fromStatus = existing.status as ProjectStatus;
    const toStatus = body.status as ProjectStatus;
    if (!isValidProjectTransition(fromStatus, toStatus)) {
      return NextResponse.json(
        {
          error: 'invalid_transition',
          message: `Invalid status transition from '${fromStatus}' to '${toStatus}'`,
        },
        { status: 422 },
      );
    }
    updateData.status = body.status as string;
  }

  if ('notes' in body) {
    if (body.notes !== null && typeof body.notes !== 'string') {
      return NextResponse.json(
        { error: 'validation_error', message: 'notes must be a string or null' },
        { status: 400 },
      );
    }
    updateData.notes = body.notes as string | null;
  }

  if ('tags' in body) {
    const tags = Array.isArray(body.tags)
      ? body.tags
          .filter((t) => typeof t === 'string')
          .map((t) => (t as string).trim())
          .filter(Boolean)
      : [];
    updateData.tags = JSON.stringify(tags);
  }

  if ('wishlistNotes' in body) {
    if (body.wishlistNotes !== null && typeof body.wishlistNotes !== 'string') {
      return NextResponse.json(
        { error: 'validation_error', message: 'wishlistNotes must be a string or null' },
        { status: 400 },
      );
    }
    updateData.wishlistNotes = body.wishlistNotes as string | null;
  }

  const updated = await prisma.project.update({ where: { id }, data: updateData });

  return NextResponse.json({
    data: {
      ...updated,
      tags: safeParseJson<string[]>(updated.tags, []),
    },
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: `Project ${id} not found` },
      { status: 404 },
    );
  }

  if (existing.archivedAt) {
    return NextResponse.json(
      { error: 'already_archived', message: `Project ${id} is already archived` },
      { status: 409 },
    );
  }

  const archived = await prisma.project.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      status: 'retired',
    },
  });

  return NextResponse.json({
    data: {
      ...archived,
      tags: safeParseJson<string[]>(archived.tags, []),
    },
  });
}
