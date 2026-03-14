import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.part.findMany as jest.Mock;
const mockCount = prisma.part.count as jest.Mock;

const basePart = {
  id: 'cltest001',
  name: 'Test Resistor',
  category: 'passive',
  manufacturer: 'Yageo',
  mpn: 'RC0402FR-0710KL',
  tags: '["resistor","0402"]',
  parameters: '{"resistance":"10k","tolerance":"1%"}',
  notes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lots: [],
};

function makeRequest(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/parts', () => {
  it('returns 200 with data array, total, limit and offset', async () => {
    mockFindMany.mockResolvedValue([basePart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.total).toBe(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('parses tags and parameters JSON strings into objects', async () => {
    mockFindMany.mockResolvedValue([basePart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual(['resistor', '0402']);
    expect(json.data[0].parameters).toEqual({ resistance: '10k', tolerance: '1%' });
  });

  it('excludes archived parts by default (filters archivedAt: null)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      })
    );
  });

  it('includes archived parts when ?includeArchived=true', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?includeArchived=true'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('archivedAt');
  });

  it('filters by category query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?category=passive'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'passive' }),
      })
    );
  });

  it('adds OR filter when search query param is provided', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?search=resistor'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: 'resistor' } },
        { mpn: { contains: 'resistor' } },
        { manufacturer: { contains: 'resistor' } },
        { tags: { contains: 'resistor' } },
      ])
    );
  });

  it('computes totalQuantity from exact-mode lots', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        { quantity: 5, quantityMode: 'exact', qualitativeStatus: null },
        { quantity: 10, quantityMode: 'exact', qualitativeStatus: null },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].totalQuantity).toBe(15);
  });

  it('computes qualitativeStatuses from qualitative-mode lots', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'plenty' },
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'low' },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].qualitativeStatuses).toContain('plenty');
    expect(json.data[0].qualitativeStatuses).toContain('low');
  });

  it('includes lotCount in enriched data', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        { quantity: 3, quantityMode: 'exact', qualitativeStatus: null },
        { quantity: 7, quantityMode: 'exact', qualitativeStatus: null },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].lotCount).toBe(2);
  });

  it('filters results by tags param (client-side, comma-separated)', async () => {
    const matchingPart = { ...basePart, tags: '["resistor","0402"]', lots: [] };
    const nonMatchingPart = { ...basePart, id: 'cltest002', name: 'Capacitor', tags: '["capacitor"]', lots: [] };
    mockFindMany.mockResolvedValue([matchingPart, nonMatchingPart]);
    mockCount.mockResolvedValue(2);

    const res = await GET(makeRequest('http://localhost/api/parts?tags=resistor'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('cltest001');
    expect(json.total).toBe(1);
  });

  it('returns all parts when tags param is empty', async () => {
    mockFindMany.mockResolvedValue([basePart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts?tags='));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.total).toBe(1);
  });

  it('handles malformed tags JSON (returns empty array fallback)', async () => {
    const badPart = { ...basePart, tags: 'not-valid-json', lots: [] };
    mockFindMany.mockResolvedValue([badPart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual([]);
  });

  it('handles malformed parameters JSON (returns empty object fallback)', async () => {
    const badPart = { ...basePart, parameters: '{bad}', lots: [] };
    mockFindMany.mockResolvedValue([badPart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].parameters).toEqual({});
  });

  it('returns empty data array when no parts match', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('respects limit query param (capped at MAX_LIMIT 500)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?limit=1000'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });

  it('respects offset query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(5);

    await GET(makeRequest('http://localhost/api/parts?offset=2'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2 })
    );
  });

  it('returns 500 on internal error', async () => {
    mockFindMany.mockRejectedValue(new Error('DB failure'));
    mockCount.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
