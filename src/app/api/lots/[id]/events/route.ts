import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createEvent } from '@/lib/events';
import type { EventType } from '@/lib/types';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_EVENT_TYPES: EventType[] = [
  'created',
  'received',
  'moved',
  'allocated',
  'installed',
  'returned',
  'lost',
  'scrapped',
  'edited',
];

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({ where: { id }, select: { id: true } });
  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 },
    );
  }

  const events = await prisma.event.findMany({
    where: { lotId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: events, total: events.length });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({ where: { id }, select: { id: true } });
  if (!lot) {
    return NextResponse.json(
      { error: 'not_found', message: 'Lot not found' },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
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

  const type = body.type as string | undefined;
  if (!type || !VALID_EVENT_TYPES.includes(type as EventType)) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `type must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  if ('delta' in body && body.delta !== undefined) {
    if (typeof body.delta !== 'number' || !Number.isFinite(body.delta) || !Number.isInteger(body.delta)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'delta must be a finite integer' },
        { status: 400 },
      );
    }
  }

  const event = await createEvent({
    lotId: id,
    type: type as EventType,
    delta: typeof body.delta === 'number' ? body.delta : undefined,
    notes: body.notes != null ? String(body.notes) : undefined,
  });

  return NextResponse.json({ data: event }, { status: 201 });
}
