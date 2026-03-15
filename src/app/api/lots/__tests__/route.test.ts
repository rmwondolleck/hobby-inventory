import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findMany: jest.fn(),
      count: jest.fn(),
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

const mockFindMany = prisma.lot.findMany as jest.Mock;
const mockCount = prisma.lot.count as jest.Mock;
const mockCreate = prisma.lot.create as jest.Mock;
const mockPartFindUnique = prisma.part.findUnique as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;

const basePart = {
  id: 'part001',
  name: 'ESP32',
  category: 'microcontroller',
  mpn: 'ESP32-WROOM-32',
};

const baseLocation = {
  id: 'loc001',
  name: 'Shelf A',
  path: 'Office/Shelf A',
};

const baseLot = {
  id: 'lot001',
  partId: 'part001',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: null,
  status: 'in_stock',
  locationId: 'loc001',
  source: '{"type":"amazon","seller":"SomeStore","url":"https://amazon.com/dp/B07X","orderRef":"123-456","unitCost":5.99,"currency":"USD"}',
  receivedAt: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  part: basePart,
  location: baseLocation,
};

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/lots', () => {
  it('returns 200 with data, total, limit, and offset', async () => {
    mockFindMany.mockResolvedValue([baseLot]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('parses source JSON string into object', async () => {
    mockFindMany.mockResolvedValue([baseLot]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    const json = await res.json();

    expect(json.data[0].source).toEqual({
      type: 'amazon',
      seller: 'SomeStore',
      url: 'https://amazon.com/dp/B07X',
      orderRef: '123-456',
      unitCost: 5.99,
      currency: 'USD',
    });
  });

  it('returns empty object for malformed source JSON', async () => {
    const badLot = { ...baseLot, source: 'bad-json' };
    mockFindMany.mockResolvedValue([badLot]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/lots'));
    const json = await res.json();
    expect(json.data[0].source).toEqual({});
  });

  it('filters by partId query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?partId=part001'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ partId: 'part001' }),
      })
    );
  });

  it('filters by status query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?status=in_stock'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'in_stock' }),
      })
    );
  });

  it('filters by seller via source JSON contains', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?seller=SomeStore'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: { contains: 'SomeStore' } }),
      })
    );
  });

  it('filters by sourceType via source JSON contains', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?sourceType=amazon'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: { contains: '"type":"amazon"' },
        }),
      })
    );
  });

  it('combines seller and sourceType filters with AND', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?seller=SomeStore&sourceType=amazon'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.AND).toEqual([
      { source: { contains: 'SomeStore' } },
      { source: { contains: '"type":"amazon"' } },
    ]);
  });

  it('respects limit and offset query params', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?limit=10&offset=20'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it('caps limit at MAX_LIMIT 500', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/lots?limit=9999'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });

  it('returns 500 on internal error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/lots'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});

describe('POST /api/lots', () => {
  it('creates a lot and returns 201', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockCreate.mockResolvedValue({
      ...baseLot,
      source: '{"type":"amazon"}',
    });

    const body = { partId: 'part001', quantity: 10, source: { type: 'amazon', seller: 'SomeStore' } };
    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toBeDefined();
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
  });

  it('returns 404 when part does not exist', async () => {
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

  it('auto-detects source type from URL when type not provided', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockCreate.mockResolvedValue({ ...baseLot, source: '{}' });

    const body = {
      partId: 'part001',
      source: { url: 'https://www.amazon.com/dp/B07XYZ' },
    };
    await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: expect.stringContaining('"type":"amazon"'),
        }),
      })
    );
  });

  it('auto-detects aliexpress source type', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockCreate.mockResolvedValue({ ...baseLot, source: '{}' });

    const body = {
      partId: 'part001',
      source: { url: 'https://www.aliexpress.com/item/123456.html' },
    };
    await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: expect.stringContaining('"type":"aliexpress"'),
        }),
      })
    );
  });

  it('uses manual type when URL is not recognizable', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockCreate.mockResolvedValue({ ...baseLot, source: '{}' });

    const body = {
      partId: 'part001',
      source: { url: 'https://somerandomshop.example.com/item/123' },
    };
    await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: expect.stringContaining('"type":"manual"'),
        }),
      })
    );
  });

  it('respects explicitly provided source type even when URL is present', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockCreate.mockResolvedValue({ ...baseLot, source: '{}' });

    const body = {
      partId: 'part001',
      source: { type: 'ebay', url: 'https://www.amazon.com/dp/B07XYZ' },
    };
    await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: expect.stringContaining('"type":"ebay"'),
        }),
      })
    );
  });

  it('returns 404 when locationId does not exist', async () => {
    mockPartFindUnique.mockResolvedValue(basePart);
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part001', locationId: 'bad-loc' }),
      })
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
    expect(json.message).toContain('Location');
  });

  it('returns 500 on internal error', async () => {
    mockPartFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await POST(
      makeRequest('http://localhost/api/lots', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part001' }),
      })
    );
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
