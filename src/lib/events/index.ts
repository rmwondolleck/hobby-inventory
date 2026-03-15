import prisma from '@/lib/db';

interface CreateEventOptions {
  lotId: string;
  type: string;
  delta?: number;
  fromLocationId?: string;
  toLocationId?: string;
  projectId?: string;
  notes?: string;
}

export async function createEvent(opts: CreateEventOptions) {
  return prisma.event.create({
    data: {
      lotId: opts.lotId,
      type: opts.type,
      delta: opts.delta ?? null,
      fromLocationId: opts.fromLocationId ?? null,
      toLocationId: opts.toLocationId ?? null,
      projectId: opts.projectId ?? null,
      notes: opts.notes ?? null,
    },
  });
}
