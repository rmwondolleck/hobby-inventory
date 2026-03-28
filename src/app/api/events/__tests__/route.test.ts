import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/events');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const sampleEvent = {
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

describe('GET /api/events', () => {
  it('returns events with defaults (limit=50, offset=0)', async () => {
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });

  it('respects limit and offset query params', async () => {
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(makeRequest({ limit: '10', offset: '20' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(20);
    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 }),
    );
  });

  it('caps limit at 200', async () => {
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(makeRequest({ limit: '500' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.limit).toBe(200);
  });

  it('returns 400 for invalid limit', async () => {
    const res = await GET(makeRequest({ limit: 'bad' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_param');
  });

  it('returns 400 for negative offset', async () => {
    const res = await GET(makeRequest({ offset: '-5' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_param');
  });

  it('returns 400 for invalid event type', async () => {
    const res = await GET(makeRequest({ type: 'unknown_type' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_param');
  });

  it('accepts valid event types', async () => {
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(0);

    const validTypes = ['created', 'received', 'moved', 'allocated', 'installed', 'returned', 'lost', 'scrapped', 'edited'];
    for (const type of validTypes) {
      const res = await GET(makeRequest({ type }));
      expect(res.status).toBe(200);
    }
  });

  it('filters by lotId and returns 404 when lot not found', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest({ lotId: 'missing-lot' }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('filters by lotId when lot exists', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(makeRequest({ lotId: 'lot-1' }));
    expect(res.status).toBe(200);
  });

  it('filters by partId and returns empty when no lots found', async () => {
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(makeRequest({ partId: 'part-no-lots' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('filters by partId and fetches events for matching lots', async () => {
    (mockPrisma.lot.findMany as jest.Mock).mockResolvedValue([{ id: 'lot-1' }, { id: 'lot-2' }]);
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(1);

    const res = await GET(makeRequest({ partId: 'part-1' }));
    expect(res.status).toBe(200);
    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lotId: { in: ['lot-1', 'lot-2'] } }),
      }),
    );
  });

  it('filters by since and until date params', async () => {
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.event.count as jest.Mock).mockResolvedValue(0);

    const res = await GET(makeRequest({ since: '2026-01-01', until: '2026-12-31' }));
    expect(res.status).toBe(200);
    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        }),
      }),
    );
  });

  it('returns 500 when Prisma throws', async () => {
    (mockPrisma.event.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'));
    (mockPrisma.event.count as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('internal_error');
  });
});
