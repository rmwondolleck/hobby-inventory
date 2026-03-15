import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isValidAllocationTransition } from '@/lib/state-transitions';
import type { AllocationStatus } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_STATUSES: AllocationStatus[] = ['reserved', 'in_use', 'deployed', 'recovered'];

// ─── GET /api/allocations/[id] ────────────────────────────────────────────────

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const allocation = await prisma.allocation.findUnique({
    where: { id },
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
      project: { select: { id: true, name: true, status: true } },
    },
  });

  if (!allocation) {
    return NextResponse.json(
      { error: 'not_found', message: `Allocation ${id} not found` },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: allocation });
}

// ─── PATCH /api/allocations/[id] ─────────────────────────────────────────────

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.allocation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: `Allocation ${id} not found` },
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

  const updateData: Record<string, unknown> = {};
  let newStatus: AllocationStatus | undefined;

  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status as AllocationStatus)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    const fromStatus = existing.status as AllocationStatus;
    const toStatus = body.status as AllocationStatus;
    if (fromStatus !== toStatus && !isValidAllocationTransition(fromStatus, toStatus)) {
      return NextResponse.json(
        {
          error: 'invalid_transition',
          message: `Invalid status transition from '${fromStatus}' to '${toStatus}'`,
        },
        { status: 422 },
      );
    }
    updateData.status = toStatus;
    newStatus = toStatus;
  }

  if ('notes' in body) {
    updateData.notes = body.notes === null ? null : String(body.notes);
  }

  const updated = await prisma.allocation.update({ where: { id }, data: updateData });

  // Create event if status changed
  if (newStatus && newStatus !== existing.status) {
    const eventType =
      newStatus === 'recovered' ? 'returned' : newStatus === 'deployed' ? 'installed' : 'edited';
    await prisma.event.create({
      data: {
        lotId: existing.lotId,
        type: eventType,
        projectId: existing.projectId,
        notes: `Allocation status changed to ${newStatus}`,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
