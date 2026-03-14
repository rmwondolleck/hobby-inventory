import { GET, PATCH, DELETE } from '../route';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.part.findUnique as jest.Mock;
const mockUpdate = prisma.part.update as jest.Mock;

const basePart = {
  id: 'cltest001',
  name: 'Test Resistor',
  category: 'passive',
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
});

// ─── GET /api/parts/[id] ──────────────────────────────────────────────────────

describe('GET /api/parts/[id]', () => {
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
