import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.part.findUnique as jest.Mock;

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
  lots: [],
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/parts/[id]', () => {
  it('returns 200 with part data and parsed tags/parameters', async () => {
    mockFindUnique.mockResolvedValue(basePart);

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe('cltest001');
    expect(json.data.tags).toEqual(['resistor', '0402']);
    expect(json.data.parameters).toEqual({ resistance: '10k' });
  });

  it('returns 404 when part does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(
      new Request('http://localhost/api/parts/nonexistent'),
      makeParams('nonexistent')
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('includes nested lots with parsed source field', async () => {
    const lot = {
      id: 'lot001',
      partId: 'cltest001',
      source: '{"vendor":"Mouser","orderNumber":"12345"}',
      quantity: 10,
      quantityMode: 'exact',
      qualitativeStatus: null,
      unit: null,
      status: 'in_stock',
      locationId: 'loc001',
      notes: null,
      receivedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      location: { id: 'loc001', name: 'Bin A', path: '/shelf/bin-a' },
      allocations: [],
    };
    mockFindUnique.mockResolvedValue({ ...basePart, lots: [lot] });

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data.lots).toHaveLength(1);
    expect(json.data.lots[0].source).toEqual({ vendor: 'Mouser', orderNumber: '12345' });
  });

  it('includes lot location and allocations in response', async () => {
    const lot = {
      id: 'lot001',
      partId: 'cltest001',
      source: '{}',
      quantity: 5,
      quantityMode: 'exact',
      qualitativeStatus: null,
      unit: null,
      status: 'in_stock',
      locationId: 'loc001',
      notes: null,
      receivedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      location: { id: 'loc001', name: 'Shelf B', path: '/shelf-b' },
      allocations: [
        {
          id: 'alloc001',
          lotId: 'lot001',
          projectId: 'proj001',
          quantity: 2,
          status: 'allocated',
          notes: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          project: { id: 'proj001', name: 'Robot Arm', status: 'active' },
        },
      ],
    };
    mockFindUnique.mockResolvedValue({ ...basePart, lots: [lot] });

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data.lots[0].location.name).toBe('Shelf B');
    expect(json.data.lots[0].allocations[0].project.name).toBe('Robot Arm');
  });

  it('handles malformed tags JSON gracefully (returns [])', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, tags: 'bad-json', lots: [] });

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data.tags).toEqual([]);
  });

  it('handles malformed parameters JSON gracefully (returns {})', async () => {
    mockFindUnique.mockResolvedValue({ ...basePart, parameters: '{bad}', lots: [] });

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data.parameters).toEqual({});
  });

  it('handles malformed lot source JSON gracefully (returns {})', async () => {
    const lot = {
      id: 'lot001',
      partId: 'cltest001',
      source: 'not-json',
      quantity: 3,
      quantityMode: 'exact',
      qualitativeStatus: null,
      unit: null,
      status: 'in_stock',
      locationId: null,
      notes: null,
      receivedAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      location: null,
      allocations: [],
    };
    mockFindUnique.mockResolvedValue({ ...basePart, lots: [lot] });

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    const json = await res.json();

    expect(json.data.lots[0].source).toEqual({});
  });

  it('returns 500 on internal error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await GET(
      new Request('http://localhost/api/parts/cltest001'),
      makeParams('cltest001')
    );
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
