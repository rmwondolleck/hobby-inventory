import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';

// Mock the Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    location: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

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

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/locations/loc-1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/locations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns location with children and lots', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(mockLocation);
    const res = await GET(makeRequest('GET'), { params: { id: 'loc-1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('loc-1');
    expect(data.name).toBe('Shelf A');
  });

  it('returns 404 when location not found', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest('GET'), { params: { id: 'missing' } });
    expect(res.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await GET(makeRequest('GET'), { params: { id: 'loc-1' } });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/locations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates location name', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(mockLocation);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(mockPrisma)
    );
    (mockPrisma.location.update as jest.Mock).mockResolvedValue({
      ...mockLocation,
      name: 'Shelf B',
      path: 'Office/Shelf B',
    });
    const req = makeRequest('PATCH', { name: 'Shelf B' });
    const res = await PATCH(req, { params: { id: 'loc-1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Shelf B');
  });

  it('updates location notes', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(mockLocation);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(mockPrisma)
    );
    (mockPrisma.location.update as jest.Mock).mockResolvedValue({
      ...mockLocation,
      notes: 'Updated notes',
    });
    const req = makeRequest('PATCH', { notes: 'Updated notes' });
    const res = await PATCH(req, { params: { id: 'loc-1' } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notes).toBe('Updated notes');
  });

  it('returns 404 when location not found', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(null);
    const req = makeRequest('PATCH', { name: 'New Name' });
    const res = await PATCH(req, { params: { id: 'missing' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty name', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(mockLocation);
    const req = makeRequest('PATCH', { name: '' });
    const res = await PATCH(req, { params: { id: 'loc-1' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 for null body', async () => {
    const req = new NextRequest('http://localhost/api/locations/loc-1', {
      method: 'PATCH',
      body: 'null',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: { id: 'loc-1' } });
    expect(res.status).toBe(400);
  });

  it('returns 409 on cycle detection', async () => {
    const childLocation = { ...mockLocation, id: 'child-1', parentId: 'loc-1' };
    (mockPrisma.location.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockLocation)
      .mockResolvedValueOnce(childLocation);
    const req = makeRequest('PATCH', { parentId: 'child-1' });
    const res = await PATCH(req, { params: { id: 'loc-1' } });
    expect(res.status).toBe(409);
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
    const req = makeRequest('PATCH', { name: 'New Name' });
    const res = await PATCH(req, { params: { id: 'loc-1' } });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/locations/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes empty location', async () => {
    const emptyLocation = { ...mockLocation, children: [], lots: [] };
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(emptyLocation);
    (mockPrisma.location.delete as jest.Mock).mockResolvedValue(emptyLocation);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: 'loc-1' } });
    expect(res.status).toBe(200);
  });

  it('returns 409 when location has children', async () => {
    const locWithChildren = {
      ...mockLocation,
      children: [{ id: 'child-1' }],
      lots: [],
    };
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(locWithChildren);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: 'loc-1' } });
    expect(res.status).toBe(409);
  });

  it('returns 409 when location has lots', async () => {
    const locWithLots = {
      ...mockLocation,
      children: [],
      lots: [{ id: 'lot-1' }],
    };
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(locWithLots);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: 'loc-1' } });
    expect(res.status).toBe(409);
  });

  it('returns 404 when location not found', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeRequest('DELETE'), { params: { id: 'missing' } });
    expect(res.status).toBe(404);
  });

  it('returns 500 on database error', async () => {
    (mockPrisma.location.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await DELETE(makeRequest('DELETE'), { params: { id: 'loc-1' } });
    expect(res.status).toBe(500);
  });
});