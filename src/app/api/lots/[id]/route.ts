import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { detectSourceType } from '@/lib/utils';
import type { SourceData, UpdateLotBody } from '@/features/lots/types';
import type { SourceType } from '@/lib/types';

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        part: { select: { id: true, name: true, category: true, mpn: true } },
        location: { select: { id: true, name: true, path: true } },
        allocations: {
          include: {
            project: { select: { id: true, name: true, status: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lot) {
      return NextResponse.json(
        { error: 'not_found', message: 'Lot not found' },
        { status: 404 }
      );
    }

    const data = {
      ...lot,
      source: safeJsonParse<SourceData | Record<string, never>>(lot.source, {}),
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/lots/[id]]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch lot' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.lot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Lot not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UpdateLotBody;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if ('quantity' in body) {
      updates.quantity = body.quantity ?? null;
    }

    if ('quantityMode' in body && body.quantityMode) {
      updates.quantityMode = body.quantityMode;
    }

    if ('qualitativeStatus' in body) {
      updates.qualitativeStatus = body.qualitativeStatus ?? null;
    }

    if ('unit' in body) {
      updates.unit = (typeof body.unit === 'string' && body.unit.trim()) ? body.unit.trim() : null;
    }

    if ('status' in body && body.status) {
      updates.status = body.status;
    }

    if ('locationId' in body) {
      if (body.locationId && typeof body.locationId === 'string') {
        const loc = await prisma.location.findUnique({ where: { id: body.locationId } });
        if (!loc) {
          return NextResponse.json(
            { error: 'not_found', message: 'Location not found' },
            { status: 404 }
          );
        }
      }
      updates.locationId = body.locationId ?? null;
    }

    if ('source' in body && body.source && typeof body.source === 'object') {
      const currentSource = safeJsonParse<Partial<SourceData>>(existing.source, {});
      const merged = { ...currentSource, ...body.source };

      // Auto-detect type if URL changed and type not explicitly set
      if (body.source.url && !body.source.type) {
        merged.type = detectSourceType(body.source.url) as SourceType;
      }

      updates.source = JSON.stringify(merged);
    }

    if ('receivedAt' in body) {
      updates.receivedAt = body.receivedAt ? new Date(body.receivedAt) : null;
    }

    if ('notes' in body) {
      updates.notes = (typeof body.notes === 'string' && body.notes.trim()) ? body.notes.trim() : null;
    }

    const updated = await prisma.lot.update({
      where: { id },
      data: updates,
      include: {
        part: { select: { id: true, name: true, category: true, mpn: true } },
        location: { select: { id: true, name: true, path: true } },
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        source: safeJsonParse<SourceData | Record<string, never>>(updated.source, {}),
      },
    });
  } catch (error) {
    console.error('[PATCH /api/lots/[id]]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to update lot' },
      { status: 500 }
    );
  }
}
