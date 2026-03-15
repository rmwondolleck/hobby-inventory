import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    allocation: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    event: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockLotFindUnique = prisma.lot.findUnique as jest.Mock;
const mockProjectFindUnique = prisma.project.findUnique as jest.Mock;
const mockAllocationCount = prisma.allocation.count as jest.Mock;
const mockAllocationFindMany = prisma.allocation.findMany as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

const baseLot = {
  id: 'lot001',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  partId: 'part001',
  locationId: 'loc001',
};

const baseProject = {
  id: 'proj001',
  name: 'Robot Arm',
  status: 'active',
};

const baseAllocation = {
  id: 'alloc001',
  lotId: 'lot001',
  projectId: 'proj001',
  quantity: 3,
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
  project: { id: 'proj001', name: 'Robot Arm', status: 'active' },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/allocations ─────────────────────────────────────────────────────

describe('GET /api/allocations', () => {
  it('returns 200 with data array and pagination', async () => {
    mockAllocationCount.mockResolvedValue(1);
    mockAllocationFindMany.mockResolvedValue([baseAllocation]);

    const res = await GET(makeRequest('http://localhost/api/allocations'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.total).toBe(1);
    expect(json.data).toHaveLength(1);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it('filters by projectId', async () => {
    mockAllocationCount.mockResolvedValue(0);
    mockAllocationFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/allocations?projectId=proj001'));

    expect(prisma.allocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj001' }) }),
    );
  });

  it('filters by status (comma-separated)', async () => {
    mockAllocationCount.mockResolvedValue(0);
    mockAllocationFindMany.mockResolvedValue([]);

    await GET(makeRequest('http://localhost/api/allocations?status=reserved,in_use'));

    expect(prisma.allocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['reserved', 'in_use'] } }),
      }),
    );
  });
});

// ─── POST /api/allocations ────────────────────────────────────────────────────

describe('POST /api/allocations', () => {
  it('returns 201 on successful reservation', async () => {
    mockLotFindUnique.mockResolvedValueOnce(baseLot); // lot exists
    mockProjectFindUnique.mockResolvedValue(baseProject);
    // getAvailableQuantity calls lot.findUnique and allocation.findMany
    mockLotFindUnique.mockResolvedValueOnce({ quantity: 10, quantityMode: 'exact' });
    (prisma.allocation.findMany as jest.Mock).mockResolvedValueOnce([]);
    mockTransaction.mockResolvedValue([baseAllocation, {}]);

    const req = makeRequest('http://localhost/api/allocations', {
      method: 'POST',
      body: JSON.stringify({ lotId: 'lot001', projectId: 'proj001', quantity: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.id).toBe('alloc001');
  });

  it('returns 400 when lotId is missing', async () => {
    const req = makeRequest('http://localhost/api/allocations', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'proj001', quantity: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
    expect(json.message).toContain('lotId');
  });

  it('returns 400 when projectId is missing', async () => {
    const req = makeRequest('http://localhost/api/allocations', {
      method: 'POST',
      body: JSON.stringify({ lotId: 'lot001', quantity: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
    expect(json.message).toContain('projectId');
  });

  it('returns 404 when lot not found', async () => {
    mockLotFindUnique.mockResolvedValue(null);

    const req = makeRequest('http://localhost/api/allocations', {
      method: 'POST',
      body: JSON.stringify({ lotId: 'notfound', projectId: 'proj001', quantity: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 404 when project not found', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockProjectFindUnique.mockResolvedValue(null);

    const req = makeRequest('http://localhost/api/allocations', {
      method: 'POST',
      body: JSON.stringify({ lotId: 'lot001', projectId: 'notfound', quantity: 3 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 422 when allocating more than available', async () => {
    mockLotFindUnique.mockResolvedValueOnce(baseLot);
    mockProjectFindUnique.mockResolvedValue(baseProject);
    mockLotFindUnique.mockResolvedValueOnce({ quantity: 10, quantityMode: 'exact' });
    (prisma.allocation.findMany as jest.Mock).mockResolvedValueOnce([{ quantity: 8 }]);

    const req = makeRequest('http://localhost/api/allocations', {
      method: 'POST',
      body: JSON.stringify({ lotId: 'lot001', projectId: 'proj001', quantity: 5 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBe('insufficient_quantity');
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new Request('http://localhost/api/allocations', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });
});
