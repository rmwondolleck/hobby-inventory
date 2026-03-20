/**
 * Tests for Part.categoryId FK field on the /api/parts/[id] route.
 * Verifies the new optional FK is correctly surfaced and not accidentally clobbered.
 */
import { GET, PATCH } from '../route';

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

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const basePart = {
  id: 'cltest001',
  name: 'Test Resistor',
  category: 'Resistors',
  categoryId: null,
  manufacturer: 'Yageo',
  mpn: 'RC0402FR-0710KL',
  tags: '["resistor"]',
  parameters: '{}',
  notes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lots: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/parts/[id] — categoryId passthrough ────────────────────────────

describe('GET /api/parts/[id] — categoryId FK field', () => {
  it('returns categoryId: null in data when part has no linked category record', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, categoryId: null });

    const res = await GET(
      makeRequest('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveProperty('categoryId', null);
  });

  it('returns categoryId in data when part is linked to a category record', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePart,
      categoryId: 'cat-resistors-001',
    });

    const res = await GET(
      makeRequest('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data).toHaveProperty('categoryId', 'cat-resistors-001');
  });

  it('returns both category string and categoryId FK together', async () => {
    mockFindUnique.mockResolvedValue({
      ...basePart,
      category: 'Resistors',
      categoryId: 'cat-resistors-001',
    });

    const res = await GET(
      makeRequest('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data.category).toBe('Resistors');
    expect(json.data.categoryId).toBe('cat-resistors-001');
  });
});

// ─── PATCH /api/parts/[id] — categoryId not clobbered ────────────────────────

describe('PATCH /api/parts/[id] — categoryId FK field', () => {
  it('does not include categoryId in the update payload when patching other fields', async () => {
    const existing = { ...basePart, categoryId: 'cat-resistors-001' };
    mockFindUnique.mockResolvedValue(existing);

    const updated = {
      ...existing,
      name: 'Updated Resistor',
      tags: '[]',
      parameters: '{}',
    };
    mockUpdate.mockResolvedValue(updated);

    const res = await PATCH(
      makeRequest('http://localhost/api/parts/cltest001', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Resistor' }),
      }),
      makeParams('cltest001')
    );
    expect(res.status).toBe(200);

    // PATCH route should not forward categoryId even if present in existing record
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('categoryId');
  });

  it('returns categoryId in the PATCH response data (passed through from updated record)', async () => {
    const existing = { ...basePart, categoryId: 'cat-resistors-001' };
    mockFindUnique.mockResolvedValue(existing);

    mockUpdate.mockResolvedValue({ ...existing, name: 'Updated Resistor' });

    const res = await PATCH(
      makeRequest('http://localhost/api/parts/cltest001', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Resistor' }),
      }),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data).toHaveProperty('categoryId', 'cat-resistors-001');
  });
});
