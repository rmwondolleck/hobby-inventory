import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findUnique: jest.fn(),
    },
    lot: {
      findMany: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const sampleEvent = {
  id: 'evt-1',
  lotId: 'lot-1',
  type: 'created',
  delta: null,
  fromLocationId: null,
  toLocationId: null,
  projectId: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/parts/[id]/events', () => {
  it('returns events for a part with lots', async () => {
    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }, { id: 'lot-2' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);

    const res = await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 404 when part does not exist', async () => {
    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/parts/missing/events'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns empty list when part has no lots', async () => {
    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-empty' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/parts/part-empty/events'), {
      params: Promise.resolve({ id: 'part-empty' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(mockPrisma.event.findMany as jest.Mock).not.toHaveBeenCalled();
  });

  it('queries events with all lot IDs for the part', async () => {
    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }, { id: 'lot-2' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });

    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith({
      where: { lotId: { in: ['lot-1', 'lot-2'] } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('does not query locations when no events have location IDs', async () => {
    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);

    await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });

    expect(mockPrisma.location.findMany as jest.Mock).not.toHaveBeenCalled();
  });

  it('enriches moved events with fromLocation and toLocation objects', async () => {
    const movedEvent = {
      ...sampleEvent,
      id: 'evt-moved',
      type: 'moved',
      fromLocationId: 'loc-a',
      toLocationId: 'loc-b',
    };

    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([movedEvent]);
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc-a', name: 'Shelf A', path: 'Office/Shelf A' },
      { id: 'loc-b', name: 'Drawer 2', path: 'Office/Shelf A/Drawer 2' },
    ]);

    const res = await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].fromLocation).toEqual({ name: 'Shelf A', path: 'Office/Shelf A' });
    expect(body.data[0].toLocation).toEqual({ name: 'Drawer 2', path: 'Office/Shelf A/Drawer 2' });
  });

  it('queries locations with deduplicated IDs from events', async () => {
    const event1 = { ...sampleEvent, id: 'evt-1', fromLocationId: 'loc-a', toLocationId: 'loc-b' };
    const event2 = { ...sampleEvent, id: 'evt-2', fromLocationId: 'loc-b', toLocationId: 'loc-a' };

    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([event1, event2]);
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc-a', name: 'Shelf A', path: 'Office/Shelf A' },
      { id: 'loc-b', name: 'Drawer 2', path: 'Office/Shelf A/Drawer 2' },
    ]);

    await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });

    const locationCall = (mockPrisma.location.findMany as jest.Mock).mock.calls[0][0];
    expect(locationCall.where.id.in).toHaveLength(2);
    expect(locationCall.where.id.in).toContain('loc-a');
    expect(locationCall.where.id.in).toContain('loc-b');
  });

  it('sets fromLocation and toLocation to null when location IDs are not found', async () => {
    const movedEvent = {
      ...sampleEvent,
      id: 'evt-moved',
      type: 'moved',
      fromLocationId: 'loc-missing',
      toLocationId: null,
    };

    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([movedEvent]);
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].fromLocation).toBeNull();
    expect(body.data[0].toLocation).toBeNull();
  });

  it('returns null fromLocation and toLocation for events without location IDs', async () => {
    (mockPrisma.part.findUnique as jest.Mock).mockResolvedValue({ id: 'part-1' });
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);

    const res = await GET(new Request('http://localhost/api/parts/part-1/events'), {
      params: Promise.resolve({ id: 'part-1' }),
    });
    const body = await res.json();

    expect(body.data[0].fromLocation).toBeNull();
    expect(body.data[0].toLocation).toBeNull();
  });
});
