import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findUnique: jest.fn(),
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
  type: 'received',
  delta: 5,
  fromLocationId: null,
  toLocationId: null,
  projectId: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/lots/[id]/events', () => {
  it('returns events for an existing lot', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);

    const res = await GET(new Request('http://localhost/api/lots/lot-1/events'), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 404 when lot does not exist', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/lots/missing/events'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns empty list when lot has no events', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-empty' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/lots/lot-empty/events'), {
      params: Promise.resolve({ id: 'lot-empty' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('queries events filtered by lotId ordered by createdAt desc', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new Request('http://localhost/api/lots/lot-1/events'), {
      params: Promise.resolve({ id: 'lot-1' }),
    });

    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith({
      where: { lotId: 'lot-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
