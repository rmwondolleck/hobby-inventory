import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isValidStockTransition } from '@/lib/state-transitions';
import type { StockStatus } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_STATUSES = ['in_stock', 'low', 'out', 'reserved', 'installed', 'lost', 'scrapped'];
const VALID_QUANTITY_MODES = ['exact', 'qualitative'];
const VALID_QUALITATIVE_STATUSES = ['plenty', 'low', 'out'];

function parseSource(source: unknown): Record<string, unknown> {
  if (typeof source === 'string') {
    try {
      return JSON.parse(source) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return source as Record<string, unknown>;
  }
  return {};
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      part: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true, path: true } },
      allocations: {
        orderBy: { createdAt: 'desc' },
      },
      events: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: `Lot ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      ...lot,
      source: parseSource(lot.source),
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const existing = await prisma.lot.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: 'not_found', message: `Lot ${id} not found` },
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

  if ('quantityMode' in body) {
    if (!VALID_QUANTITY_MODES.includes(body.quantityMode as string)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'quantityMode must be "exact" or "qualitative"' },
        { status: 400 }
      );
    }
    updateData.quantityMode = body.quantityMode;
  }

  const effectiveMode = ('quantityMode' in updateData
    ? (updateData.quantityMode as string)
    : existing.quantityMode) as string;

  if ('quantity' in body) {
    if (body.quantity === null) {
      updateData.quantity = null;
    } else {
      if (
        typeof body.quantity !== 'number' ||
        !Number.isInteger(body.quantity) ||
        body.quantity < 0
      ) {
        return NextResponse.json(
          { error: 'validation_error', message: 'quantity must be a non-negative integer or null' },
          { status: 400 }
        );
      }
      if (effectiveMode !== 'exact') {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'quantity can only be set when quantityMode is "exact"',
          },
          { status: 400 }
        );
      }
      updateData.quantity = body.quantity;
    }
  }

  if ('qualitativeStatus' in body) {
    if (body.qualitativeStatus === null) {
      updateData.qualitativeStatus = null;
    } else {
      if (!VALID_QUALITATIVE_STATUSES.includes(body.qualitativeStatus as string)) {
        return NextResponse.json(
          {
            error: 'validation_error',
            message: 'qualitativeStatus must be "plenty", "low", or "out"',
          },
          { status: 400 }
        );
      }
      updateData.qualitativeStatus = body.qualitativeStatus;
    }
  }

  if ('unit' in body) {
    updateData.unit = body.unit === null ? null : String(body.unit);
  }

  if ('status' in body) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }
    const fromStatus = existing.status as StockStatus;
    const toStatus = body.status as StockStatus;
    if (!isValidStockTransition(fromStatus, toStatus)) {
      return NextResponse.json(
        {
          error: 'invalid_transition',
          message: `Invalid status transition from '${fromStatus}' to '${toStatus}'`,
        },
        { status: 422 }
      );
    }
    updateData.status = body.status;
  }

  if ('locationId' in body) {
    if (body.locationId === null) {
      updateData.locationId = null;
    } else {
      if (typeof body.locationId !== 'string') {
        return NextResponse.json(
          { error: 'validation_error', message: 'locationId must be a string or null' },
          { status: 400 }
        );
      }
      const location = await prisma.location.findUnique({ where: { id: body.locationId } });
      if (!location) {
        return NextResponse.json(
          { error: 'not_found', message: `Location ${body.locationId} not found` },
          { status: 404 }
        );
      }
      updateData.locationId = body.locationId;
    }
  }

  if ('receivedAt' in body) {
    if (body.receivedAt === null) {
      updateData.receivedAt = null;
    } else {
      const d = new Date(body.receivedAt as string);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'validation_error', message: 'receivedAt must be a valid ISO date string' },
          { status: 400 }
        );
      }
      updateData.receivedAt = d;
    }
  }

  if ('source' in body) {
    updateData.source = JSON.stringify(parseSource(body.source));
  }

  if ('notes' in body) {
    updateData.notes = body.notes === null ? null : String(body.notes);
  }

  const updated = await prisma.lot.update({
    where: { id },
    data: updateData,
    include: {
      part: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true, path: true } },
    },
  });

  return NextResponse.json({
    data: {
      ...updated,
      source: parseSource(updated.source),
    },
  });
}
