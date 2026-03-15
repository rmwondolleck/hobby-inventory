import { GET, PATCH, DELETE } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    location: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;
const mockLocationUpdate = prisma.location.update as jest.Mock;
const mockLocationDelete = prisma.location.delete as jest.Mock;

const makeRequest = (url: string, options?: RequestInit) =>
  new Request(url, options);

type RouteParams = { params: Promise<{ id: string }> };
const makeParams = (id: string): RouteParams => ({ params: Promise.resolve({ id }) });

const mockLocation = {
  id: 'loc-1',
  name: 'Shelf A',
  path: 'Office/Shelf A',
  parentId: 'parent-1',
  notes: 'Top shelf',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  children: [],
  lots: [],
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/locations/[id]', () => {
  it('returns location with children and lots', async () => {
    mockLocationFindUnique.mockResolvedValue(mockLocation);
    const res = await GET(
      makeRequest('http://localhost/api/locations/loc-1'),
      makeParams('loc-1')
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('loc-1');
    expect(data.name).toBe('Shelf A');
  });

  it('returns 404 when location not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);
    const res = await GET(
      makeRequest('http://localhost/api/locations/missing'),
      makeParams('missing')
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('not_found');
  });
});

describe('PATCH /api/locations/[id]', () => {
  it('updates location name and recalculates path', async () => {
    mockLocationFindUnique.mockResolvedValue(mockLocation);
    mockLocationUpdate.mockResolvedValue({ ...mockLocation, name: 'Shelf B', path: 'Office/Shelf B' });

    const res = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Shelf B' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('loc-1')
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Shelf B');
    expect(data.path).toBe('Office/Shelf B');
    expect(mockLocationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Shelf B', path: 'Office/Shelf B' }),
      })
    );
  });

  it('updates location notes', async () => {
    mockLocationFindUnique.mockResolvedValue(mockLocation);
    mockLocationUpdate.mockResolvedValue({ ...mockLocation, notes: 'Updated notes' });

    const res = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('loc-1')
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notes).toBe('Updated notes');
  });

  it('clears notes when empty string is provided', async () => {
    mockLocationFindUnique.mockResolvedValue(mockLocation);
    mockLocationUpdate.mockResolvedValue({ ...mockLocation, notes: null });

    const res = await PATCH(
      makeRequest('http://localhost/api/locations/loc-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: '' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('loc-1')
    );

    expect(res.status).toBe(200);
    expect(mockLocationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notes: null }) })
    );
  });

  it('returns 404 when location not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);
    const res = await PATCH(
      makeRequest('http://localhost/api/locations/missing', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('missing')
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('not_found');
  });
});

describe('DELETE /api/locations/[id]', () => {
  it('deletes empty location and returns 204', async () => {
    const emptyLocation = { ...mockLocation, children: [], lots: [] };
    mockLocationFindUnique.mockResolvedValue(emptyLocation);
    mockLocationDelete.mockResolvedValue(emptyLocation);

    const res = await DELETE(
      makeRequest('http://localhost/api/locations/loc-1', { method: 'DELETE' }),
      makeParams('loc-1')
    );
    expect(res.status).toBe(204);
  });

  it('returns 409 when location has children', async () => {
    mockLocationFindUnique.mockResolvedValue({ ...mockLocation, children: [{ id: 'child-1' }], lots: [] });
    const res = await DELETE(
      makeRequest('http://localhost/api/locations/loc-1', { method: 'DELETE' }),
      makeParams('loc-1')
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('has_children');
  });

  it('returns 409 when location has lots', async () => {
    mockLocationFindUnique.mockResolvedValue({ ...mockLocation, children: [], lots: [{ id: 'lot-1' }] });
    const res = await DELETE(
      makeRequest('http://localhost/api/locations/loc-1', { method: 'DELETE' }),
      makeParams('loc-1')
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('has_lots');
  });

  it('returns 404 when location not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);
    const res = await DELETE(
      makeRequest('http://localhost/api/locations/missing', { method: 'DELETE' }),
      makeParams('missing')
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('not_found');
  });
});