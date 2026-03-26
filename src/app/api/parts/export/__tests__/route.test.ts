import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindMany = prisma.part.findMany as jest.Mock;

const makeRequest = (url: string) => new Request(url);

const basePart = {
  name: 'Test Resistor',
  category: 'Resistors',
  manufacturer: 'Yageo',
  mpn: 'RC0402FR-0710KL',
  tags: '["resistor","0402"]',
  notes: 'A test note',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/parts/export ────────────────────────────────────────────────────

describe('GET /api/parts/export', () => {
  it('returns 200 with CSV content-type and attachment header', async () => {
    mockFindMany.mockResolvedValue([basePart]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/);
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment/);
    expect(res.headers.get('Content-Disposition')).toMatch(/parts-export-/);
  });

  it('includes CSV header row with correct columns', async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));
    const text = await res.text();

    expect(text).toMatch(/^name,category,manufacturer,mpn,tags,notes\n/);
  });

  it('serializes a part record into a CSV data row', async () => {
    mockFindMany.mockResolvedValue([basePart]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));
    const text = await res.text();
    const lines = text.trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Test Resistor');
    expect(lines[1]).toContain('Resistors');
    expect(lines[1]).toContain('RC0402FR-0710KL');
  });

  it('joins tags array with semicolons', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, tags: '["smd","0402","resistor"]' }]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));
    const text = await res.text();

    expect(text).toContain('smd;0402;resistor');
  });

  it('handles invalid/empty tags JSON gracefully (falls back to empty string)', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, tags: 'not-valid-json' }]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));
    const text = await res.text();
    const lines = text.trim().split('\n');

    expect(res.status).toBe(200);
    expect(lines).toHaveLength(2);
    // tags column should be empty string since fallback is []
    expect(lines[1]).toContain('Test Resistor');
  });

  it('filters by category when ?category= is provided', async () => {
    mockFindMany.mockResolvedValue([basePart]);

    await GET(makeRequest('http://localhost/api/parts/export?category=Resistors'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'Resistors' }),
      })
    );
  });

  it('filters by archived=true', async () => {
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/parts/export?archived=true'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: { not: null } }),
      })
    );
  });

  it('filters by archived=false', async () => {
    mockFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/parts/export?archived=false'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      })
    );
  });

  it('returns only the header row when no parts match', async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));
    const text = await res.text();
    const lines = text.trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('name,category,manufacturer,mpn,tags,notes');
  });

  it('returns 500 JSON when prisma throws', async () => {
    mockFindMany.mockRejectedValue(new Error('DB down'));

    const res = await GET(makeRequest('http://localhost/api/parts/export'));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('InternalError');
    expect(body.message).toMatch(/export parts/i);
  });

  it('properly CSV-escapes fields containing commas', async () => {
    mockFindMany.mockResolvedValue([{ ...basePart, notes: 'First, second' }]);

    const res = await GET(makeRequest('http://localhost/api/parts/export'));
    const text = await res.text();

    expect(text).toContain('"First, second"');
  });
});
