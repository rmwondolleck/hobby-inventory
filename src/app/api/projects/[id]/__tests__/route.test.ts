import { GET, PATCH, DELETE } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';

const mockFindUnique = prisma.project.findUnique as jest.Mock;
const mockUpdate = prisma.project.update as jest.Mock;
const mockEventFindMany = prisma.event.findMany as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const baseProject = {
  id: 'proj001',
  name: 'Robot Arm',
  status: 'active',
  notes: null,
  tags: '["robotics"]',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const baseAllocation = {
  id: 'alloc001',
  lotId: 'lot001',
  projectId: 'proj001',
  quantity: 2,
  status: 'reserved',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lot: {
    id: 'lot001',
    quantity: 10,
    quantityMode: 'exact',
    qualitativeStatus: null,
    unit: 'pcs',
    status: 'in_stock',
    part: { id: 'part001', name: 'ESP32', category: 'microcontroller' },
    location: { id: 'loc001', name: 'Drawer 1', path: 'Office/Drawer 1' },
  },
};

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  mockEventFindMany.mockResolvedValue([]);
});

// ─── GET /api/projects/[id] ───────────────────────────────────────────────────

describe('GET /api/projects/[id]', () => {
  it('returns 200 with project data, allocations, and events', async () => {
    mockFindUnique.mockResolvedValue({
      ...baseProject,
      allocations: [baseAllocation],
    });
    mockEventFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest('http://localhost/api/projects/proj001'), makeParams('proj001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe('proj001');
    expect(json.data.tags).toEqual(['robotics']);
    expect(json.data.events).toEqual([]);
  });

  it('groups allocations by status', async () => {
    const inUseAllocation = { ...baseAllocation, id: 'alloc002', status: 'in_use' };
    mockFindUnique.mockResolvedValue({
      ...baseProject,
      allocations: [baseAllocation, inUseAllocation],
    });

    const res = await GET(makeRequest('http://localhost/api/projects/proj001'), makeParams('proj001'));
    const json = await res.json();

    expect(json.data.allocationsByStatus).toHaveProperty('reserved');
    expect(json.data.allocationsByStatus).toHaveProperty('in_use');
    expect(json.data.allocationsByStatus.reserved).toHaveLength(1);
    expect(json.data.allocationsByStatus.in_use).toHaveLength(1);
  });

  it('returns 404 when project not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/projects/notfound'), makeParams('notfound'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });
});

// ─── PATCH /api/projects/[id] ─────────────────────────────────────────────────

describe('PATCH /api/projects/[id]', () => {
  it('returns 200 with updated project', async () => {
    mockFindUnique.mockResolvedValue(baseProject);
    mockUpdate.mockResolvedValue({ ...baseProject, name: 'Updated Robot Arm' });

    const req = makeRequest('http://localhost/api/projects/proj001', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Robot Arm' }),
    });

    const res = await PATCH(req, makeParams('proj001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.name).toBe('Updated Robot Arm');
  });

  it('returns 404 when project not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest('http://localhost/api/projects/notfound', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, makeParams('notfound'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockFindUnique.mockResolvedValue(baseProject);

    const req = new Request('http://localhost/api/projects/proj001', {
      method: 'PATCH',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, makeParams('proj001'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('returns 400 for invalid status value', async () => {
    mockFindUnique.mockResolvedValue(baseProject);

    const req = makeRequest('http://localhost/api/projects/proj001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid_status' }),
    });

    const res = await PATCH(req, makeParams('proj001'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 422 for invalid status transition', async () => {
    mockFindUnique.mockResolvedValue({ ...baseProject, status: 'idea' });

    const req = makeRequest('http://localhost/api/projects/proj001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'deployed' }),
    });

    const res = await PATCH(req, makeParams('proj001'));
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBe('invalid_transition');
  });

  it('returns 400 when name is empty', async () => {
    mockFindUnique.mockResolvedValue(baseProject);

    const req = makeRequest('http://localhost/api/projects/proj001', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    });

    const res = await PATCH(req, makeParams('proj001'));
    expect(res.status).toBe(400);
  });

  it('updates tags correctly', async () => {
    mockFindUnique.mockResolvedValue(baseProject);
    mockUpdate.mockResolvedValue({ ...baseProject, tags: '["robotics","arm"]' });

    const req = makeRequest('http://localhost/api/projects/proj001', {
      method: 'PATCH',
      body: JSON.stringify({ tags: ['robotics', 'arm'] }),
    });

    const res = await PATCH(req, makeParams('proj001'));
    const json = await res.json();

    expect(json.data.tags).toEqual(['robotics', 'arm']);
  });
});

// ─── DELETE /api/projects/[id] ────────────────────────────────────────────────

describe('DELETE /api/projects/[id]', () => {
  it('returns 200 and archives the project', async () => {
    mockFindUnique.mockResolvedValue(baseProject);
    mockUpdate.mockResolvedValue({
      ...baseProject,
      status: 'retired',
      archivedAt: new Date(),
    });

    const res = await DELETE(makeRequest('http://localhost/api/projects/proj001'), makeParams('proj001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe('retired');
    expect(json.data.archivedAt).toBeTruthy();
  });

  it('returns 404 when project not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(makeRequest('http://localhost/api/projects/notfound'), makeParams('notfound'));
    expect(res.status).toBe(404);
  });

  it('returns 409 when project is already archived', async () => {
    mockFindUnique.mockResolvedValue({
      ...baseProject,
      archivedAt: new Date('2024-01-01'),
    });

    const res = await DELETE(makeRequest('http://localhost/api/projects/proj001'), makeParams('proj001'));
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error).toBe('already_archived');
  });
});
