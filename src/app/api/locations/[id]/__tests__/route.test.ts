import { GET, PATCH, DELETE } from '../route';

// Mock Prisma — factory must not reference outer variables (jest.mock is hoisted)
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    location: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = jest.requireMock('@/lib/db').default as {
  location: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

const makeRequest = (url: string, options?: RequestInit) =>
  new Request(url, options);

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

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
  // $transaction executes the callback with the same mock client
  mockPrisma.$transaction.mockImplementation(
    (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
  );
});

describe('GET /api/locations/[id]', () => {
  it('returns location with children and lots (200)', async () => {
    const locationWithRelations = {
      ...sampleLocation,
      children: [{ ...childLocation, name: 'Shelf 1' }],
      lots: [],
    };
    mockPrisma.location.findUnique.mockResolvedValueOnce(locationWithRelations);

    const response = await GET(makeRequest('http://localhost/api/locations/loc-1'), makeParams('loc-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe('loc-1');
    expect(body.data.children).toHaveLength(1);
    expect(body.data.lots).toEqual([]);
  });

  it('returns 404 when location does not exist', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(null);

    const response = await GET(makeRequest('http://localhost/api/locations/unknown'), makeParams('unknown'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('NotFound');
  });
});

describe('PATCH /api/locations/[id]', () => {
  it('updates location name and returns 200', async () => {
    const updated = { ...sampleLocation, name: 'Living Room', path: 'Living Room' };
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation); // existing
    mockPrisma.location.update.mockResolvedValueOnce(updated);
    mockPrisma.location.findMany.mockResolvedValueOnce([]); // no children to propagate

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Living Room' }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Living Room');
  });

  it('returns 404 when location does not exist', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(null);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/unknown', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Test' }),
      }),
      makeParams('unknown')
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('NotFound');
  });

  it('returns 400 for invalid JSON', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
  });

  it('returns 400 when body is null JSON', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: 'null',
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
  });

  it('returns 400 when name is empty string', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: '' }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
    expect(body.message).toMatch(/name/i);
  });

  it('returns 400 when parentId is not a string', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: 123 }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('BadRequest');
  });

  it('returns 400 when notes is not a string', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 42 }),
      }),
      makeParams('loc-1')
    );

    expect(response.status).toBe(400);
  });

  it('normalizes empty string parentId to null (removes parent) in PATCH', async () => {
    const locationWithParent = { ...childLocation };
    const updated = { ...childLocation, parentId: null, path: 'Shelf 1' };
    mockPrisma.location.findUnique.mockResolvedValueOnce(locationWithParent);
    mockPrisma.location.update.mockResolvedValueOnce(updated);
    mockPrisma.location.findMany.mockResolvedValueOnce([]);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-2', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: '' }),
      }),
      makeParams('loc-2')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.location.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: null }) })
    );
    expect(body.data.parentId).toBeNull();
  });

  it('returns 400 when setting a location as its own parent', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: 'loc-1' }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/own parent/i);
  });

  it('returns 404 when new parentId does not exist', async () => {
    // first findUnique: existing location; second: parent lookup → null
    mockPrisma.location.findUnique
      .mockResolvedValueOnce(sampleLocation)  // existing
      .mockResolvedValueOnce(null);           // parent not found

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: 'nonexistent' }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('NotFound');
    expect(body.message).toMatch(/parent/i);
  });

  it('returns 400 when moving a location under its own descendant (cycle)', async () => {
    // sampleLocation (loc-1) is parent of childLocation (loc-2)
    // Trying to set loc-1's parent to loc-2 would create a cycle
    mockPrisma.location.findUnique
      .mockResolvedValueOnce(sampleLocation)    // existing loc-1
      .mockResolvedValueOnce(childLocation)     // parent check: loc-2 exists
      .mockResolvedValueOnce(childLocation)     // cycle check: loc-2 has parentId loc-1
      .mockResolvedValueOnce(sampleLocation);   // cycle check: loc-1 === ancestorId → true

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ parentId: 'loc-2' }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toMatch(/descendant/i);
  });

  it('propagates path updates to descendants when path changes', async () => {
    const updated = { ...sampleLocation, name: 'New Room', path: 'New Room' };
    const grandchild = {
      id: 'loc-3',
      name: 'Bin A',
      parentId: 'loc-2',
      path: 'Room A/Shelf 1/Bin A',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.location.findUnique.mockResolvedValueOnce(sampleLocation); // existing
    mockPrisma.location.update.mockResolvedValueOnce(updated);
    // propagatePathUpdate calls: children of loc-1, then children of loc-2
    mockPrisma.location.findMany
      .mockResolvedValueOnce([childLocation])   // children of loc-1
      .mockResolvedValueOnce([grandchild])      // children of loc-2
      .mockResolvedValueOnce([]);               // children of loc-3
    mockPrisma.location.update
      .mockResolvedValueOnce({ ...childLocation, path: 'New Room/Shelf 1' })
      .mockResolvedValueOnce({ ...grandchild, path: 'New Room/Shelf 1/Bin A' });

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Room' }),
      }),
      makeParams('loc-1')
    );

    expect(response.status).toBe(200);
  });

  it('updates notes to null', async () => {
    const locationWithNotes = { ...sampleLocation, notes: 'old notes' };
    const updated = { ...sampleLocation, notes: null };
    mockPrisma.location.findUnique.mockResolvedValueOnce(locationWithNotes);
    mockPrisma.location.update.mockResolvedValueOnce(updated);
    mockPrisma.location.findMany.mockResolvedValueOnce([]);

    const response = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: null }),
      }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.notes).toBeNull();
  });
});

describe('DELETE /api/locations/[id]', () => {
  it('deletes a leaf location and returns 204', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce({
      ...sampleLocation,
      children: [],
      lots: [],
    });
    mockPrisma.location.delete.mockResolvedValueOnce(sampleLocation);

    const response = await DELETE(
      makeRequest('http://localhost/api/locations/loc-1', { method: 'DELETE' }),
      makeParams('loc-1')
    );

    expect(response.status).toBe(204);
  });

  it('returns 404 when location does not exist', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE(
      makeRequest('http://localhost/api/locations/unknown', { method: 'DELETE' }),
      makeParams('unknown')
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('NotFound');
  });

  it('returns 409 when location has child locations', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce({
      ...sampleLocation,
      children: [{ id: 'loc-2' }],
      lots: [],
    });

    const response = await DELETE(
      makeRequest('http://localhost/api/locations/loc-1', { method: 'DELETE' }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.message).toMatch(/child locations/i);
  });

  it('returns 409 when location contains lots', async () => {
    mockPrisma.location.findUnique.mockResolvedValueOnce({
      ...sampleLocation,
      children: [],
      lots: [{ id: 'lot-1' }],
    });

    const response = await DELETE(
      makeRequest('http://localhost/api/locations/loc-1', { method: 'DELETE' }),
      makeParams('loc-1')
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.message).toMatch(/lots/i);
  });
});
