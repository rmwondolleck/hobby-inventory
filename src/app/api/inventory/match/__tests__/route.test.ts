import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findMany: jest.fn(),
    },
    lot: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockPartFindMany = prisma.part.findMany as jest.Mock;
const mockLotFindMany = prisma.lot.findMany as jest.Mock;

function makeRequest(url: string): Request {
  return new Request(url);
}

const basePart = {
  id: 'part-1',
  name: 'BME280',
  category: 'sensor',
  manufacturer: 'Bosch',
  mpn: 'BME280',
  tags: '["temperature","humidity"]',
  parameters: '{"voltage":3.3,"interface":"I2C"}',
  notes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const baseLot = {
  id: 'lot-1',
  partId: 'part-1',
  quantity: 5,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  locationId: 'loc-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  location: { id: 'loc-1', name: 'Drawer 2', path: 'Office/Drawer 2/Bin C' },
  allocations: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/inventory/match ─────────────────────────────────────────────────

describe('GET /api/inventory/match', () => {
  it('returns 400 when category is missing', async () => {
    const res = await GET(makeRequest('http://localhost/api/inventory/match'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
    expect(json.message).toMatch(/category is required/);
  });

  it('returns 400 when category is empty string', async () => {
    const res = await GET(makeRequest('http://localhost/api/inventory/match?category='));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 400 when availability is invalid', async () => {
    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor&availability=bogus'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
    expect(json.message).toMatch(/availability must be one of/);
  });

  it('returns empty matches when no parts found', async () => {
    mockPartFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matches).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.message).toMatch(/No parts found/);
  });

  it('returns matches with correct structure', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    mockLotFindMany.mockResolvedValue([baseLot]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor'));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.total).toBe(1);
    expect(json.matches).toHaveLength(1);

    const match = json.matches[0];
    expect(match.part.id).toBe('part-1');
    expect(match.part.name).toBe('BME280');
    expect(match.part.parameters).toEqual({ voltage: 3.3, interface: 'I2C' });
    expect(match.part.tags).toEqual(['temperature', 'humidity']);
    expect(match.lots).toHaveLength(1);
    expect(match.lots[0].id).toBe('lot-1');
    expect(match.lots[0].location).toBe('Office/Drawer 2/Bin C');
    expect(match.lots[0].available).toBe(5);
    expect(match.lots[0].total).toBe(5);
    expect(match.totalAvailable).toBe(5);
  });

  it('computes available = total - allocated for exact lots', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    mockLotFindMany.mockResolvedValue([
      {
        ...baseLot,
        quantity: 5,
        allocations: [
          { id: 'alloc-1', projectId: 'proj-1', quantity: 2, status: 'reserved' },
        ],
      },
    ]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor'));
    const json = await res.json();

    expect(json.matches[0].lots[0].available).toBe(3);
    expect(json.matches[0].totalAvailable).toBe(3);
  });

  it('filters parts by parameter values', async () => {
    const partA = { ...basePart, id: 'part-1', name: 'BME280', parameters: '{"voltage":3.3}' };
    const partB = { ...basePart, id: 'part-2', name: 'DHT22', parameters: '{"voltage":5.0}' };
    mockPartFindMany.mockResolvedValue([partA, partB]);
    mockLotFindMany.mockResolvedValue([{ ...baseLot, partId: 'part-1' }]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor&parameters.voltage=3.3'));
    const json = await res.json();

    expect(json.total).toBe(1);
    expect(json.matches[0].part.name).toBe('BME280');
  });

  it('returns empty matches with message when lots exist but none match availability', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    // All lots are excluded by the status filter (prisma mock returns empty)
    mockLotFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor'));
    const json = await res.json();

    expect(json.matches).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.message).toMatch(/No matching inventory found/);
  });

  it('excludes lots with zero available in available mode', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    mockLotFindMany.mockResolvedValue([
      {
        ...baseLot,
        quantity: 2,
        allocations: [
          { id: 'alloc-1', projectId: 'proj-1', quantity: 2, status: 'reserved' },
        ],
      },
    ]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor&availability=available'));
    const json = await res.json();

    expect(json.matches).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('excludes lots already allocated to projectId', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    mockLotFindMany.mockResolvedValue([
      {
        ...baseLot,
        allocations: [
          { id: 'alloc-1', projectId: 'proj-exclude', quantity: 2, status: 'reserved' },
        ],
      },
    ]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor&projectId=proj-exclude'));
    const json = await res.json();

    expect(json.matches).toEqual([]);
    expect(json.total).toBe(0);
  });

  it('returns null available for qualitative lots', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    mockLotFindMany.mockResolvedValue([
      {
        ...baseLot,
        quantity: null,
        quantityMode: 'qualitative',
        qualitativeStatus: 'plenty',
        allocations: [],
      },
    ]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor'));
    const json = await res.json();

    expect(json.matches[0].lots[0].available).toBeNull();
    expect(json.matches[0].totalAvailable).toBe(0);
  });

  it('sorts lots by status priority: in_stock before reserved before installed', async () => {
    mockPartFindMany.mockResolvedValue([basePart]);
    mockLotFindMany.mockResolvedValue([
      { ...baseLot, id: 'lot-installed', status: 'installed', quantity: 3, allocations: [] },
      { ...baseLot, id: 'lot-reserved', status: 'reserved', quantity: 2, allocations: [] },
      { ...baseLot, id: 'lot-in_stock', status: 'in_stock', quantity: 5, allocations: [] },
    ]);

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor&availability=any'));
    const json = await res.json();

    const lotIds = json.matches[0].lots.map((l: { id: string }) => l.id);
    expect(lotIds[0]).toBe('lot-in_stock');
    expect(lotIds[1]).toBe('lot-reserved');
    expect(lotIds[2]).toBe('lot-installed');
  });

  it('handles internal errors gracefully', async () => {
    mockPartFindMany.mockRejectedValue(new Error('DB error'));

    const res = await GET(makeRequest('http://localhost/api/inventory/match?category=sensor'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
