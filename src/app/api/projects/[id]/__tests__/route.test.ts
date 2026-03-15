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

const mockProjectFindUnique = prisma.project.findUnique as jest.Mock;
const mockEventFindMany = prisma.event.findMany as jest.Mock;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const baseLot = {
  id: 'lot-1',
  partId: 'part-1',
  quantity: 5,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  locationId: 'loc-1',
  source: '{"type":"purchase","seller":"Digikey"}',
  receivedAt: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  location: { id: 'loc-1', name: 'Shelf A', path: 'Office/Shelf A' },
  part: { id: 'part-1', name: 'ATmega328P', category: 'microcontroller' },
};

const baseAllocation = {
  id: 'alloc-1',
  lotId: 'lot-1',
  projectId: 'proj-1',
  quantity: 2,
  status: 'in_use',
  notes: null,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
  lot: baseLot,
};

const baseProject = {
  id: 'proj-1',
  name: 'Robot Arm',
  status: 'active',
  tags: '["robot","servo"]',
  notes: 'Building a robotic arm',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  allocations: [baseAllocation],
};

const baseEvent = {
  id: 'evt-1',
  lotId: 'lot-1',
  type: 'allocated',
  delta: 2,
  fromLocationId: null,
  toLocationId: null,
  projectId: 'proj-1',
  notes: null,
  createdAt: new Date('2024-01-02'),
  lot: {
    id: 'lot-1',
    part: { id: 'part-1', name: 'ATmega328P' },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/projects/[id] ───────────────────────────────────────────────────

describe('GET /api/projects/[id]', () => {
  it('returns 200 with project data', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([baseEvent]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('proj-1');
    expect(json.data.name).toBe('Robot Arm');
  });

  it('returns 404 when project does not exist', async () => {
    mockProjectFindUnique.mockResolvedValue(null);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/nonexistent'),
      makeParams('nonexistent')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('parses tags JSON string into array', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.tags).toEqual(['robot', 'servo']);
  });

  it('parses lot source JSON string into object within allocations', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.allocations[0].lot.source).toEqual({
      type: 'purchase',
      seller: 'Digikey',
    });
  });

  it('computes allocationCount correctly', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.allocationCount).toBe(1);
  });

  it('computes allocationsByStatus map', async () => {
    const projectWithMultipleAllocations = {
      ...baseProject,
      allocations: [
        { ...baseAllocation, id: 'a1', status: 'in_use' },
        { ...baseAllocation, id: 'a2', status: 'in_use' },
        { ...baseAllocation, id: 'a3', status: 'reserved' },
        { ...baseAllocation, id: 'a4', status: 'deployed' },
      ],
    };
    mockProjectFindUnique.mockResolvedValue(projectWithMultipleAllocations);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.allocationsByStatus).toEqual({
      in_use: 2,
      reserved: 1,
      deployed: 1,
    });
  });

  it('includes events in the response', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([baseEvent]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.events).toHaveLength(1);
    expect(json.data.events[0].id).toBe('evt-1');
    expect(json.data.events[0].type).toBe('allocated');
  });

  it('returns empty events array when project has no events', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.events).toEqual([]);
  });

  it('queries events filtered by projectId', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([]);

    await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'proj-1' },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('queries project with allocations including lot, location, and part', async () => {
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockEventFindMany.mockResolvedValue([]);

    await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );

    expect(mockProjectFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proj-1' },
        include: expect.objectContaining({
          allocations: expect.objectContaining({
            include: expect.objectContaining({
              lot: expect.anything(),
            }),
          }),
        }),
      })
    );
  });

  it('gracefully handles malformed tags JSON (returns empty array)', async () => {
    const badProject = { ...baseProject, tags: 'invalid-json' };
    mockProjectFindUnique.mockResolvedValue(badProject);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.tags).toEqual([]);
  });

  it('gracefully handles malformed lot source JSON (returns empty object)', async () => {
    const badLot = { ...baseLot, source: 'not-json' };
    const projectWithBadLot = {
      ...baseProject,
      allocations: [{ ...baseAllocation, lot: badLot }],
    };
    mockProjectFindUnique.mockResolvedValue(projectWithBadLot);
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );
    const json = await res.json();

    expect(json.data.allocations[0].lot.source).toEqual({});
  });

  it('returns 500 on unexpected DB error', async () => {
    mockProjectFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await GET(
      new Request('http://localhost/api/projects/proj-1'),
      makeParams('proj-1')
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
