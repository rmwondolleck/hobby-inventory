import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { deriveStatusFromQuantity } from '@/lib/state-transitions';
import type { StockStatus } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    select: { id: true, quantity: true, quantityMode: true, status: true },
  });
  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 },
    );
  }

  if (lot.quantityMode !== 'exact') {
    return NextResponse.json(
      { error: 'validation_error', message: 'Quantity adjustments require exact quantity mode' },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'invalid_body', message: 'Request body must be a JSON object' },
        { status: 400 },
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  const { delta, notes } = body;

  if (delta === undefined || delta === null) {
    return NextResponse.json(
      { error: 'validation_error', message: 'delta is required' },
      { status: 400 },
    );
  }
  if (
    typeof delta !== 'number' ||
    !Number.isFinite(delta) ||
    !Number.isInteger(delta) ||
    delta === 0
  ) {
    return NextResponse.json(
      { error: 'validation_error', message: 'delta must be a non-zero integer' },
      { status: 400 },
    );
  }

  const currentQty = lot.quantity ?? 0;
  const newQty = currentQty + delta;
  if (newQty < 0) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `Cannot reduce quantity below zero (current: ${currentQty}, delta: ${delta})`,
      },
      { status: 400 },
    );
  }

  const derivedStatus = deriveStatusFromQuantity(
    lot.status as StockStatus,
    newQty,
    lot.quantityMode as 'exact' | 'qualitative',
  );

  const lotUpdateData: { quantity: number; status?: StockStatus } = { quantity: newQty };
  if (derivedStatus !== null) {
    lotUpdateData.status = derivedStatus;
  }

  const transactionOps = [
    prisma.lot.update({
      where: { id },
      data: lotUpdateData,
    }),
    prisma.event.create({
      data: {
        lotId: id,
        type: 'edited',
        delta,
        notes: notes != null ? String(notes) : null,
      },
    }),
  ];

  // Write a status_changed event when the status auto-transitioned
  if (derivedStatus !== null) {
    transactionOps.push(
      prisma.event.create({
        data: {
          lotId: id,
          type: 'status_changed',
          delta: 0,
          notes: 'Auto-updated from quantity change',
        },
      }),
    );
  }

  const [updatedLot] = await prisma.$transaction(transactionOps);

  return NextResponse.json({ data: updatedLot });
}
