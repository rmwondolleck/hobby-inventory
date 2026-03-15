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
  it('returns list of locations with pagination metadata', async () => {
    mockPrisma.location.findMany.mockResolvedValueOnce([sampleLocation, childLocation]);
    mockPrisma.location.count.mockResolvedValueOnce(2);

    const response = await GET(makeRequest('http://localhost/api/locations'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.limit).toBe(50);
    expect(body.offset).toBe(0);
  });

  it('returns empty list when no locations exist', async () => {
    mockPrisma.location.findMany.mockResolvedValueOnce([]);
    mockPrisma.location.count.mockResolvedValueOnce(0);

    const response = await GET(makeRequest('http://localhost/api/locations'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('includes children when ?withChildren=true', async () => {
    const locationWithChildren = { ...sampleLocation, children: [childLocation] };
    mockPrisma.location.findMany.mockResolvedValueOnce([locationWithChildren]);
    mockPrisma.location.count.mockResolvedValueOnce(1);

    const response = await GET(makeRequest('http://localhost/api/locations?withChildren=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ children: expect.anything() }) })
    );
  });

  it('does not include children when withChildren is not set', async () => {
    mockPrisma.location.findMany.mockResolvedValueOnce([sampleLocation]);
    mockPrisma.location.count.mockResolvedValueOnce(1);

    await GET(makeRequest('http://localhost/api/locations'));

    expect(mockPrisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: undefined })
    );
  });
});

describe('POST /api/locations', () => {
  it('creates a root location and returns 201', async () => {
    mockPrisma.location.create.mockResolvedValueOnce(sampleLocation);

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe('loc-1');
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
    expect(body.path).toBe('Room A/Shelf 1');
  });

  it('builds child path as parent.path/name', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);
    mockPrisma.location.create.mockResolvedValueOnce(childLocation);

    await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Shelf 1', parentId: 'loc-1' }),
      })
    );

    expect(mockPrisma.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ path: 'Room A/Shelf 1' }),
    });
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
    expect(body.error).toBe('validation_error');
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
    expect(body.error).toBe('not_found');
  });

  it('returns 500 when prisma throws unexpectedly', async () => {
    mockPrisma.location.create.mockRejectedValueOnce(new Error('DB error'));

    const response = await POST(
      makeRequest('http://localhost/api/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Room A' }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('internal_error');
  });
});
