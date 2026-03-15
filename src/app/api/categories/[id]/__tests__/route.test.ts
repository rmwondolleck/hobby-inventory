import { GET, PATCH } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    category: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.category.findUnique as jest.Mock;
const mockUpdate = prisma.category.update as jest.Mock;

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

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
});

// ─── GET /api/categories/[id] ─────────────────────────────────────────────────

describe('GET /api/categories/[id]', () => {
  it('returns 200 with category data', async () => {
    mockFindUnique.mockResolvedValue(baseCategory);

    const res = await GET(makeRequest('http://localhost/api/categories/cat001'), makeContext('cat001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe('cat001');
    expect(json.name).toBe('Resistors');
  });

  it('parses parameterSchema JSON string into an object', async () => {
    mockFindUnique.mockResolvedValue(baseCategory);

    const res = await GET(makeRequest('http://localhost/api/categories/cat001'), makeContext('cat001'));
    const json = await res.json();

    expect(json.parameterSchema).toEqual({
      resistance: { type: 'string' },
      tolerance: { type: 'string', options: ['1%', '5%', '10%'] },
    });
  });

  it('returns 404 when category does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/categories/missing'), makeContext('missing'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 500 on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/categories/cat001'), makeContext('cat001'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });

  it('queries with the correct id', async () => {
    mockFindUnique.mockResolvedValue(baseCategory);

    await GET(makeRequest('http://localhost/api/categories/cat001'), makeContext('cat001'));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'cat001' } });
  });
});

// ─── PATCH /api/categories/[id] ───────────────────────────────────────────────

describe('PATCH /api/categories/[id]', () => {
  it('returns 200 with updated category when name is changed', async () => {
    mockUpdate.mockResolvedValue({ ...baseCategory, name: 'Updated Resistors' });

    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Resistors' }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.name).toBe('Updated Resistors');
  });

  it('returns 200 with updated category when parameterSchema is changed', async () => {
    const newSchema = { resistance: { type: 'string' } };
    mockUpdate.mockResolvedValue({
      ...baseCategory,
      parameterSchema: JSON.stringify(newSchema),
    });

    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ parameterSchema: newSchema }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.parameterSchema).toEqual(newSchema);
  });

  it('returns 400 when no valid fields are provided', async () => {
    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is an empty string', async () => {
    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  ' }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when parameterSchema is an array', async () => {
    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ parameterSchema: ['invalid'] }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when parameterSchema is not an object', async () => {
    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ parameterSchema: 'string-value' }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('returns 404 when category does not exist (P2025)', async () => {
    const error = Object.assign(new Error('Record not found'), { code: 'P2025' });
    mockUpdate.mockRejectedValue(error);

    const req = makeRequest('http://localhost/api/categories/missing', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const res = await PATCH(req, makeContext('missing'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 409 when name conflicts with an existing category (P2002)', async () => {
    const error = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    mockUpdate.mockRejectedValue(error);

    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Capacitors' }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('conflict');
  });

  it('returns 500 on unexpected database error', async () => {
    mockUpdate.mockRejectedValue(new Error('DB failure'));

    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Valid Name' }),
    });

    const res = await PATCH(req, makeContext('cat001'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });

  it('trims whitespace from name before updating', async () => {
    mockUpdate.mockResolvedValue({ ...baseCategory, name: 'Trimmed Name' });

    const req = makeRequest('http://localhost/api/categories/cat001', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  Trimmed Name  ' }),
    });

    await PATCH(req, makeContext('cat001'));

    const updateArgs = mockUpdate.mock.calls[0][0].data;
    expect(updateArgs.name).toBe('Trimmed Name');
  });
});
