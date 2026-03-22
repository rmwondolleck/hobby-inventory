import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.part.findMany as jest.Mock;
const mockCount = prisma.part.count as jest.Mock;
const mockCreate = prisma.part.create as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockCategoryFindUnique = prisma.category.findUnique as jest.Mock;
const mockCategoryUpsert = prisma.category.upsert as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const basePart = {
  id: 'cltest001',
  name: 'Test Resistor',
  category: 'Resistors',
  categoryId: null,
  categoryRecord: null,
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
  mockCategoryUpsert.mockResolvedValue({ id: 'cat001', name: 'Resistors', parameterSchema: '{}' });
  mockCategoryFindUnique.mockResolvedValue(null);
});

// ─── GET /api/parts ───────────────────────────────────────────────────────────

describe('GET /api/parts', () => {
  it('returns computed stock fields (available/reserved/inUse/scrapped) in each part', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        {
          quantity: 20,
          quantityMode: 'exact',
          qualitativeStatus: null,
          status: 'in_stock',
          allocations: [
            { quantity: 5, status: 'reserved' },
            { quantity: 3, status: 'in_use' },
          ],
        },
        {
          quantity: 4,
          quantityMode: 'exact',
          qualitativeStatus: null,
          status: 'scrapped',
          allocations: [],
        },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();
    const part = json.data[0];

    expect(part.totalQuantity).toBe(20);
    expect(part.availableQuantity).toBe(12); // 20 - 5 - 3
    expect(part.reservedQuantity).toBe(5);
    expect(part.inUseQuantity).toBe(3);
    expect(part.scrappedQuantity).toBe(4);
    expect(part.lotCount).toBe(2);
  });

  it('returns zero stock counts for parts with no lots', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, lots: [] }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();
    const part = json.data[0];

    expect(part.totalQuantity).toBe(0);
    expect(part.availableQuantity).toBe(0);
    expect(part.reservedQuantity).toBe(0);
    expect(part.inUseQuantity).toBe(0);
    expect(part.scrappedQuantity).toBe(0);
  });

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

  it('handles mixed exact and qualitative in_stock lots independently', async () => {
    const partWithLots = {
      ...basePart,
      lots: [
        { quantity: 20, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'low', status: 'in_stock' },
        { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'low', status: 'in_stock' },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].totalQuantity).toBe(20);
    expect(json.data[0].qualitativeStatuses).toEqual(['low']);
    expect(json.data[0].lotCount).toBe(3);
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

  it('computes stock fields via parameter-filter path', async () => {
    const partWithLots = {
      ...basePart,
      parameters: '{"ble":true}',
      lots: [
        { quantity: 7, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
      ],
    };
    mockFindMany.mockResolvedValue([partWithLots]);

    const res = await GET(makeRequest('http://localhost/api/parts?parameters.ble=true'));
    const json = await res.json();

    expect(json.data[0].totalQuantity).toBe(7);
    expect(json.data[0].lotCount).toBe(1);
    expect(json.data[0].qualitativeStatuses).toEqual([]);
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

  it('accepts categoryId and syncs category string from the fetched record', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat001', name: 'Resistors', parameterSchema: '{}' });
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew002', categoryId: 'cat001', category: 'Resistors' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'R1', categoryId: 'cat001' }),
    });

    await POST(req);

    const createArgs = mockCreate.mock.calls[0][0].data;
    expect(createArgs.categoryId).toBe('cat001');
    expect(createArgs.category).toBe('Resistors');
    expect(mockCategoryUpsert).not.toHaveBeenCalled();
  });

  it('accepts category string and upserts category, setting categoryId', async () => {
    mockCategoryUpsert.mockResolvedValue({ id: 'cat002', name: 'Capacitors', parameterSchema: '{}' });
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew003', categoryId: 'cat002', category: 'Capacitors' });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'C1', category: 'Capacitors' }),
    });

    await POST(req);

    expect(mockCategoryUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: 'Capacitors' },
    }));
    const createArgs = mockCreate.mock.calls[0][0].data;
    expect(createArgs.categoryId).toBe('cat002');
    expect(createArgs.category).toBe('Capacitors');
  });

  it('sets category/categoryId to null when neither is provided', async () => {
    mockCreate.mockResolvedValue({ ...basePart, id: 'clnew004', categoryId: null, category: null });

    const req = makeRequest('http://localhost/api/parts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bare Part 2' }),
    });

    await POST(req);

    const createArgs = mockCreate.mock.calls[0][0].data;
    expect(createArgs.categoryId).toBeNull();
    expect(createArgs.category).toBeNull();
    expect(mockCategoryUpsert).not.toHaveBeenCalled();
    expect(mockCategoryFindUnique).not.toHaveBeenCalled();
  });
});

<<<<<<< HEAD
=======
// ─── GET /api/parts — categoryRecord field ────────────────────────────────────

describe('GET /api/parts (categoryRecord)', () => {
  it('includes categoryRecord: null when part has no category', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, categoryRecord: null }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].categoryRecord).toBeNull();
  });

  it('includes categoryRecord with parsed parameterSchema when linked', async () => {
    const partWithCategory = {
      ...basePart,
      categoryId: 'cat001',
      categoryRecord: {
        id: 'cat001',
        name: 'Resistors',
        parameterSchema: '{"resistance":{"type":"string"}}',
      },
    };
    mockFindMany.mockResolvedValue([partWithCategory]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].categoryRecord).toEqual({
      id: 'cat001',
      name: 'Resistors',
      parameterSchema: { resistance: { type: 'string' } },
    });
  });

  it('gracefully handles malformed categoryRecord.parameterSchema (returns {})', async () => {
    const partWithBadSchema = {
      ...basePart,
      categoryId: 'cat001',
      categoryRecord: { id: 'cat001', name: 'Resistors', parameterSchema: '{bad-json}' },
    };
    mockFindMany.mockResolvedValue([partWithBadSchema]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0].categoryRecord.parameterSchema).toEqual({});
  });
});

>>>>>>> 0313f5536172027576396e889fbee9f9295007f4
// ─── GET /api/parts — tags filter ─────────────────────────────────────────────

describe('GET /api/parts — tags filter', () => {
  const wifiPart = {
    ...basePart,
    id: 'clwifi001',
    name: 'ESP32',
    tags: '["wifi","bluetooth","microcontroller"]',
    parameters: '{}',
  };
  const btOnlyPart = {
    ...basePart,
    id: 'clbt001',
    name: 'nRF52840',
    tags: '["bluetooth","microcontroller"]',
    parameters: '{}',
  };
  const untaggedPart = {
    ...basePart,
    id: 'cluntag001',
    name: 'Resistor',
    tags: '["resistor"]',
    parameters: '{}',
  };

  it('returns only parts matching a single tag filter', async () => {
    mockFindMany.mockResolvedValue([wifiPart, btOnlyPart, untaggedPart]);

    const res = await GET(makeRequest('http://localhost/api/parts?tags=wifi'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('clwifi001');
    expect(json.total).toBe(1);
  });

  it('returns only parts matching ALL tags in a multi-tag AND filter', async () => {
    mockFindMany.mockResolvedValue([wifiPart, btOnlyPart, untaggedPart]);

    const res = await GET(makeRequest('http://localhost/api/parts?tags=wifi,bluetooth'));
    expect(res.status).toBe(200);

    const json = await res.json();
    // Only wifiPart has both wifi AND bluetooth
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('clwifi001');
    expect(json.total).toBe(1);
  });

  it('returns all parts when no tags param is provided (no regression)', async () => {
    mockFindMany.mockResolvedValue([wifiPart, btOnlyPart, untaggedPart]);
    mockCount.mockResolvedValue(3);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(3);
    expect(json.total).toBe(3);
  });

  it('applies tag filter together with category filter', async () => {
    const sensorWifi = {
      ...basePart,
      id: 'clsensor001',
      name: 'Sensor',
      category: 'Sensors',
      tags: '["wifi","sensor"]',
      parameters: '{}',
    };
    // mockFindMany already applies the category WHERE clause server-side;
    // simulate it returning only Sensors-category parts
    mockFindMany.mockResolvedValue([sensorWifi]);

    const res = await GET(makeRequest('http://localhost/api/parts?tags=wifi&category=Sensors'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('clsensor001');
  });

  it('returns empty data when no parts match the tag filter', async () => {
    mockFindMany.mockResolvedValue([untaggedPart]);

    const res = await GET(makeRequest('http://localhost/api/parts?tags=nonexistent'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(0);
    expect(json.total).toBe(0);
  });
});

