import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    category: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.category.findMany as jest.Mock;
const mockCount = prisma.category.count as jest.Mock;
const mockCreate = prisma.category.create as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const baseCategory = {
  id: 'cat001',
  name: 'Resistors',
  parameterSchema: '{"resistance":{"type":"string"},"tolerance":{"type":"string","options":["1%","5%","10%"]}}',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTransaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
});

// ─── GET /api/categories ──────────────────────────────────────────────────────

describe('GET /api/categories', () => {
  it('returns 200 with data, total, limit, offset', async () => {
    mockFindMany.mockResolvedValue([baseCategory]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/categories'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('parses parameterSchema JSON string into an object', async () => {
    mockFindMany.mockResolvedValue([baseCategory]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/categories'));
    const json = await res.json();

    expect(json.data[0].parameterSchema).toEqual({
      resistance: { type: 'string' },
      tolerance: { type: 'string', options: ['1%', '5%', '10%'] },
    });
  });

  it('includes defaults for templates not already saved', async () => {
    mockFindMany.mockResolvedValue([baseCategory]); // Only 'Resistors' saved
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/categories'));
    const json = await res.json();

    expect(json.defaults).toBeDefined();
    // 'Resistors' is saved, so it should not appear in defaults
    const defaultNames = json.defaults.map((d: { name: string }) => d.name);
    expect(defaultNames).not.toContain('Resistors');
    // Other templates should appear in defaults
    expect(defaultNames).toContain('ESP32 Boards');
    expect(defaultNames).toContain('Sensors');
  });

  it('defaults have isDefault: true and null id/createdAt/updatedAt', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeRequest('http://localhost/api/categories'));
    const json = await res.json();

    const defaultEntry = json.defaults.find((d: { name: string }) => d.name === 'ESP32 Boards');
    expect(defaultEntry).toBeDefined();
    expect(defaultEntry.isDefault).toBe(true);
    expect(defaultEntry.id).toBeNull();
    expect(defaultEntry.createdAt).toBeNull();
  });

  it('returns empty defaults array when includeDefaults=false', async () => {
    mockFindMany.mockResolvedValue([baseCategory]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/categories?includeDefaults=false'));
    const json = await res.json();

    expect(json.defaults).toEqual([]);
  });

  it('still returns defaults when offset > 0', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(5);

    const res = await GET(makeRequest('http://localhost/api/categories?offset=50'));
    const json = await res.json();

    expect(Array.isArray(json.defaults)).toBe(true);
  });

  it('returns empty defaults when all templates are already saved', async () => {
    const allTemplateNames = ['ESP32 Boards', 'Sensors', 'Filament', 'Resistors', 'Capacitors'];
    const allCategories = allTemplateNames.map((name, i) => ({
      ...baseCategory,
      id: `cat${i}`,
      name,
    }));
    mockFindMany.mockResolvedValue(allCategories);
    mockCount.mockResolvedValue(5);

    const res = await GET(makeRequest('http://localhost/api/categories'));
    const json = await res.json();

    expect(json.defaults).toHaveLength(0);
  });

  it('returns 500 on database error', async () => {
    mockTransaction.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/categories'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});

// ─── POST /api/categories ─────────────────────────────────────────────────────

describe('POST /api/categories', () => {
  it('returns 201 with created category', async () => {
    mockCreate.mockResolvedValue({ ...baseCategory, id: 'cat-new' });

    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors', parameterSchema: {} }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toBe('cat-new');
    expect(json.name).toBe('Resistors');
  });

  it('auto-populates parameterSchema from default templates when name matches', async () => {
    mockCreate.mockResolvedValue({
      ...baseCategory,
      name: 'ESP32 Boards',
      parameterSchema: '{"ble":{"type":"boolean"}}',
    });

    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'ESP32 Boards' }),
    });

    await POST(req);

    const createArgs = mockCreate.mock.calls[0][0].data;
    // parameterSchema should have been set from the default template
    const parsed = JSON.parse(createArgs.parameterSchema);
    expect(parsed).toHaveProperty('ble');
    expect(parsed.ble).toEqual({ type: 'boolean' });
  });

  it('uses provided parameterSchema over default template when both given', async () => {
    mockCreate.mockResolvedValue({ ...baseCategory, name: 'Resistors' });

    const customSchema = { myParam: { type: 'string' } };

    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors', parameterSchema: customSchema }),
    });

    await POST(req);

    const createArgs = mockCreate.mock.calls[0][0].data;
    const parsed = JSON.parse(createArgs.parameterSchema);
    expect(parsed).toEqual(customSchema);
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is empty string', async () => {
    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: '  ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/categories', {
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
    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify([{ name: 'arr' }]),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_body');
  });

  it('returns 409 when category name already exists (P2002)', async () => {
    const error = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockCreate.mockRejectedValue(error);

    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('conflict');
  });

  it('returns 500 on unexpected database error', async () => {
    mockCreate.mockRejectedValue(new Error('DB failure'));

    const req = makeRequest('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Category' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
