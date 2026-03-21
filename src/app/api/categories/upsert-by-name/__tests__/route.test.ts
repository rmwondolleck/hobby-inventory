import { POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    category: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.category.findUnique as jest.Mock;
const mockCreate = prisma.category.create as jest.Mock;

function makeRequest(options?: RequestInit): Request {
  return new Request('http://localhost/api/categories/upsert-by-name', options);
}

const baseCategory = {
  id: 'cat001',
  name: 'Resistors',
  parameterSchema: '{"resistance":{"type":"string"}}',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/categories/upsert-by-name ─────────────────────────────────────

describe('POST /api/categories/upsert-by-name', () => {
  it('returns 200 with existing category when name already exists', async () => {
    mockFindUnique.mockResolvedValue(baseCategory);

    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors' }),
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('cat001');
    expect(json.name).toBe('Resistors');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('parses parameterSchema for found category', async () => {
    mockFindUnique.mockResolvedValue(baseCategory);

    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors' }),
    }));

    const json = await res.json();
    expect(json.parameterSchema).toEqual({ resistance: { type: 'string' } });
  });

  it('returns 201 and creates category when name does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ ...baseCategory, id: 'cat-new', name: 'MyCategory', parameterSchema: '{}' });

    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'MyCategory' }),
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('cat-new');
    expect(json.name).toBe('MyCategory');
  });

  it('uses default template schema when creating a known category name', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      ...baseCategory,
      name: 'ESP32 Boards',
      parameterSchema: '{"ble":{"type":"boolean"},"wifi":{"type":"boolean"}}',
    });

    await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'ESP32 Boards' }),
    }));

    const createArgs = mockCreate.mock.calls[0][0].data;
    const parsed = JSON.parse(createArgs.parameterSchema);
    expect(parsed).toHaveProperty('ble');
    expect(parsed.ble).toEqual({ type: 'boolean' });
    expect(parsed).toHaveProperty('wifi');
  });

  it('uses empty schema when creating a category with no default template', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ ...baseCategory, name: 'Widgets', parameterSchema: '{}' });

    await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'Widgets' }),
    }));

    const createArgs = mockCreate.mock.calls[0][0].data;
    expect(JSON.parse(createArgs.parameterSchema)).toEqual({});
  });

  it('parses parameterSchema for created category', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      ...baseCategory,
      name: 'Resistors',
      parameterSchema: '{"resistance":{"type":"string"},"tolerance":{"type":"string"}}',
    });

    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors' }),
    }));

    const json = await res.json();
    expect(json.parameterSchema).toEqual({
      resistance: { type: 'string' },
      tolerance: { type: 'string' },
    });
  });

  it('trims whitespace from name before lookup and create', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ ...baseCategory, name: 'Trimmed', parameterSchema: '{}' });

    await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: '  Trimmed  ' }),
    }));

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { name: 'Trimmed' } });
    expect(mockCreate.mock.calls[0][0].data.name).toBe('Trimmed');
  });

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(new Request('http://localhost/api/categories/upsert-by-name', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('returns 400 for non-object body (array)', async () => {
    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify([{ name: 'Resistors' }]),
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_body');
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is empty string', async () => {
    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when name is not a string', async () => {
    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 42 }),
    }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 500 on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await POST(makeRequest({
      method: 'POST',
      body: JSON.stringify({ name: 'Resistors' }),
    }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
