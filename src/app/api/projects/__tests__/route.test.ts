import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockCount = prisma.project.count as jest.Mock;
const mockFindMany = prisma.project.findMany as jest.Mock;

function makeRequest(url: string): Request {
  return new Request(url);
}

const baseProject = {
  id: 'proj-1',
  name: 'My Robot Project',
  status: 'active',
  tags: '["robot","arduino"]',
  notes: 'A fun project',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  allocations: [
    { status: 'in_use' },
    { status: 'in_use' },
    { status: 'reserved' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/projects ────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns 200 with data array, total, limit and offset', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('parses tags JSON string into array', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual(['robot', 'arduino']);
  });

  it('computes allocationCount and allocationsByStatus', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].allocationCount).toBe(3);
    expect(json.data[0].allocationsByStatus).toEqual({ in_use: 2, reserved: 1 });
  });

  it('excludes allocations from list response', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].allocations).toBeUndefined();
  });

  it('excludes archived projects by default (archivedAt: null filter)', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      })
    );
  });

  it('includes archived projects when ?includeArchived=true', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?includeArchived=true'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('archivedAt');
  });

  it('filters by status query param', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?status=active'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      })
    );
  });

  it('applies search filter across name, notes, and tags', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?search=robot'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: 'robot' } },
            { notes: { contains: 'robot' } },
            { tags: { contains: 'robot' } },
          ]),
        }),
      })
    );
  });

  it('filters by tags in-memory after DB query', async () => {
    const projectWithArduino = { ...baseProject, tags: '["arduino"]' };
    const projectWithRobot = { ...baseProject, id: 'proj-2', tags: '["robot"]' };
    mockCount.mockResolvedValue(2);
    mockFindMany.mockResolvedValue([projectWithArduino, projectWithRobot]);

    const res = await GET(makeRequest('http://localhost/api/projects?tags=arduino'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('proj-1');
    expect(json.total).toBe(1);
  });

  it('returns empty data array when no projects match', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('respects custom limit and offset params', async () => {
    mockCount.mockResolvedValue(100);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?limit=10&offset=20'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it('caps limit at MAX_LIMIT (500)', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?limit=9999'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });

  it('gracefully handles malformed tags JSON (returns empty array)', async () => {
    const badProject = { ...baseProject, tags: 'not-valid-json' };
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([badProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual([]);
  });

  it('returns 500 on unexpected DB error', async () => {
    mockCount.mockRejectedValue(new Error('DB connection lost'));
    mockFindMany.mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(makeRequest('http://localhost/api/projects'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
