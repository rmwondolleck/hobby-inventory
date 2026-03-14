import { GET, POST } from '../route';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockCount = prisma.part.count as jest.Mock;
const mockFindMany = prisma.part.findMany as jest.Mock;
const mockFindFirst = prisma.part.findFirst as jest.Mock;
const mockCreate = prisma.part.create as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

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
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/parts ───────────────────────────────────────────────────────────

describe('GET /api/parts', () => {
  it('returns 200 with data array and total', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([basePart]);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
  });

  it('parses tags and parameters JSON strings into objects', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([basePart]);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual(['resistor', '0402']);
    expect(json.data[0].parameters).toEqual({ resistance: '10k', tolerance: '1%' });
  });

  it('excludes archived parts by default (archivedAt: null filter)', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/parts'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      })
    );
  });

  it('includes archived parts when ?archived=true', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/parts?archived=true'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('archivedAt');
  });

  it('filters by category query param', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/parts?category=passive'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'passive' }),
      })
    );
  });

  it('filters by tags query param using SQL contains filter', async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([basePart]);

    const res = await GET(makeRequest('http://localhost/api/parts?tags=resistor'));
    const json = await res.json();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ tags: { contains: 'resistor' } }),
          ]),
        }),
      })
    );
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('cltest001');
  });

  it('returns empty data array when no parts match', async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('gracefully handles malformed tags JSON (returns empty array)', async () => {
    const badPart = { ...basePart, tags: 'not-valid-json' };
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([badPart]);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual([]);
  });
});

// ─── POST /api/parts ──────────────────────────────────────────────────────────

describe('POST /api/parts', () => {
  it('returns 201 with the created part', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew001' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Resistor', category: 'passive' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.id).toBe('clnew001');
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ category: 'passive' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is an empty string', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/parts', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('includes duplicate_mpn warning when part with same MPN+manufacturer exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'clexisting', name: 'Existing Resistor' });
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew002' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Resistor',
        mpn: 'RC0402FR-0710KL',
        manufacturer: 'Yageo',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.warning).toBeDefined();
    expect(json.warning.code).toBe('duplicate_mpn');
    expect(json.warning.existing.id).toBe('clexisting');
  });

  it('does not include warning when no duplicate exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew003' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unique Resistor',
        mpn: 'UNIQUE-MPN',
        manufacturer: 'Acme',
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.warning).toBeUndefined();
  });

  it('skips duplicate check when mpn or manufacturer is missing', async () => {
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew004' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Part Without MPN' }),
    });

    await POST(req);

    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('serializes tags array and parameters object correctly', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      ...basePart,
      tags: '["smd","resistor"]',
      parameters: '{"resistance":"100R"}',
    });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SMD Resistor',
        tags: ['smd', 'resistor'],
        parameters: { resistance: '100R' },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.data.tags).toEqual(['smd', 'resistor']);
    expect(json.data.parameters).toEqual({ resistance: '100R' });
  });
});
