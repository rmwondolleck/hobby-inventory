import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    allocation: {
      groupBy: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.project.findMany as jest.Mock;
const mockCount = prisma.project.count as jest.Mock;
const mockGroupBy = prisma.allocation.groupBy as jest.Mock;

const baseProject = {
  id: 'proj001',
  name: 'Test Robot',
  status: 'active',
  tags: '["electronics","robotics"]',
  notes: null,
  wishlistNotes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
};

function makeRequest(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGroupBy.mockResolvedValue([]);
});

describe('GET /api/projects', () => {
  it('returns 200 with data array, total, limit and offset', async () => {
    mockFindMany.mockResolvedValue([baseProject]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('parses tags JSON string into an array', async () => {
    mockFindMany.mockResolvedValue([baseProject]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual(['electronics', 'robotics']);
  });

  it('excludes archived projects by default (filters archivedAt: null)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      })
    );
  });

  it('includes archived projects when ?includeArchived=true', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects?includeArchived=true'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('archivedAt');
  });

  it('filters by status query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects?status=active'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'active' }),
      })
    );
  });

  it('adds OR filter when search query param is provided', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects?search=robot'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: 'robot' } },
        { notes: { contains: 'robot' } },
        { tags: { contains: 'robot' } },
      ])
    );
  });

  it('enriches allocationsByStatus from groupBy result', async () => {
    mockFindMany.mockResolvedValue([baseProject]);
    mockCount.mockResolvedValue(1);
    mockGroupBy.mockResolvedValue([
      { projectId: 'proj001', status: 'in_use', _count: { id: 3 } },
      { projectId: 'proj001', status: 'reserved', _count: { id: 1 } },
    ]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].allocationCount).toBe(4);
    expect(json.data[0].allocationsByStatus).toEqual({ in_use: 3, reserved: 1 });
  });

  it('returns allocationCount 0 for projects with no allocations', async () => {
    mockFindMany.mockResolvedValue([baseProject]);
    mockCount.mockResolvedValue(1);
    mockGroupBy.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].allocationCount).toBe(0);
    expect(json.data[0].allocationsByStatus).toEqual({});
  });

  it('filters results by tags param (client-side, comma-separated)', async () => {
    const matchingProject = { ...baseProject, tags: '["electronics","robotics"]' };
    const nonMatchingProject = { ...baseProject, id: 'proj002', name: 'Garden Monitor', tags: '["iot"]' };
    mockFindMany.mockResolvedValue([matchingProject, nonMatchingProject]);
    mockCount.mockResolvedValue(2);

    const res = await GET(makeRequest('http://localhost/api/projects?tags=robotics'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('proj001');
    expect(json.total).toBe(1);
  });

  it('handles malformed tags JSON (returns empty array fallback)', async () => {
    mockFindMany.mockResolvedValue([{ ...baseProject, tags: 'not-valid-json' }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual([]);
  });

  it('falls back to DEFAULT_LIMIT when limit param is non-numeric', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects?limit=abc'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it('falls back to 0 when offset param is non-numeric', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects?offset=xyz'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it('respects limit query param (capped at MAX_LIMIT 500)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/projects?limit=1000'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });

  it('respects offset query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(5);

    await GET(makeRequest('http://localhost/api/projects?offset=10'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10 })
    );
  });

  it('returns empty data array when no projects match', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('returns 500 on internal error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB failure'));
    mockCount.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/projects'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
