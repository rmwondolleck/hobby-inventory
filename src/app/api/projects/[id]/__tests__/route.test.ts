import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.project.findUnique as jest.Mock;
const mockEventFindMany = prisma.event.findMany as jest.Mock;

const baseProject = {
  id: 'proj001',
  name: 'Test Robot',
  status: 'active',
  tags: '["electronics","robotics"]',
  notes: 'Some notes',
  wishlistNotes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  allocations: [],
};

const baseAllocation = {
  id: 'alloc001',
  lotId: 'lot001',
  projectId: 'proj001',
  quantity: 2,
  status: 'in_use',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lot: {
    id: 'lot001',
    partId: 'part001',
    quantity: 10,
    quantityMode: 'exact',
    qualitativeStatus: null,
    unit: 'pcs',
    status: 'in_stock',
    locationId: 'loc001',
    source: '{"vendor":"Mouser"}',
    location: { id: 'loc001', name: 'Bin A', path: 'Shelf/Bin A' },
    part: { id: 'part001', name: 'ESP32', category: 'microcontroller' },
  },
};

const baseEvent = {
  id: 'evt001',
  lotId: 'lot001',
  type: 'allocated',
  delta: -2,
  notes: null,
  projectId: 'proj001',
  createdAt: new Date('2024-01-02'),
  lot: {
    id: 'lot001',
    part: { id: 'part001', name: 'ESP32' },
  },
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEventFindMany.mockResolvedValue([]);
});

describe('GET /api/projects/[id]', () => {
  it('returns 200 with project data and parsed tags', async () => {
    mockFindUnique.mockResolvedValue(baseProject);

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe('proj001');
    expect(json.data.tags).toEqual(['electronics', 'robotics']);
  });

  it('returns 404 when project does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(
      new Request('http://localhost/api/projects/nonexistent'),
      makeParams('nonexistent')
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('computes allocationCount and allocationsByStatus from allocations', async () => {
    const projectWithAllocations = {
      ...baseProject,
      allocations: [
        { ...baseAllocation, status: 'in_use' },
        { ...baseAllocation, id: 'alloc002', status: 'in_use' },
        { ...baseAllocation, id: 'alloc003', status: 'reserved' },
      ],
    };
    mockFindUnique.mockResolvedValue(projectWithAllocations);

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    const json = await res.json();

    expect(json.data.allocationCount).toBe(3);
    expect(json.data.allocationsByStatus).toEqual({ in_use: 2, reserved: 1 });
  });

  it('includes allocations with nested lot, part, and location', async () => {
    mockFindUnique.mockResolvedValue({ ...baseProject, allocations: [baseAllocation] });

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    const json = await res.json();

    expect(json.data.allocations).toHaveLength(1);
    expect(json.data.allocations[0].lot.part.name).toBe('ESP32');
    expect(json.data.allocations[0].lot.location.name).toBe('Bin A');
  });

  it('parses lot source JSON in allocations', async () => {
    mockFindUnique.mockResolvedValue({ ...baseProject, allocations: [baseAllocation] });

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    const json = await res.json();

    expect(json.data.allocations[0].lot.source).toEqual({ vendor: 'Mouser' });
  });

  it('includes events ordered by createdAt desc', async () => {
    mockFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([baseEvent]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    const json = await res.json();

    expect(json.data.events).toHaveLength(1);
    expect(json.data.events[0].type).toBe('allocated');
    expect(json.data.events[0].lot.part.name).toBe('ESP32');

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('handles malformed tags JSON (returns empty array fallback)', async () => {
    mockFindUnique.mockResolvedValue({ ...baseProject, tags: 'bad-json' });

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    const json = await res.json();

    expect(json.data.tags).toEqual([]);
  });

  it('handles malformed lot source JSON (returns empty object fallback)', async () => {
    const allocationWithBadSource = {
      ...baseAllocation,
      lot: { ...baseAllocation.lot, source: 'not-json' },
    };
    mockFindUnique.mockResolvedValue({ ...baseProject, allocations: [allocationWithBadSource] });

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    const json = await res.json();

    expect(json.data.allocations[0].lot.source).toEqual({});
  });

  it('returns 500 on internal error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await GET(
      new Request('http://localhost/api/projects/proj001'),
      makeParams('proj001')
    );
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
