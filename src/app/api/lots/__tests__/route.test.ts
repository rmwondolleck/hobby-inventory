import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    part: {
      findUnique: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
const mockLotCount = prisma.lot.count as jest.Mock;
const mockLotFindMany = prisma.lot.findMany as jest.Mock;
const mockLotCreate = prisma.lot.create as jest.Mock;
const mockPartFindUnique = prisma.part.findUnique as jest.Mock;

const makeRequest = (url: string, options?: RequestInit) =>
  new Request(url, options);

const baseLot = {
  id: 'lot-1',
  partId: 'part-1',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  locationId: 'loc-1',
  source: '{}',
  receivedAt: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  part: { id: 'part-1', name: 'Resistor', category: 'passive' },
  location: { id: 'loc-1', name: 'Shelf A', path: 'Office/Shelf A' },
};

const basePart = {
  id: 'part-1',
  name: 'Resistor',
  category: 'passive',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// --- GET /api/lots ---

describe('GET /api/lots', () => {
  it('returns 200 with data array and total', async () => {
    mockLotCount.mockResolvedValue(1);
    mockLotFindMany.mockResolvedValue([baseLot]);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('returns empty list when no lots exist', async () => {
    mockLotCount.mockResolvedValue(0);
    mockLotFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('passes partId filter to prisma query', async () => {
    mockLotCount.mockResolvedValue(1);
    mockLotFindMany.mockResolvedValue([baseLot]);

    await GET(makeRequest('http://localhost/api/lots?partId=part-1'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ partId: 'part-1' }),
      })
    );
  });

  it('passes locationId filter to prisma query', async () => {
    mockLotCount.mockResolvedValue(1);
    mockLotFindMany.mockResolvedValue([baseLot]);

    await GET(makeRequest('http://localhost/api/lots?locationId=loc-1'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationId: 'loc-1' }),
      })
    );
  });

  it('passes status filter to prisma query', async () => {
    mockLotCount.mockResolvedValue(0);
    mockLotFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/lots?status=low'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'low' }),
      })
    );
  });
});

// --- POST /api/lots ---

describe('POST /api/lots', () => {
  it('creates a lot and returns 201', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLotCreate.mockResolvedValue(baseLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', quantity: 10, unit: 'pcs' }),
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('lot-1');
  });

  it('returns 400 when partId is missing', async () => {
    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ quantity: 5 }),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
    expect(json.message).toMatch(/partId/i);
  });

  it('returns 404 when partId does not exist', async () => {
    mockPartFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'nonexistent' }),
      })
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('creates a qualitative-mode lot with default status plenty', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    const qualLot = {
      ...baseLot,
      quantity: null,
      quantityMode: 'qualitative',
      qualitativeStatus: 'plenty',
    };
    mockLotCreate.mockResolvedValue(qualLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({
          partId: 'part-1',
          quantityMode: 'qualitative',
        }),
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.quantityMode).toBe('qualitative');
    expect(json.qualitativeStatus).toBe('plenty');
  });

  it('creates lot with custom qualitativeStatus', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    const lowLot = {
      ...baseLot,
      quantity: null,
      quantityMode: 'qualitative',
      qualitativeStatus: 'low',
    };
    mockLotCreate.mockResolvedValue(lowLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({
          partId: 'part-1',
          quantityMode: 'qualitative',
          qualitativeStatus: 'low',
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(mockLotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ qualitativeStatus: 'low' }),
      })
    );
  });

  it('creates lot with specific status', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLotCreate.mockResolvedValue({ ...baseLot, status: 'reserved' });

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', status: 'reserved' }),
      })
    );

    expect(res.status).toBe(201);
    expect(mockLotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'reserved' }),
      })
    );
  });

  it('returns 500 when prisma throws unexpectedly', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLotCreate.mockRejectedValueOnce(new Error('DB error'));

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1' }),
      })
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
