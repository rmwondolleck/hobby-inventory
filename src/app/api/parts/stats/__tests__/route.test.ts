import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.lot.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

function makeLot(overrides: {
  id?: string;
  quantity?: number | null;
  source?: string;
  category?: string | null;
  status?: string;
  quantityMode?: string;
}) {
  return {
    id: overrides.id ?? 'lot1',
    quantity: 'quantity' in overrides ? overrides.quantity : 10,
    source: overrides.source ?? '{}',
    part: { category: 'category' in overrides ? overrides.category : 'Resistors' },
  };
}

describe('GET /api/parts/stats', () => {
  it('returns zero totalValue when no lots have cost data', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ source: '{}' }),
      makeLot({ id: 'lot2', source: '{"unitCost": 0}' }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.totalValue).toBe(0);
    expect(json.lotsWithCostData).toBe(0);
    expect(json.lotsWithoutCostData).toBe(2);
    expect(json.valueByCategoryTop5).toEqual([]);
    expect(json.currency).toBe('USD');
  });

  it('computes totalValue correctly from unitCost * quantity', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ source: '{"unitCost": 1.5}', quantity: 10 }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.totalValue).toBe(15);
    expect(json.lotsWithCostData).toBe(1);
    expect(json.lotsWithoutCostData).toBe(0);
  });

  it('excludes lots with null quantity', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ source: '{"unitCost": 2.0}', quantity: null }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.totalValue).toBe(0);
    expect(json.lotsWithCostData).toBe(0);
    expect(json.lotsWithoutCostData).toBe(1);
  });

  it('groups value by category and returns top 5', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ id: 'l1', source: '{"unitCost": 10}', quantity: 5, category: 'Microcontrollers' }),
      makeLot({ id: 'l2', source: '{"unitCost": 2}', quantity: 10, category: 'Sensors' }),
      makeLot({ id: 'l3', source: '{"unitCost": 3}', quantity: 4, category: 'Capacitors' }),
      makeLot({ id: 'l4', source: '{"unitCost": 1}', quantity: 6, category: 'Resistors' }),
      makeLot({ id: 'l5', source: '{"unitCost": 5}', quantity: 3, category: 'LEDs' }),
      makeLot({ id: 'l6', source: '{"unitCost": 0.5}', quantity: 100, category: 'Connectors' }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.valueByCategoryTop5).toHaveLength(5);
    // Microcontrollers = 50, Sensors = 20, LEDs = 15, Connectors = 50, Capacitors = 12, Resistors = 6
    // Top 5 by value descending
    const categories = json.valueByCategoryTop5.map((c: { category: string }) => c.category);
    expect(categories).not.toContain('Resistors'); // lowest value, excluded from top 5
  });

  it('accumulates values for multiple lots in the same category', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ id: 'l1', source: '{"unitCost": 1.0}', quantity: 10, category: 'Resistors' }),
      makeLot({ id: 'l2', source: '{"unitCost": 2.0}', quantity: 5, category: 'Resistors' }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.totalValue).toBe(20);
    expect(json.valueByCategoryTop5[0]).toEqual({ category: 'Resistors', value: 20 });
  });

  it('uses "Uncategorized" for lots with no category', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ source: '{"unitCost": 5}', quantity: 2, category: null }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.valueByCategoryTop5[0].category).toBe('Uncategorized');
  });

  it('rounds values to 2 decimal places', async () => {
    mockFindMany.mockResolvedValue([
      makeLot({ source: '{"unitCost": 0.1}', quantity: 3 }),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.totalValue).toBe(0.3);
  });

  it('includes computedAt, currency, and note fields', async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await GET();
    const json = await res.json();

    expect(json.currency).toBe('USD');
    expect(typeof json.computedAt).toBe('string');
    expect(json.note).toContain('USD');
  });

  it('queries only exact quantity mode lots excluding scrapped and lost', async () => {
    mockFindMany.mockResolvedValue([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { notIn: ['scrapped', 'lost'] },
          quantityMode: 'exact',
        }),
      })
    );
  });
});
