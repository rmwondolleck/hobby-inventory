import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockCount = prisma.project.count as jest.Mock;
const mockFindMany = prisma.project.findMany as jest.Mock;
const mockCreate = prisma.project.create as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const baseProject = {
  id: 'proj001',
  name: 'Robot Arm',
  status: 'active',
  notes: null,
  tags: '["robot","arduino"]',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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

  it('adds tag conditions to Prisma where clause', async () => {
    const projectWithArduino = { ...baseProject, tags: '["arduino"]' };
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([projectWithArduino]);

    const res = await GET(makeRequest('http://localhost/api/projects?tags=arduino'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('proj001');
    expect(json.total).toBe(1);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { contains: '"arduino"' } },
          ]),
        }),
      })
    );
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { contains: '"arduino"' } },
          ]),
        }),
      })
    );
  });

  it('total reflects DB count (not data.length) when tags filter spans multiple pages', async () => {
    const page1Projects = Array.from({ length: 5 }, (_, i) => ({
      ...baseProject,
      id: `proj-page1-${i}`,
      tags: '["arduino"]',
    }));
    // DB has 12 matching records but we only return 5 (limit=5)
    mockCount.mockResolvedValue(12);
    mockFindMany.mockResolvedValue(page1Projects);

    const res = await GET(makeRequest('http://localhost/api/projects?tags=arduino&limit=5&offset=0'));
    const json = await res.json();

    expect(json.data).toHaveLength(5);
    expect(json.total).toBe(12);
    expect(json.total).toBeGreaterThan(json.data.length);
  });

  it('adds one AND condition per tag when multiple tags are supplied', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?tags=arduino,robot'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { contains: '"arduino"' } },
            { tags: { contains: '"robot"' } },
          ]),
        }),
      })
    );
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { contains: '"arduino"' } },
            { tags: { contains: '"robot"' } },
          ]),
        }),
      })
    );
  });

  it('trims whitespace from comma-separated tag values', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?tags=arduino%2C%20robot'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { contains: '"arduino"' } },
            { tags: { contains: '"robot"' } },
          ]),
        }),
      })
    );
  });

  it('does not add AND conditions when tags param is empty string', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    await GET(makeRequest('http://localhost/api/projects?tags='));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('AND');
  });

  it('merges tag AND conditions with existing status where clause', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?status=active&tags=arduino'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'active',
          AND: expect.arrayContaining([
            { tags: { contains: '"arduino"' } },
          ]),
        }),
      })
    );
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

  it('sorts alphabetically when sortBy=name&sortDir=asc', async () => {
    const projectA = { ...baseProject, id: 'proj-a', name: 'Alpha Project' };
    const projectB = { ...baseProject, id: 'proj-b', name: 'Beta Project' };
    mockCount.mockResolvedValue(2);
    mockFindMany.mockResolvedValue([projectA, projectB]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=name&sortDir=asc'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } })
    );
  });

  it('falls back to updatedAt desc when sortBy is unrecognised', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=invalid_field'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: 'desc' } })
    );
  });

  it('uses updatedAt desc when no sort params present', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: 'desc' } })
    );
  });

  it('sorts by status asc when sortBy=status&sortDir=asc', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=status&sortDir=asc'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { status: 'asc' } })
    );
  });

  it('sorts by createdAt desc when sortBy=createdAt&sortDir=desc', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=createdAt&sortDir=desc'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    );
  });

  it('sorts by updatedAt asc when sortBy=updatedAt&sortDir=asc', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=updatedAt&sortDir=asc'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: 'asc' } })
    );
  });

  it('defaults sortDir to desc when sortBy is valid but sortDir is omitted', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=name'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'desc' } })
    );
  });

  it('defaults sortDir to desc when sortDir value is unrecognised', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortBy=name&sortDir=DESC'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'desc' } })
    );
  });

  it('uses updatedAt desc when sortDir is provided alone without sortBy', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?sortDir=asc'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: 'asc' } })
    );
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
