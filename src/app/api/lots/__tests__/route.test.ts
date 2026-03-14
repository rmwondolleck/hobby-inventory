import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
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
const mockLotFindMany = prisma.lot.findMany as jest.Mock;
const mockLotCreate = prisma.lot.create as jest.Mock;
const mockPartFindUnique = prisma.part.findUnique as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;

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
  source: '{"type":"amazon","seller":"SomeStore","unitCost":1.5,"currency":"USD"}',
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
  archivedAt: null,
};

const baseLocation = {
  id: 'loc-1',
  name: 'Shelf A',
  path: 'Office/Shelf A',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/lots ────────────────────────────────────────────────────────────

describe('GET /api/lots', () => {
  it('returns 200 with data array and total', async () => {
    mockLotFindMany.mockResolvedValue([baseLot]);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
  });

  it('parses source JSON string into object', async () => {
    mockLotFindMany.mockResolvedValue([baseLot]);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    const json = await res.json();

    expect(json.data[0].source).toEqual({
      type: 'amazon',
      seller: 'SomeStore',
      unitCost: 1.5,
      currency: 'USD',
    });
  });

  it('returns empty list when no lots exist', async () => {
    mockLotFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('passes partId filter to prisma query', async () => {
    mockLotFindMany.mockResolvedValue([baseLot]);

    await GET(makeRequest('http://localhost/api/lots?partId=part-1'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ partId: 'part-1' }),
      })
    );
  });

  it('passes locationId filter to prisma query', async () => {
    mockLotFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/lots?locationId=loc-1'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locationId: 'loc-1' }),
      })
    );
  });

  it('passes status filter to prisma query', async () => {
    mockLotFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/lots?status=low'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'low' }),
      })
    );
  });

  it('filters by source.seller in-memory', async () => {
    const otherLot = {
      ...baseLot,
      id: 'lot-2',
      source: '{"seller":"OtherStore"}',
    };
    mockLotFindMany.mockResolvedValue([baseLot, otherLot]);

    const res = await GET(
      makeRequest('http://localhost/api/lots?source.seller=SomeStore')
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.data[0].id).toBe('lot-1');
  });
});

// ─── POST /api/lots ───────────────────────────────────────────────────────────

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
    expect(json.data.id).toBe('lot-1');
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

  it('returns 400 for invalid quantityMode', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', quantityMode: 'invalid' }),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 for negative quantity', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', quantity: -1 }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid qualitativeStatus', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({
          partId: 'part-1',
          quantityMode: 'qualitative',
          qualitativeStatus: 'full',
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 for invalid status', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', status: 'unknown' }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 404 when locationId does not exist', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', locationId: 'nonexistent' }),
      })
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 400 for invalid receivedAt', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', receivedAt: 'not-a-date' }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('creates a qualitative-mode lot', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    const qualLot = {
      ...baseLot,
      quantity: null,
      quantityMode: 'qualitative',
      qualitativeStatus: 'plenty',
      source: '{}',
    };
    mockLotCreate.mockResolvedValue(qualLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({
          partId: 'part-1',
          quantityMode: 'qualitative',
          qualitativeStatus: 'plenty',
        }),
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.quantityMode).toBe('qualitative');
    expect(json.data.qualitativeStatus).toBe('plenty');
  });

  it('stores source as JSON and returns parsed object', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLotCreate.mockResolvedValue(baseLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({
          partId: 'part-1',
          source: { type: 'amazon', seller: 'SomeStore', unitCost: 1.5, currency: 'USD' },
        }),
      })
    );

    const json = await res.json();
    expect(mockLotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: JSON.stringify({ type: 'amazon', seller: 'SomeStore', unitCost: 1.5, currency: 'USD' }),
        }),
      })
    );
    expect(json.data.source).toEqual({
      type: 'amazon',
      seller: 'SomeStore',
      unitCost: 1.5,
      currency: 'USD',
    });
  });

  it('validates locationId when provided', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLocationFindUnique.mockResolvedValue(baseLocation);
    mockLotCreate.mockResolvedValue(baseLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', locationId: 'loc-1' }),
      })
    );

    expect(res.status).toBe(201);
    expect(mockLocationFindUnique).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
  });
});
