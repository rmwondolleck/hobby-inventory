import { GET } from '../route';

// Mock next/server so tests don't require a full Next.js runtime
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}));

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockCount = prisma.part.count as jest.Mock;
const mockFindMany = prisma.part.findMany as jest.Mock;

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/parts');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

async function callGet(params: Record<string, string> = {}) {
  const res = await GET(makeRequest(params));
  return { status: res.status, body: await res.json() };
}

const samplePart = {
  id: 'p1',
  name: 'Resistor',
  category: 'Passive',
  manufacturer: 'Yageo',
  mpn: 'RC0402',
  tags: '["resistor","smd"]',
  notes: 'test note',
  parameters: '{"resistance":"10k"}',
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
};

beforeEach(() => {
  mockCount.mockResolvedValue(1);
  mockFindMany.mockResolvedValue([samplePart]);
});

afterEach(() => jest.clearAllMocks());

describe('GET /api/parts', () => {
  it('returns 200 with data, total, limit, and offset', async () => {
    const { status, body } = await callGet();
    expect(status).toBe(200);
    expect(body).toMatchObject({ total: 1, limit: 50, offset: 0 });
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('applies default limit=50 and offset=0', async () => {
    await callGet();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.take).toBe(50);
    expect(arg.skip).toBe(0);
  });

  it('respects explicit limit and offset', async () => {
    await callGet({ limit: '10', offset: '20' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.take).toBe(10);
    expect(arg.skip).toBe(20);
  });

  it('caps limit at 500', async () => {
    await callGet({ limit: '9999' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.take).toBe(500);
  });

  it('always filters archivedAt: null', async () => {
    await callGet();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where.archivedAt).toBeNull();
  });

  it('adds category exact-match filter when provided', async () => {
    await callGet({ category: 'Passive' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where.category).toBe('Passive');
  });

  it('adds OR text search when q is provided', async () => {
    await callGet({ q: 'res' });
    const arg = mockFindMany.mock.calls[0][0];
    const orClause = arg.where.AND?.find((c: { OR?: unknown }) => Array.isArray(c.OR));
    expect(orClause).toBeDefined();
    const fields = orClause.OR.map((c: Record<string, unknown>) => Object.keys(c)[0]);
    expect(fields).toEqual(expect.arrayContaining(['name', 'mpn', 'manufacturer', 'tags', 'notes']));
  });

  it('adds LIKE filter per tag when tags param is provided', async () => {
    await callGet({ tags: 'smd,resistor' });
    const arg = mockFindMany.mock.calls[0][0];
    const tagFilters = arg.where.AND?.filter(
      (c: { tags?: unknown }) => c.tags !== undefined,
    );
    expect(tagFilters).toHaveLength(2);
  });

  it('parses tags JSON array in response', async () => {
    const { body } = await callGet();
    expect(body.data[0].tags).toEqual(['resistor', 'smd']);
  });

  it('parses parameters JSON object in response', async () => {
    const { body } = await callGet();
    expect(body.data[0].parameters).toEqual({ resistance: '10k' });
  });

  it('handles malformed tags JSON gracefully (returns [])', async () => {
    mockFindMany.mockResolvedValue([{ ...samplePart, tags: 'not-json' }]);
    const { body } = await callGet();
    expect(body.data[0].tags).toEqual([]);
  });

  it('handles malformed parameters JSON gracefully (returns {})', async () => {
    mockFindMany.mockResolvedValue([{ ...samplePart, parameters: 'not-json' }]);
    const { body } = await callGet();
    expect(body.data[0].parameters).toEqual({});
  });

  it('combines q and category together', async () => {
    await callGet({ q: 'res', category: 'Passive' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where.category).toBe('Passive');
    expect(arg.where.AND).toBeDefined();
  });

  it('passes both count and findMany the same where clause', async () => {
    await callGet({ category: 'Active' });
    const countArg = mockCount.mock.calls[0][0];
    const findManyArg = mockFindMany.mock.calls[0][0];
    expect(countArg.where).toEqual(findManyArg.where);
  });
});
