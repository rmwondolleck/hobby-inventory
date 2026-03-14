import { GET } from '../route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockLotCount = prisma.lot.count as jest.Mock;
const mockLotFindMany = prisma.lot.findMany as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;
const mockLocationFindMany = prisma.location.findMany as jest.Mock;

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/lots');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

async function callGet(params: Record<string, string> = {}) {
  const res = await GET(makeRequest(params));
  return { status: res.status, body: await res.json() };
}

const sampleLot = {
  id: 'lot1',
  partId: 'p1',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  locationId: 'loc1',
  source: '{"supplier":"Mouser","url":"https://mouser.com"}',
  receivedAt: null,
  notes: 'test lot',
  createdAt: new Date(),
  updatedAt: new Date(),
  part: { id: 'p1', name: 'Resistor', category: 'Passive', mpn: 'RC0402' },
  location: { id: 'loc1', name: 'Shelf A', path: 'Office/Shelf A' },
};

beforeEach(() => {
  mockLotCount.mockResolvedValue(1);
  mockLotFindMany.mockResolvedValue([sampleLot]);
  mockLocationFindUnique.mockResolvedValue(null);
  mockLocationFindMany.mockResolvedValue([]);
});

afterEach(() => jest.clearAllMocks());

describe('GET /api/lots', () => {
  it('returns 200 with data, total, limit, and offset', async () => {
    const { status, body } = await callGet();
    expect(status).toBe(200);
    expect(body).toMatchObject({ total: 1, limit: 50, offset: 0 });
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('applies default limit=50 and offset=0', async () => {
    await callGet();
    const arg = mockLotFindMany.mock.calls[0][0];
    expect(arg.take).toBe(50);
    expect(arg.skip).toBe(0);
  });

  it('respects explicit limit and offset', async () => {
    await callGet({ limit: '10', offset: '5' });
    const arg = mockLotFindMany.mock.calls[0][0];
    expect(arg.take).toBe(10);
    expect(arg.skip).toBe(5);
  });

  it('caps limit at 500', async () => {
    await callGet({ limit: '9999' });
    const arg = mockLotFindMany.mock.calls[0][0];
    expect(arg.take).toBe(500);
  });

  it('filters by single status', async () => {
    await callGet({ status: 'in_stock' });
    const arg = mockLotFindMany.mock.calls[0][0];
    const statusFilter = arg.where.AND?.find(
      (c: { status?: unknown }) => c.status !== undefined,
    );
    expect(statusFilter).toMatchObject({ status: { in: ['in_stock'] } });
  });

  it('filters by comma-separated status list', async () => {
    await callGet({ status: 'in_stock,reserved' });
    const arg = mockLotFindMany.mock.calls[0][0];
    const statusFilter = arg.where.AND?.find(
      (c: { status?: unknown }) => c.status !== undefined,
    );
    expect(statusFilter?.status?.in).toEqual(['in_stock', 'reserved']);
  });

  it('adds q OR search across part.name, part.mpn, notes, source, location.name', async () => {
    await callGet({ q: 'resis' });
    const arg = mockLotFindMany.mock.calls[0][0];
    const qFilter = arg.where.AND?.find(
      (c: { OR?: unknown }) => Array.isArray(c.OR),
    );
    expect(qFilter).toBeDefined();
    const keys = qFilter.OR.map((c: Record<string, unknown>) => {
      const key = Object.keys(c)[0];
      return key === 'part' || key === 'location' ? `${key}.${Object.keys(c[key] as Record<string, unknown>)[0]}` : key;
    });
    expect(keys).toEqual(expect.arrayContaining(['part.name', 'part.mpn', 'notes', 'source', 'location.name']));
  });

  it('filters by projectId via allocations relation', async () => {
    await callGet({ projectId: 'proj1' });
    const arg = mockLotFindMany.mock.calls[0][0];
    const projFilter = arg.where.AND?.find(
      (c: { allocations?: unknown }) => c.allocations !== undefined,
    );
    expect(projFilter).toMatchObject({ allocations: { some: { projectId: 'proj1' } } });
  });

  it('returns empty result when locationId is unknown', async () => {
    mockLocationFindUnique.mockResolvedValue(null);
    const { status, body } = await callGet({ locationId: 'unknown' });
    expect(status).toBe(200);
    expect(body).toMatchObject({ data: [], total: 0 });
    expect(mockLotFindMany).not.toHaveBeenCalled();
  });

  it('includes child locations when filtering by locationId', async () => {
    mockLocationFindUnique.mockResolvedValue({ id: 'loc1', path: 'Office/Shelf A' });
    mockLocationFindMany.mockResolvedValue([{ id: 'loc1' }, { id: 'loc2' }]);

    await callGet({ locationId: 'loc1' });

    // location.findMany should be called with path startsWith
    const locationFindManyArg = mockLocationFindMany.mock.calls[0][0];
    expect(locationFindManyArg.where.path.startsWith).toBe('Office/Shelf A');

    // lot query should include both child location IDs
    const lotArg = mockLotFindMany.mock.calls[0][0];
    const locFilter = lotArg.where.AND?.find(
      (c: { locationId?: unknown }) => c.locationId !== undefined,
    );
    expect(locFilter?.locationId?.in).toEqual(expect.arrayContaining(['loc1', 'loc2']));
  });

  it('parses source JSON object in response', async () => {
    const { body } = await callGet();
    expect(body.data[0].source).toEqual({ supplier: 'Mouser', url: 'https://mouser.com' });
  });

  it('handles malformed source JSON gracefully (returns {})', async () => {
    mockLotFindMany.mockResolvedValue([{ ...sampleLot, source: 'not-json' }]);
    const { body } = await callGet();
    expect(body.data[0].source).toEqual({});
  });

  it('includes part and location in findMany query', async () => {
    await callGet();
    const arg = mockLotFindMany.mock.calls[0][0];
    expect(arg.include).toBeDefined();
    expect(arg.include.part).toBeDefined();
    expect(arg.include.location).toBeDefined();
  });

  it('passes same where clause to count and findMany', async () => {
    await callGet({ status: 'reserved' });
    const countArg = mockLotCount.mock.calls[0][0];
    const findManyArg = mockLotFindMany.mock.calls[0][0];
    expect(countArg.where).toEqual(findManyArg.where);
  });
});
