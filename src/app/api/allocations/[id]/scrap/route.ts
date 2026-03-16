import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { AllocationStatus } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const SCRAPPABLE_STATUSES: AllocationStatus[] = ['reserved', 'in_use', 'deployed'];

// ─── POST /api/allocations/[id]/scrap ────────────────────────────────────────

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const allocation = await prisma.allocation.findUnique({
    where: { id },
    include: { lot: { select: { quantity: true, quantityMode: true } } },
  });

  if (!allocation) {
    return NextResponse.json(
      { error: 'not_found', message: `Allocation ${id} not found` },
      { status: 404 },
    );
  }

  if (!SCRAPPABLE_STATUSES.includes(allocation.status as AllocationStatus)) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        message: `Cannot scrap allocation with status '${allocation.status}'`,
      },
      { status: 422 },
    );
  }

  // Permanently reduce lot quantity for exact-count lots (conditional third op)
  const lotUpdateOp =
    allocation.lot.quantityMode === 'exact' &&
    allocation.lot.quantity !== null &&
    allocation.quantity !== null
      ? [
          prisma.lot.update({
            where: { id: allocation.lotId },
            data: { quantity: Math.max(0, allocation.lot.quantity - allocation.quantity) },
          }),
        ]
      : [];

  const [updated] = await prisma.$transaction([
    // Mark allocation recovered (removes it from active count)
    prisma.allocation.update({
      where: { id },
      data: { status: 'recovered' },
    }),
    // Create scrap event
    prisma.event.create({
      data: {
        lotId: allocation.lotId,
        type: 'scrapped',
        delta: allocation.quantity !== null ? -allocation.quantity : null,
        projectId: allocation.projectId,
        notes: `Scrapped allocation ${id}`,
      },
    }),
    ...lotUpdateOp,
  ]);

  return NextResponse.json({ data: updated });
}
