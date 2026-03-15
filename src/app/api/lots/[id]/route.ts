import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      part: true,
      location: true,
      allocations: true,
      events: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(lot);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.lot.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 }
    );
  }

  const body = await request.json() as {
    quantity?: number | null;
    qualitativeStatus?: string | null;
    unit?: string | null;
    status?: string;
    locationId?: string | null;
    notes?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if ('quantity' in body) updates.quantity = body.quantity ?? null;
  if ('qualitativeStatus' in body) updates.qualitativeStatus = body.qualitativeStatus ?? null;
  if ('unit' in body) updates.unit = body.unit?.trim() ?? null;
  if ('status' in body) updates.status = body.status;
  if ('locationId' in body) updates.locationId = body.locationId ?? null;
  if ('notes' in body) updates.notes = body.notes?.trim() ?? null;

  // Enforce quantityMode consistency: null out incompatible fields only when explicitly updated.
  // quantityMode values: 'exact' (numeric quantity) or 'qualitative' (qualitativeStatus string).
  if (existing.quantityMode === 'qualitative' && 'quantity' in body) {
    updates.quantity = null;
  } else if (existing.quantityMode === 'exact' && 'qualitativeStatus' in body) {
    updates.qualitativeStatus = null;
  }

  const lot = await prisma.lot.update({
    where: { id },
    data: updates,
    include: {
      part: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, path: true } },
    },
  });

  return NextResponse.json(lot);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.lot.findUnique({
    where: { id },
    include: { _count: { select: { allocations: true, events: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 }
    );
  }

  if (existing._count.allocations > 0 || existing._count.events > 0) {
    return NextResponse.json(
      { error: 'has_relations', message: 'Cannot delete a lot that has allocations or events' },
      { status: 409 }
    );
  }

  await prisma.lot.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
