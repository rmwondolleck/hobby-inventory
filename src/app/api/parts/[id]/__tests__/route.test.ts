import { GET, PATCH, DELETE } from '../route';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.part.findUnique as jest.Mock;
const mockUpdate = prisma.part.update as jest.Mock;
const mockCategoryFindUnique = prisma.category.findUnique as jest.Mock;
const mockCategoryUpsert = prisma.category.upsert as jest.Mock;

const basePart = {
  id: 'cltest001',
  name: 'Test Resistor',
  category: 'passive',
  categoryId: null,
  categoryRecord: null,
  manufacturer: 'Yageo',
  mpn: 'RC0402FR-0710KL',
  tags: '["resistor","0402"]',
  parameters: '{"resistance":"10k"}',
  notes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCategoryFindUnique.mockResolvedValue(null);
  mockCategoryUpsert.mockResolvedValue({ id: 'cat001', name: 'passive', parameterSchema: '{}' });
});

// ─── GET /api/parts/[id] ──────────────────────────────────────────────────────

describe('GET /api/parts/[id]', () => {
  it('returns computed stock fields for the part (available/reserved/inUse/scrapped)', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePart,
      lots: [
        {
          id: 'lot001',
          partId: 'cltest001',
          source: '{}',
          quantity: 15,
          quantityMode: 'exact',
          qualitativeStatus: null,
          status: 'in_stock',
          location: null,
          allocations: [
            { quantity: 4, status: 'reserved', project: { id: 'proj1', name: 'Project A', status: 'active' } },
            { quantity: 2, status: 'in_use', project: { id: 'proj2', name: 'Project B', status: 'active' } },
          ],
        },
        {
          id: 'lot002',
          partId: 'cltest001',
          source: '{}',
          quantity: 5,
          quantityMode: 'exact',
          qualitativeStatus: null,
          status: 'scrapped',
          location: null,
          allocations: [],
        },
      ],
    });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.totalQuantity).toBe(15);
    expect(json.data.availableQuantity).toBe(9); // 15 - 4 - 2
    expect(json.data.reservedQuantity).toBe(4);
    expect(json.data.inUseQuantity).toBe(2);
    expect(json.data.scrappedQuantity).toBe(5);
    expect(json.data.lotCount).toBe(2);
  });

  it('returns zero stock fields for a part with no lots', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, lots: [] });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.totalQuantity).toBe(0);
    expect(json.data.availableQuantity).toBe(0);
    expect(json.data.reservedQuantity).toBe(0);
    expect(json.data.inUseQuantity).toBe(0);
    expect(json.data.scrappedQuantity).toBe(0);
  });

  it('returns 200 with part data including parsed tags/parameters', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePart,
      lots: [],
    });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe('cltest001');
    expect(json.data.tags).toEqual(['resistor', '0402']);
    expect(json.data.parameters).toEqual({ resistance: '10k' });
  });

  it('returns 404 when part does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/parts/nonexistent'), makeParams('nonexistent'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('includes nested lots with parsed source field', async () => {
    const lot = {
      id: 'lot001',
      partId: 'cltest001',
      source: '{"vendor":"Mouser"}',
      quantity: 10,
      location: { id: 'loc001', name: 'Bin A', path: '/shelf/bin-a' },
      allocations: [],
    };
    mockFindUnique.mockResolvedValue({ ...basePart, lots: [lot] });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.lots).toHaveLength(1);
    expect(json.data.lots[0].source).toEqual({ vendor: 'Mouser' });
  });

  it('handles malformed tags JSON gracefully (returns [])', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, tags: 'bad-json', lots: [] });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.tags).toEqual([]);
  });

  it('handles malformed parameters JSON gracefully (returns {})', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, parameters: '{bad}', lots: [] });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.parameters).toEqual({});
  });
});

// ─── PATCH /api/parts/[id] ────────────────────────────────────────────────────

describe('PATCH /api/parts/[id]', () => {
  it('returns 200 with updated part on valid input', async () => {
    const updated = { ...basePart, name: 'Updated Name' };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    const res = await PATCH(req, makeParams('cltest001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.name).toBe('Updated Name');
  });

  it('returns 404 when part does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/parts/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const res = await PATCH(req, makeParams('nonexistent'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockFindUnique.mockResolvedValue(basePart);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, makeParams('cltest001'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('returns 400 when name is set to empty string', async () => {
    mockFindUnique.mockResolvedValue(basePart);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    });

    const res = await PATCH(req, makeParams('cltest001'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('allows setting nullable fields to null', async () => {
    const updated = { ...basePart, category: null, manufacturer: null };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ category: null, manufacturer: null }),
    });

    const res = await PATCH(req, makeParams('cltest001'));
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: null, manufacturer: null }),
      })
    );
  });

  it('serializes tags array to JSON string when updating', async () => {
    const updated = { ...basePart, tags: '["new-tag"]' };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ tags: ['new-tag'] }),
    });

    await PATCH(req, makeParams('cltest001'));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: '["new-tag"]' }),
      })
    );
  });

  it('returns parsed tags/parameters in the response', async () => {
    const updated = { ...basePart, tags: '["updated"]', parameters: '{"v":"1"}' };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ tags: ['updated'], parameters: { v: '1' } }),
    });

    const res = await PATCH(req, makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.tags).toEqual(['updated']);
    expect(json.data.parameters).toEqual({ v: '1' });
  });
});

// ─── DELETE /api/parts/[id] ───────────────────────────────────────────────────

describe('DELETE /api/parts/[id]', () => {
  it('returns 200 and soft-deletes part by setting archivedAt', async () => {
    const archivedPart = { ...basePart, archivedAt: new Date('2024-06-01') };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(archivedPart);

    const res = await DELETE(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.archivedAt).toBeDefined();
  });

  it('calls prisma update with archivedAt set to a Date', async () => {
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue({ ...basePart, archivedAt: new Date() });

    await DELETE(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      })
    );
  });

  it('returns 404 when part does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(new Request('http://localhost/api/parts/nonexistent'), makeParams('nonexistent'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 409 when part is already archived', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, archivedAt: new Date('2024-01-15') });

    const res = await DELETE(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error).toBe('already_archived');
  });

  it('returns parsed tags/parameters in the deleted part response', async () => {
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue({ ...basePart, archivedAt: new Date() });

    const res = await DELETE(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.tags).toEqual(['resistor', '0402']);
    expect(json.data.parameters).toEqual({ resistance: '10k' });
  });
});

// ─── GET /api/parts/[id] — categoryRecord field ───────────────────────────────

describe('GET /api/parts/[id] (categoryRecord)', () => {
  it('includes categoryRecord: null when part has no linked category', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, lots: [], categoryRecord: null });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.categoryRecord).toBeNull();
  });

  it('includes categoryRecord with parsed parameterSchema when linked', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePart,
      lots: [],
      categoryId: 'cat001',
      categoryRecord: { id: 'cat001', name: 'Resistors', parameterSchema: '{"resistance":{"type":"string"}}' },
    });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.categoryRecord).toEqual({
      id: 'cat001',
      name: 'Resistors',
      parameterSchema: { resistance: { type: 'string' } },
    });
  });

  it('gracefully handles malformed categoryRecord.parameterSchema (returns {})', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePart,
      lots: [],
      categoryRecord: { id: 'cat001', name: 'Resistors', parameterSchema: '{bad-json}' },
    });

    const res = await GET(new Request('http://localhost/api/parts/cltest001'), makeParams('cltest001'));
    const json = await res.json();

    expect(json.data.categoryRecord.parameterSchema).toEqual({});
  });
});

// ─── PATCH /api/parts/[id] — category sync ───────────────────────────────────

describe('PATCH /api/parts/[id] (category sync)', () => {
  it('syncs category string when categoryId is provided', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat001', name: 'Capacitors', parameterSchema: '{}' });
    const updated = { ...basePart, categoryId: 'cat001', category: 'Capacitors' };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ categoryId: 'cat001' }),
    });

    await PATCH(req, makeParams('cltest001'));

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: 'cat001', category: 'Capacitors' }),
    }));
  });

  it('does not overwrite explicit category when both categoryId and category are provided', async () => {
    mockCategoryFindUnique.mockResolvedValue({ id: 'cat001', name: 'Capacitors', parameterSchema: '{}' });
    const updated = { ...basePart, categoryId: 'cat001', category: 'My Override' };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ categoryId: 'cat001', category: 'My Override' }),
    });

    await PATCH(req, makeParams('cltest001'));

    // category should come from explicit body, not from the fetched record
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: 'cat001', category: 'My Override' }),
    }));
  });

  it('upserts category and sets categoryId when only category string is provided', async () => {
    mockCategoryUpsert.mockResolvedValue({ id: 'cat002', name: 'Sensors', parameterSchema: '{}' });
    const updated = { ...basePart, categoryId: 'cat002', category: 'Sensors' };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ category: 'Sensors' }),
    });

    await PATCH(req, makeParams('cltest001'));

    expect(mockCategoryUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: 'Sensors' },
    }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: 'cat002', category: 'Sensors' }),
    }));
  });

  it('clears categoryId when categoryId: null is provided', async () => {
    const updated = { ...basePart, categoryId: null };
    mockFindUnique.mockResolvedValue({ ...basePart, categoryId: 'cat001' });
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ categoryId: null }),
    });

    await PATCH(req, makeParams('cltest001'));

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ categoryId: null }),
    }));
  });

  it('does not upsert category when category: null is provided', async () => {
    const updated = { ...basePart, category: null };
    mockFindUnique.mockResolvedValue(basePart);
    mockUpdate.mockResolvedValue(updated);

    const req = new Request('http://localhost/api/parts/cltest001', {
      method: 'PATCH',
      body: JSON.stringify({ category: null }),
    });

    await PATCH(req, makeParams('cltest001'));

    expect(mockCategoryUpsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ category: null }),
    }));
  });
});
