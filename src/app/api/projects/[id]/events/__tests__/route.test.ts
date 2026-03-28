import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    project: {
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
  type: 'allocated',
  delta: 2,
  fromLocationId: null,
  toLocationId: null,
  projectId: 'proj-1',
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/projects/[id]/events', () => {
  it('returns events for an existing project', async () => {
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);

    const res = await GET(new Request('http://localhost/api/projects/proj-1/events'), {
      params: Promise.resolve({ id: 'proj-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 404 when project does not exist', async () => {
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/projects/missing/events'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns empty list when project has no events', async () => {
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-empty' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/projects/proj-empty/events'), {
      params: Promise.resolve({ id: 'proj-empty' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('queries events filtered by projectId ordered by createdAt desc', async () => {
    (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'proj-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new Request('http://localhost/api/projects/proj-1/events'), {
      params: Promise.resolve({ id: 'proj-1' }),
    });

    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith({
      where: { projectId: 'proj-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns 500 when Prisma throws', async () => {
    (mockPrisma.project.findUnique as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

    const res = await GET(new Request('http://localhost/api/projects/proj-1/events'), {
      params: Promise.resolve({ id: 'proj-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('internal_error');
  });
});
