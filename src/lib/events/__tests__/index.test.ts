import { createEvent } from '../index';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    event: {
      create: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const createdEvent = {
  id: 'evt-1',
  lotId: 'lot-1',
  type: 'received',
  delta: 10,
  fromLocationId: null,
  toLocationId: null,
  projectId: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createEvent()', () => {
  it('creates an event with required fields', async () => {
    (mockPrisma.event.create as jest.Mock).mockResolvedValue(createdEvent);

    const result = await createEvent({ lotId: 'lot-1', type: 'received' });

    expect(mockPrisma.event.create as jest.Mock).toHaveBeenCalledWith({
      data: {
        lotId: 'lot-1',
        type: 'received',
        delta: undefined,
        fromLocationId: undefined,
        toLocationId: undefined,
        projectId: undefined,
        notes: undefined,
      },
    });
    expect(result).toEqual(createdEvent);
  });

  it('creates an event with all optional fields', async () => {
    const fullEvent = { ...createdEvent, delta: 5, fromLocationId: 'loc-1', toLocationId: 'loc-2', projectId: 'proj-1', notes: 'test note' };
    (mockPrisma.event.create as jest.Mock).mockResolvedValue(fullEvent);

    const result = await createEvent({
      lotId: 'lot-1',
      type: 'moved',
      delta: 5,
      fromLocationId: 'loc-1',
      toLocationId: 'loc-2',
      projectId: 'proj-1',
      notes: 'test note',
    });

    expect(mockPrisma.event.create as jest.Mock).toHaveBeenCalledWith({
      data: {
        lotId: 'lot-1',
        type: 'moved',
        delta: 5,
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        projectId: 'proj-1',
        notes: 'test note',
      },
    });
    expect(result).toEqual(fullEvent);
  });

  it('passes through all valid event types', async () => {
    const types = ['created', 'received', 'moved', 'allocated', 'installed', 'returned', 'lost', 'scrapped', 'edited'] as const;
    (mockPrisma.event.create as jest.Mock).mockResolvedValue(createdEvent);

    for (const type of types) {
      await createEvent({ lotId: 'lot-1', type });
      expect(mockPrisma.event.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type }) }),
      );
    }
  });

  it('propagates errors from prisma', async () => {
    (mockPrisma.event.create as jest.Mock).mockRejectedValue(new Error('DB error'));

    await expect(createEvent({ lotId: 'lot-1', type: 'created' })).rejects.toThrow('DB error');
  });
});
