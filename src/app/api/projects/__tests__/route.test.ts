import { GET, POST } from '../route';

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
  tags: '["robotics","hardware"]',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/projects ────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns 200 with data array and total', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
  });

  it('parses tags JSON string into array', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual(['robotics', 'hardware']);
  });

  it('excludes archived projects by default', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      }),
    );
  });

  it('includes archived projects when ?archived=true', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?archived=true'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('archivedAt');
  });

  it('filters by status query param', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?status=active'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['active'] } }),
      }),
    );
  });

  it('filters by comma-separated status list', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/projects?status=active,planned'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['active', 'planned'] } }),
      }),
    );
  });

  it('filters by tags query param', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([baseProject]);

    await GET(makeRequest('http://localhost/api/projects?tags=robotics'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ tags: { contains: 'robotics' } }),
          ]),
        }),
      }),
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

  it('gracefully handles malformed tags JSON', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([{ ...baseProject, tags: 'not-valid-json' }]);

    const res = await GET(makeRequest('http://localhost/api/projects'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual([]);
  });
});

// ─── POST /api/projects ───────────────────────────────────────────────────────

describe('POST /api/projects', () => {
  it('returns 201 with the created project', async () => {
    mockCreate.mockResolvedValue({ ...baseProject, id: 'projnew001' });

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Robot Arm', status: 'active' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.id).toBe('projnew001');
  });

  it('defaults status to "idea" when not provided', async () => {
    mockCreate.mockResolvedValue({ ...baseProject, status: 'idea', id: 'projnew002' });

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Idea' }),
    });

    await POST(req);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'idea' }),
      }),
    );
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ status: 'active' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is an empty string', async () => {
    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bad Status Project', status: 'in_progress' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('serializes tags array correctly', async () => {
    mockCreate.mockResolvedValue({
      ...baseProject,
      tags: '["led","wall"]',
      id: 'projnew003',
    });

    const req = makeRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'LED Wall', tags: ['led', 'wall'] }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.tags).toEqual(['led', 'wall']);
  });
});
