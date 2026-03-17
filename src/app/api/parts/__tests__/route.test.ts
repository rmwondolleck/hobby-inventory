import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.part.findMany as jest.Mock;
const mockCount = prisma.part.count as jest.Mock;
const mockCreate = prisma.part.create as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const basePart = {
  id: 'cltest001',
  name: 'Test Resistor',
  category: 'Resistors',
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

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
});

// ─── GET /api/parts ───────────────────────────────────────────────────────────

describe('GET /api/parts', () => {
  it('returns 200 with data array, total, limit, and offset', async () => {
    mockFindMany.mockResolvedValue([basePart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
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

  it('returns empty data array when no parts match', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('filters by category query param', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?category=Resistors'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ category: 'Resistors' });
  });

  it('filters archived parts when ?archived=true', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?archived=true'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ archivedAt: { not: null } });
  });

  it('filters non-archived parts when ?archived=false', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?archived=false'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ archivedAt: null });
  });

  it('adds OR search filter when ?search is provided', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeRequest('http://localhost/api/parts?search=resistor'));

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
    expect(callArgs.where.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: 'resistor' } },
        { manufacturer: { contains: 'resistor' } },
      ])
    );
  });

  it('gracefully handles malformed tags JSON (returns empty array)', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, tags: 'not-valid-json' }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].tags).toEqual([]);
  });

  it('gracefully handles malformed parameters JSON (returns empty object)', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, parameters: '{broken' }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].parameters).toEqual({});
  });

  it('returns 500 on database error', async () => {
    mockTransaction.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });

  it('computes totalQuantity from in_stock exact lots', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        { quantity: 10, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
        { quantity: 5, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
        { quantity: 3, quantityMode: 'exact', qualitativeStatus: null, status: 'used_up' },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].totalQuantity).toBe(15);
    expect(json.data[0].lotCount).toBe(3);
  });

  it('computes qualitativeStatuses from in_stock qualitative lots (deduped)', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'plenty', status: 'in_stock' },
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'low', status: 'in_stock' },
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'plenty', status: 'in_stock' },
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'out', status: 'used_up' },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].qualitativeStatuses).toEqual(expect.arrayContaining(['plenty', 'low']));
    expect(json.data[0].qualitativeStatuses).toHaveLength(2);
  });

  it('returns totalQuantity=0, qualitativeStatuses=[], lotCount=0 for parts with no lots', async () => {
    mockFindMany.mockResolvedValue([basePart]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].totalQuantity).toBe(0);
    expect(json.data[0].qualitativeStatuses).toEqual([]);
    expect(json.data[0].lotCount).toBe(0);
  });
});

// ─── GET /api/parts with parameter filters ───────────────────────────────────

describe('GET /api/parts (parameter filters)', () => {
  it('filters parts by boolean parameter (ble=true)', async () => {
    const bleTrue = {
      ...basePart,
      id: 'esp001',
      parameters: '{"ble":true,"wifi":false}',
    };
    const bleFalse = {
      ...basePart,
      id: 'esp002',
      parameters: '{"ble":false,"wifi":true}',
    };
    mockFindMany.mockResolvedValue([bleTrue, bleFalse]);

    const res = await GET(makeRequest('http://localhost/api/parts?parameters.ble=true'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('esp001');
    expect(json.total).toBe(1);
  });

  it('filters parts by string parameter (voltage=3.3V)', async () => {
    const v33 = { ...basePart, id: 'p1', parameters: '{"voltage":"3.3V"}' };
    const v5 = { ...basePart, id: 'p2', parameters: '{"voltage":"5V"}' };
    mockFindMany.mockResolvedValue([v33, v5]);

    const res = await GET(makeRequest('http://localhost/api/parts?parameters.voltage=3.3V'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('p1');
  });

  it('filters parts by numeric parameter', async () => {
    const gpio32 = { ...basePart, id: 'p1', parameters: '{"gpioCount":32}' };
    const gpio16 = { ...basePart, id: 'p2', parameters: '{"gpioCount":16}' };
    mockFindMany.mockResolvedValue([gpio32, gpio16]);

    const res = await GET(makeRequest('http://localhost/api/parts?parameters.gpioCount=32'));
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('p1');
  });

  it('excludes parts missing the filtered parameter key', async () => {
    const noParam = { ...basePart, id: 'p1', parameters: '{"wifi":true}' };
    mockFindMany.mockResolvedValue([noParam]);

    const res = await GET(makeRequest('http://localhost/api/parts?parameters.ble=true'));
    const json = await res.json();

    expect(json.data).toHaveLength(0);
    expect(json.total).toBe(0);
  });

  it('applies pagination to parameter-filtered results', async () => {
    const parts = Array.from({ length: 5 }, (_, i) => ({
      ...basePart,
      id: `p${i}`,
      parameters: '{"ble":true}',
    }));
    mockFindMany.mockResolvedValue(parts);

    const res = await GET(
      makeRequest('http://localhost/api/parts?parameters.ble=true&limit=2&offset=2')
    );
    const json = await res.json();

    expect(json.total).toBe(5);
    expect(json.data).toHaveLength(2);
  });

  it('does not use $transaction for parameter-filtered queries', async () => {
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/parts?parameters.ble=true'));

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });
});

// ─── POST /api/parts ──────────────────────────────────────────────────────────

describe('POST /api/parts', () => {
  it('returns 201 with the created part', async () => {
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew001' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Resistor', category: 'Resistors' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toBe('clnew001');
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ category: 'Resistors' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is empty string', async () => {
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

  it('returns 400 for non-object body', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify([{ name: 'arr' }]),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_body');
  });

  it('returns 400 when tags is not an array', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Part', tags: 'resistor' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when parameters is an array', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Part', parameters: ['invalid'] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when parameters is not an object', async () => {
    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Part', parameters: 'string-param' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('serializes tags and parameters before storing', async () => {
    const returnedPart = {
      ...basePart,
      tags: '["smd","resistor"]',
      parameters: '{"resistance":"100R"}',
    };
    mockCreate.mockResolvedValue(returnedPart);

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SMD Resistor',
        tags: ['smd', 'resistor'],
        parameters: { resistance: '100R' },
      }),
    });

    await POST(req);

    const createArgs = mockCreate.mock.calls[0][0].data;
    expect(createArgs.tags).toBe('["smd","resistor"]');
    expect(createArgs.parameters).toBe('{"resistance":"100R"}');
  });

  it('parses tags and parameters in the response', async () => {
    mockCreate.mockResolvedValue({
      ...basePart,
      tags: '["smd","resistor"]',
      parameters: '{"resistance":"100R"}',
    });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'SMD Resistor', tags: ['smd', 'resistor'] }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.tags).toEqual(['smd', 'resistor']);
    expect(json.parameters).toEqual({ resistance: '100R' });
  });

  it('defaults tags to [] and parameters to {} when omitted', async () => {
    mockCreate.mockResolvedValue({ ...basePart, tags: '[]', parameters: '{}' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bare Part' }),
    });

    await POST(req);

    const createArgs = mockCreate.mock.calls[0][0].data;
    expect(createArgs.tags).toBe('[]');
    expect(createArgs.parameters).toBe('{}');
  });

  it('returns 500 on database error', async () => {
    mockCreate.mockRejectedValue(new Error('DB failure'));

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Part' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
