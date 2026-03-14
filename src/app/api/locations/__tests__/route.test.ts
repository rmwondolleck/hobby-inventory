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
    location: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockCount = prisma.location.count as jest.Mock;
const mockFindMany = prisma.location.findMany as jest.Mock;

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/locations');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

async function callGet(params: Record<string, string> = {}) {
  const res = await GET(makeRequest(params));
  return { status: res.status, body: await res.json() };
}

const sampleLocation = {
  id: 'loc1',
  name: 'Shelf A',
  parentId: null,
  path: 'Office/Shelf A',
  notes: 'main shelf',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  mockCount.mockResolvedValue(2);
  mockFindMany.mockResolvedValue([sampleLocation]);
});

afterEach(() => jest.clearAllMocks());

describe('GET /api/locations', () => {
  it('returns 200 with data, total, limit, and offset', async () => {
    const { status, body } = await callGet();
    expect(status).toBe(200);
    expect(body).toMatchObject({ total: 2, limit: 50, offset: 0 });
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('applies default limit=50 and offset=0', async () => {
    await callGet();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.take).toBe(50);
    expect(arg.skip).toBe(0);
  });

  it('respects explicit limit and offset', async () => {
    await callGet({ limit: '5', offset: '10' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.take).toBe(5);
    expect(arg.skip).toBe(10);
  });

  it('caps limit at 500', async () => {
    await callGet({ limit: '9999' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.take).toBe(500);
  });

  it('uses empty where clause when no q provided', async () => {
    await callGet();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where).toEqual({});
  });

  it('adds OR text search across name, path, notes when q is provided', async () => {
    await callGet({ q: 'shelf' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where).toHaveProperty('OR');
    const fields = arg.where.OR.map((c: Record<string, unknown>) => Object.keys(c)[0]);
    expect(fields).toEqual(expect.arrayContaining(['name', 'path', 'notes']));
  });

  it('orders results by path ascending', async () => {
    await callGet();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.orderBy).toEqual({ path: 'asc' });
  });

  it('passes same where clause to count and findMany', async () => {
    await callGet({ q: 'office' });
    const countArg = mockCount.mock.calls[0][0];
    const findManyArg = mockFindMany.mock.calls[0][0];
    expect(countArg.where).toEqual(findManyArg.where);
  });

  it('clamps negative offset to 0', async () => {
    await callGet({ offset: '-5' });
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.skip).toBe(0);
  });
});
