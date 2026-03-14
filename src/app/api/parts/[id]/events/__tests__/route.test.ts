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
});
