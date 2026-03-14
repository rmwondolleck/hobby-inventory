import { GET, POST } from '../route';

// Mock Prisma — factory must not reference outer variables (jest.mock is hoisted)
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    location: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = jest.requireMock('@/lib/db').default as {
  location: {
    count: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

const makeRequest = (url: string, options?: RequestInit) =>
  new Request(url, options);

const sampleLocation = {
  id: 'loc-1',
  name: 'Room A',
  parentId: null,
  path: 'Room A',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const childLocation = {
  id: 'loc-2',
  name: 'Shelf 1',
  parentId: 'loc-1',
  path: 'Room A/Shelf 1',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/locations', () => {
  it('returns flat list of locations', async () => {
    mockPrisma.location.count.mockResolvedValueOnce(2);
    mockPrisma.location.findMany.mockResolvedValueOnce([sampleLocation, childLocation]);

    const response = await GET(makeRequest('http://localhost/api/locations'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('returns empty flat list when no locations exist', async () => {
    mockPrisma.location.count.mockResolvedValueOnce(0);
    mockPrisma.location.findMany.mockResolvedValueOnce([]);

    const response = await GET(makeRequest('http://localhost/api/locations'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns nested tree when ?tree=true', async () => {
    mockPrisma.location.findMany.mockResolvedValueOnce([sampleLocation, childLocation]);

    const response = await GET(makeRequest('http://localhost/api/locations?tree=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1); // only root
    expect(body.data[0].children).toHaveLength(1);
    expect(body.data[0].children[0].id).toBe('loc-2');
    // flat list has no total field
    expect(body.total).toBeUndefined();
  });

  it('builds tree with multiple root nodes', async () => {
    const rootA = { ...sampleLocation, id: 'root-a', name: 'A', path: 'A' };
    const rootB = { ...sampleLocation, id: 'root-b', name: 'B', path: 'B' };
    mockPrisma.location.findMany.mockResolvedValueOnce([rootA, rootB]);

    const response = await GET(makeRequest('http://localhost/api/locations?tree=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    body.data.forEach((node: { children: unknown[] }) => {
      expect(node.children).toEqual([]);
    });
  });
});

describe('POST /api/locations', () => {
  it('creates a root location (201)', async () => {
    mockPrisma.location.create.mockResolvedValueOnce(sampleLocation);

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe('loc-1');
    expect(mockPrisma.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Room A', path: 'Room A', parentId: null }),
    });
  });

  it('creates a child location under a parent (201)', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);
    mockPrisma.location.create.mockResolvedValueOnce(childLocation);

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Shelf 1', parentId: 'loc-1' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.path).toBe('Room A/Shelf 1');
  });

  it('returns 400 when name is missing', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ notes: 'some note' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
    expect(body.message).toMatch(/name/i);
  });

  it('returns 400 when name is an empty string', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when name is not a string', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 42 }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when parentId is not a string', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A', parentId: 123 }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
  });

  it('returns 400 when notes is not a string', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A', notes: 99 }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
  });

  it('returns 404 when parentId does not exist', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(null);

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Orphan', parentId: 'nonexistent' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('NotFound');
  });

  it('accepts null parentId and null notes', async () => {
    mockPrisma.location.create.mockResolvedValueOnce(sampleLocation);

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A', parentId: null, notes: null }),
      })
    );

    expect(response.status).toBe(201);
  });

  it('treats empty string parentId as null (creates root location)', async () => {
    mockPrisma.location.create.mockResolvedValueOnce(sampleLocation);

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A', parentId: '' }),
      })
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.location.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ parentId: null }),
    });
  });

  it('returns 400 when body is null JSON', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: 'null',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
  });
});
