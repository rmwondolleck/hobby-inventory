import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { AllocationStatus } from '@/lib/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const ACTIVE_STATUSES: AllocationStatus[] = ['reserved', 'in_use', 'deployed'];

/**
 * Compute available quantity for a lot given its total and active allocations.
 * Returns null if lot is in qualitative mode.
 */
async function getAvailableQuantity(
  lotId: string,
  excludeAllocationId?: string,
): Promise<number | null> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    select: { quantity: true, quantityMode: true },
  });
  if (!lot || lot.quantityMode !== 'exact' || lot.quantity === null) return null;

  const allocations = await prisma.allocation.findMany({
    where: {
      lotId,
      status: { in: ACTIVE_STATUSES },
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    select: { quantity: true },
  });

  const allocated = allocations.reduce((sum: number, a: { quantity: number | null }) => sum + (a.quantity ?? 0), 0);
  return lot.quantity - allocated;
}

// ─── GET /api/allocations ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lotId = searchParams.get('lotId') ?? undefined;
  const projectId = searchParams.get('projectId') ?? undefined;
  const statusParam = searchParams.get('status') ?? undefined;
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const statusList = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const where = {
    ...(lotId ? { lotId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(statusList && statusList.length > 0 ? { status: { in: statusList } } : {}),
  };

  const [total, allocations] = await Promise.all([
    prisma.allocation.count({ where }),
    prisma.allocation.findMany({
      where,
      skip: offset,
      take: limit,
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
        project: { select: { id: true, name: true, status: true } },
      },
    }),
  ]);

  return NextResponse.json({ data: allocations, total, limit, offset });
}

// ─── POST /api/allocations ────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  const { lotId, projectId, quantity, notes } = body;

  if (!lotId || typeof lotId !== 'string') {
    return NextResponse.json(
      { error: 'validation_error', message: 'lotId is required' },
      { status: 400 },
    );
  }
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json(
      { error: 'validation_error', message: 'projectId is required' },
      { status: 400 },
    );
  }

  // Validate lot exists
  const lot = await prisma.lot.findUnique({ where: { id: lotId } });
  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: `Lot ${lotId} not found` },
      { status: 404 },
    );
  }

  // Validate project exists
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json(
      { error: 'not_found', message: `Project ${projectId} not found` },
      { status: 404 },
    );
  }

  // Validate quantity for exact-count lots
  let allocationQuantity: number | null = null;
  if (lot.quantityMode === 'exact') {
    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'validation_error', message: 'quantity is required for exact-count lots' },
        { status: 400 },
      );
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'quantity must be a positive integer' },
        { status: 400 },
      );
    }

    // Check available quantity
    const available = await getAvailableQuantity(lotId);
    if (available !== null && quantity > available) {
      return NextResponse.json(
        {
          error: 'insufficient_quantity',
          message: `Cannot allocate ${quantity}: only ${available} available`,
        },
        { status: 422 },
      );
    }
    allocationQuantity = quantity as number;
  }

  // Create allocation and event in a transaction
  const [allocation] = await prisma.$transaction([
    prisma.allocation.create({
      data: {
        lotId,
        projectId,
        quantity: allocationQuantity,
        status: 'reserved',
        notes: notes && typeof notes === 'string' ? notes : undefined,
      },
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
    }),
    prisma.event.create({
      data: {
        lotId,
        type: 'allocated',
        delta: allocationQuantity !== null ? -allocationQuantity : null,
        projectId,
        notes: `Allocated to project: ${project.name}`,
      },
    }),
  ]);

  return NextResponse.json({ data: allocation }, { status: 201 });
}
