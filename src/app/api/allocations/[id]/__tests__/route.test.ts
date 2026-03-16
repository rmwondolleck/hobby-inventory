import { GET, PATCH } from '../route';
import { POST as RETURN_POST } from '../return/route';
import { POST as SCRAP_POST } from '../scrap/route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: { update: jest.fn() },
    allocation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    event: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockAllocationFindUnique = prisma.allocation.findUnique as jest.Mock;
const mockAllocationUpdate = prisma.allocation.update as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

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

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/allocations/[id] ────────────────────────────────────────────────

describe('GET /api/allocations/[id]', () => {
  it('returns 200 with allocation data', async () => {
    mockAllocationFindUnique.mockResolvedValue(baseAllocation);

    const res = await GET(makeRequest('http://localhost/api/allocations/alloc001'), makeParams('alloc001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe('alloc001');
    expect(json.data.status).toBe('reserved');
  });

  it('returns 404 when allocation not found', async () => {
    mockAllocationFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/allocations/notfound'), makeParams('notfound'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });
});

// ─── PATCH /api/allocations/[id] ─────────────────────────────────────────────

describe('PATCH /api/allocations/[id]', () => {
  it('returns 200 with updated allocation', async () => {
    mockAllocationFindUnique.mockResolvedValue(baseAllocation);
    mockAllocationUpdate.mockResolvedValue({ ...baseAllocation, status: 'in_use' });
    (prisma.event.create as jest.Mock).mockResolvedValue({});

    const req = makeRequest('http://localhost/api/allocations/alloc001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_use' }),
    });

    const res = await PATCH(req, makeParams('alloc001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe('in_use');
  });

  it('returns 404 when allocation not found', async () => {
    mockAllocationFindUnique.mockResolvedValue(null);

    const req = makeRequest('http://localhost/api/allocations/notfound', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_use' }),
    });

    const res = await PATCH(req, makeParams('notfound'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON', async () => {
    mockAllocationFindUnique.mockResolvedValue(baseAllocation);

    const req = new Request('http://localhost/api/allocations/alloc001', {
      method: 'PATCH',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PATCH(req, makeParams('alloc001'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('returns 400 for invalid status value', async () => {
    mockAllocationFindUnique.mockResolvedValue(baseAllocation);

    const req = makeRequest('http://localhost/api/allocations/alloc001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'bad_status' }),
    });

    const res = await PATCH(req, makeParams('alloc001'));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 422 for invalid status transition', async () => {
    mockAllocationFindUnique.mockResolvedValue({ ...baseAllocation, status: 'recovered' });

    const req = makeRequest('http://localhost/api/allocations/alloc001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_use' }),
    });

    const res = await PATCH(req, makeParams('alloc001'));
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBe('invalid_transition');
  });
});

// ─── POST /api/allocations/[id]/return ───────────────────────────────────────

describe('POST /api/allocations/[id]/return', () => {
  it('returns 200 and sets status to recovered', async () => {
    mockAllocationFindUnique.mockResolvedValue(baseAllocation);
    mockTransaction.mockResolvedValue([{ ...baseAllocation, status: 'recovered' }, {}]);

    const res = await RETURN_POST(
      makeRequest('http://localhost/api/allocations/alloc001/return', { method: 'POST' }),
      makeParams('alloc001'),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe('recovered');
  });

  it('returns 404 when allocation not found', async () => {
    mockAllocationFindUnique.mockResolvedValue(null);

    const res = await RETURN_POST(
      makeRequest('http://localhost/api/allocations/notfound/return', { method: 'POST' }),
      makeParams('notfound'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 422 when allocation is already recovered', async () => {
    mockAllocationFindUnique.mockResolvedValue({ ...baseAllocation, status: 'recovered' });

    const res = await RETURN_POST(
      makeRequest('http://localhost/api/allocations/alloc001/return', { method: 'POST' }),
      makeParams('alloc001'),
    );
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBe('invalid_state');
  });
});

// ─── POST /api/allocations/[id]/scrap ────────────────────────────────────────

describe('POST /api/allocations/[id]/scrap', () => {
  it('returns 200 and reduces lot quantity', async () => {
    mockAllocationFindUnique.mockResolvedValue({
      ...baseAllocation,
      lot: { quantity: 10, quantityMode: 'exact' },
    });
    // Interactive transaction: the callback receives a tx client and returns the result
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        allocation: { update: jest.fn().mockResolvedValue({ ...baseAllocation, status: 'recovered' }) },
        event: { create: jest.fn().mockResolvedValue({}) },
        lot: { update: jest.fn().mockResolvedValue({}) },
      };
      return cb(mockTx);
    });

    const res = await SCRAP_POST(
      makeRequest('http://localhost/api/allocations/alloc001/scrap', { method: 'POST' }),
      makeParams('alloc001'),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe('recovered');
  });

  it('returns 404 when allocation not found', async () => {
    mockAllocationFindUnique.mockResolvedValue(null);

    const res = await SCRAP_POST(
      makeRequest('http://localhost/api/allocations/notfound/scrap', { method: 'POST' }),
      makeParams('notfound'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 422 when allocation is already recovered', async () => {
    mockAllocationFindUnique.mockResolvedValue({
      ...baseAllocation,
      status: 'recovered',
      lot: { quantity: 10, quantityMode: 'exact' },
    });

    const res = await SCRAP_POST(
      makeRequest('http://localhost/api/allocations/alloc001/scrap', { method: 'POST' }),
      makeParams('alloc001'),
    );
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBe('invalid_state');
  });
});
