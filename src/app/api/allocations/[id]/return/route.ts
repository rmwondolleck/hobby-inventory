import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { AllocationStatus } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const RETURNABLE_STATUSES: AllocationStatus[] = ['reserved', 'in_use', 'deployed'];

// ─── POST /api/allocations/[id]/return ───────────────────────────────────────

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const allocation = await prisma.allocation.findUnique({ where: { id } });
  if (!allocation) {
    return NextResponse.json(
      { error: 'not_found', message: `Allocation ${id} not found` },
      { status: 404 },
    );
  }

  if (!RETURNABLE_STATUSES.includes(allocation.status as AllocationStatus)) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        message: `Cannot return allocation with status '${allocation.status}'`,
      },
      { status: 422 },
    );
  }

  // Mark allocation as recovered and create event in a transaction
  const [updated] = await prisma.$transaction([
    prisma.allocation.update({
      where: { id },
      data: { status: 'recovered' },
    }),
    prisma.event.create({
      data: {
        lotId: allocation.lotId,
        type: 'returned',
        delta: allocation.quantity !== null ? allocation.quantity : null,
        projectId: allocation.projectId,
        notes: `Returned allocation ${id} to stock`,
      },
    }),
  ]);

  return NextResponse.json({ data: updated });
}
