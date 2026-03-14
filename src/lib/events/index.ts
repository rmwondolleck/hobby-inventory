import prisma from '@/lib/db';
import type { EventType } from '@/lib/types';

export interface CreateEventInput {
  lotId: string;
  type: EventType;
  delta?: number;
  fromLocationId?: string;
  toLocationId?: string;
  projectId?: string;
  notes?: string;
}

/**
 * Create an immutable event record for a stock mutation.
 * Called internally by lots and allocations API handlers.
 */
export async function createEvent(input: CreateEventInput) {
  return prisma.event.create({
    data: {
      lotId: input.lotId,
      type: input.type,
      delta: input.delta,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      projectId: input.projectId,
      notes: input.notes,
    },
  });
}
