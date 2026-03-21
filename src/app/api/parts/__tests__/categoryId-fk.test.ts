/**
 * Tests for Part.categoryId FK field (added in migration 20260320203018_add_part_category_fk).
 * Verifies the new optional FK is correctly surfaced through existing API routes.
 */
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
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.part.findMany as jest.Mock;
const mockCount = prisma.part.count as jest.Mock;
const mockCreate = prisma.part.create as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockCategoryUpsert = prisma.category.upsert as jest.Mock;
const mockCategoryFindUnique = prisma.category.findUnique as jest.Mock;

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
  mockTransaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries));
});

// ─── GET /api/parts — categoryId passthrough ──────────────────────────────────

describe('GET /api/parts — categoryId FK field', () => {
  it('returns categoryId: null when part has no linked category record', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, categoryId: null }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data[0]).toHaveProperty('categoryId', null);
  });

  it('returns categoryId when part is linked to a category record', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, categoryId: 'cat-resistors-001' }]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();

    expect(json.data[0]).toHaveProperty('categoryId', 'cat-resistors-001');
  });

  it('returns categoryId alongside the denormalized category string', async () => {
    mockFindMany.mockResolvedValue([
      { ...basePart, category: 'Resistors', categoryId: 'cat-resistors-001' },
    ]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();
    const part = json.data[0];

    expect(part.category).toBe('Resistors');
    expect(part.categoryId).toBe('cat-resistors-001');
  });

  it('returns categoryId: null for parts where category string has no FK match (back-fill miss)', async () => {
    mockFindMany.mockResolvedValue([
      { ...basePart, category: 'LegacyCategory', categoryId: null },
    ]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeRequest('http://localhost/api/parts'));
    const json = await res.json();
    const part = json.data[0];

    expect(part.category).toBe('LegacyCategory');
    expect(part.categoryId).toBeNull();
  });
});

// ─── POST /api/parts — categoryId is resolved and synced via resolveCategorySync ─

describe('POST /api/parts — categoryId FK field', () => {
  it('creates a part and resolves categoryId via upsert-by-name when category string is supplied', async () => {
    mockCategoryUpsert.mockResolvedValue({
      id: 'cat-resistors-001',
      name: 'Resistors',
      parameterSchema: '{}',
    });
    const created = {
      ...basePart,
      id: 'clnew001',
      category: 'Resistors',
      categoryId: 'cat-resistors-001',
    };
    mockCreate.mockResolvedValue(created);

    const res = await POST(
      makeRequest('http://localhost/api/parts', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Resistor', category: 'Resistors' }),
      })
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json).toHaveProperty('categoryId', 'cat-resistors-001');
  });

  it('accepts categoryId from caller body and syncs category string via FK lookup', async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id: 'cat-resistors-001',
      name: 'Resistors',
    });
    const created = {
      ...basePart,
      id: 'clnew002',
      category: 'Resistors',
      categoryId: 'cat-resistors-001',
    };
    mockCreate.mockResolvedValue(created);

    const res = await POST(
      makeRequest('http://localhost/api/parts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Resistor',
          category: 'Resistors',
          categoryId: 'cat-resistors-001',
        }),
      })
    );
    expect(res.status).toBe(201);

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data).toHaveProperty('categoryId', 'cat-resistors-001');
  });
});
