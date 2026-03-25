import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findMany: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockLotFindMany = prisma.lot.findMany as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;
const mockLocationFindMany = prisma.location.findMany as jest.Mock;

const makeRequest = (url: string) => new Request(url);

const baseLocation = {
  id: 'loc-1',
  name: 'Shelf A',
  path: 'Office/Shelf A',
};

const baseLot = {
  id: 'lot-1',
  partId: 'part-1',
  quantity: 10,
  unit: 'pcs',
  status: 'in_stock',
  locationId: 'loc-1',
  source: '{"seller":"DigKey","sourceUrl":"https://example.com","unitCost":1.5,"currency":"USD","purchaseDate":"2024-01-01"}',
  notes: 'Some note',
  part: { name: 'Resistor 10k', mpn: 'RC0402FR-0710KL' },
  location: { path: 'Office/Shelf A' },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/lots/export ─────────────────────────────────────────────────────

describe('GET /api/lots/export', () => {
  it('returns 200 with CSV content-type and attachment header', async () => {
    mockLotFindMany.mockResolvedValue([baseLot]);

    const res = await GET(makeRequest('http://localhost/api/lots/export'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/);
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment/);
    expect(res.headers.get('Content-Disposition')).toMatch(/lots-export-/);
  });

  it('includes correct CSV header row', async () => {
    mockLotFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/lots/export'));
    const text = await res.text();

    expect(text).toMatch(/^partName,partMpn,quantity,unit,status,locationPath,seller,sourceUrl,unitCost,currency,purchaseDate,notes\n/);
  });

  it('serializes a lot into a CSV data row with flattened source fields', async () => {
    mockLotFindMany.mockResolvedValue([baseLot]);

    const res = await GET(makeRequest('http://localhost/api/lots/export'));
    const text = await res.text();
    const lines = text.trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Resistor 10k');
    expect(lines[1]).toContain('RC0402FR-0710KL');
    expect(lines[1]).toContain('10');
    expect(lines[1]).toContain('in_stock');
    expect(lines[1]).toContain('DigKey');
    expect(lines[1]).toContain('1.5');
    expect(lines[1]).toContain('USD');
  });

  it('returns only the header row when no lots match', async () => {
    mockLotFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/lots/export'));
    const text = await res.text();
    const lines = text.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('partName');
  });

  it('filters by status when ?status= is provided', async () => {
    mockLotFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/lots/export?status=reserved'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ status: { in: ['reserved'] } }),
          ]),
        }),
      })
    );
  });

  it('accepts comma-separated status values', async () => {
    mockLotFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/lots/export?status=in_stock,reserved'));

    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ status: { in: ['in_stock', 'reserved'] } }),
          ]),
        }),
      })
    );
  });

  it('resolves locationId to descendant location ids via path-prefix', async () => {
    mockLocationFindUnique.mockResolvedValue(baseLocation);
    mockLocationFindMany.mockResolvedValue([
      { id: 'loc-1' },
      { id: 'loc-2' },
    ]);
    mockLotFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/lots/export?locationId=loc-1'));

    expect(mockLocationFindUnique).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
    expect(mockLocationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { path: { startsWith: 'Office/Shelf A' } },
      })
    );
    expect(mockLotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ locationId: { in: ['loc-1', 'loc-2'] } }),
          ]),
        }),
      })
    );
  });

  it('returns empty CSV when locationId is not found', async () => {
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/lots/export?locationId=nonexistent'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('handles lots with empty source object gracefully', async () => {
    mockLotFindMany.mockResolvedValue([{
      ...baseLot,
      source: '{}',
    }]);

    const res = await GET(makeRequest('http://localhost/api/lots/export'));

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Resistor 10k');
  });

  it('returns 500 JSON when prisma throws', async () => {
    mockLotFindMany.mockRejectedValue(new Error('DB error'));

    const res = await GET(makeRequest('http://localhost/api/lots/export'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('InternalError');
    expect(body.message).toMatch(/export lots/i);
  });

  it('CSV-escapes lot fields containing commas or quotes', async () => {
    mockLotFindMany.mockResolvedValue([{
      ...baseLot,
      notes: 'First, second',
      source: '{"seller":"A \\"trusted\\" seller"}',
    }]);

    const res = await GET(makeRequest('http://localhost/api/lots/export'));
    const text = await res.text();

    expect(text).toContain('"First, second"');
  });
});
