import { POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    event: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseLot = {
  id: 'lot-1',
  quantity: 10,
  quantityMode: 'exact',
};

const updatedLot = {
  ...baseLot,
  quantity: 7,
};

const createdEvent = {
  id: 'evt-1',
  lotId: 'lot-1',
  type: 'edited',
  delta: -3,
  notes: null,
  createdAt: new Date('2026-01-01'),
};

function makeRequest(lotId: string, body: unknown): Request {
  return new Request(`http://localhost/api/lots/${lotId}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.$transaction as jest.Mock).mockImplementation(
    async (ops: unknown[]) => Promise.all(ops),
  );
});

describe('POST /api/lots/[id]/adjust', () => {
  it('returns 200 with updated lot on success (consume)', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);
    (mockPrisma.lot.update as jest.Mock).mockResolvedValue(updatedLot);
    (mockPrisma.event.create as jest.Mock).mockResolvedValue(createdEvent);

    const res = await POST(makeRequest('lot-1', { delta: -3, notes: 'used in repair' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.quantity).toBe(7);
  });

  it('returns 200 with updated lot on success (add)', async () => {
    const addedLot = { ...baseLot, quantity: 20 };
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);
    (mockPrisma.lot.update as jest.Mock).mockResolvedValue(addedLot);
    (mockPrisma.event.create as jest.Mock).mockResolvedValue({ ...createdEvent, delta: 10 });

    const res = await POST(makeRequest('lot-1', { delta: 10 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.quantity).toBe(20);
  });

  it('runs lot update and event creation in a single transaction', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);
    (mockPrisma.lot.update as jest.Mock).mockResolvedValue(updatedLot);
    (mockPrisma.event.create as jest.Mock).mockResolvedValue(createdEvent);

    await POST(makeRequest('lot-1', { delta: -3 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lot-1' }, data: { quantity: 7 } }),
    );
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lotId: 'lot-1', type: 'edited', delta: -3 }),
      }),
    );
  });

  it('returns 404 when lot does not exist', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest('missing', { delta: -1 }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns 400 for a qualitative lot', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({
      ...baseLot,
      quantityMode: 'qualitative',
    });

    const res = await POST(makeRequest('lot-1', { delta: 5 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('returns 400 when delta is missing', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);

    const res = await POST(makeRequest('lot-1', { notes: 'no delta' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
    expect(body.message).toMatch(/delta/i);
  });

  it('returns 400 when delta is zero', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);

    const res = await POST(makeRequest('lot-1', { delta: 0 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('returns 400 when delta is a non-integer', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);

    const res = await POST(makeRequest('lot-1', { delta: 1.5 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('returns 400 when delta is a string', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);

    const res = await POST(makeRequest('lot-1', { delta: '-3' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('returns 400 when resulting quantity would be negative', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ ...baseLot, quantity: 5 });

    const res = await POST(makeRequest('lot-1', { delta: -10 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
    expect(body.message).toMatch(/zero/i);
  });

  it('returns 400 for invalid JSON body', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);

    const req = new Request('http://localhost/api/lots/lot-1/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'lot-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_json');
  });

  it('returns 400 when body is a JSON array', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(baseLot);

    const req = new Request('http://localhost/api/lots/lot-1/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ delta: -1 }]),
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'lot-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_body');
  });
});

// ─── Auto status transition on quantity change ────────────────────────────────

describe('POST /api/lots/[id]/adjust — auto status transition', () => {
  it('sets status to out and writes status_changed event when quantity reaches 0', async () => {
    const lot = { id: 'lot-1', quantity: 5, quantityMode: 'exact', status: 'in_stock' };
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(lot);

    const updateResult = { ...lot, quantity: 0, status: 'out' };
    const editedEvent = { id: 'evt-1', lotId: 'lot-1', type: 'edited', delta: -5, notes: null };
    const statusEvent = { id: 'evt-2', lotId: 'lot-1', type: 'status_changed', delta: 0, notes: 'Auto-updated from quantity change' };
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([updateResult, editedEvent, statusEvent]);

    const res = await POST(makeRequest('lot-1', { delta: -5 }), { params: Promise.resolve({ id: 'lot-1' }) });
    expect(res.status).toBe(200);

    const transactionCall = (mockPrisma.$transaction as jest.Mock).mock.calls[0][0];
    // 3 operations: lot update + edited event + status_changed event
    expect(transactionCall).toHaveLength(3);

    const updateCall = (mockPrisma.lot.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).toMatchObject({ quantity: 0, status: 'out' });

    const eventCalls = (mockPrisma.event.create as jest.Mock).mock.calls;
    const statusChangedCall = eventCalls.find(
      (c: [{ data: { type: string } }]) => c[0].data.type === 'status_changed',
    );
    expect(statusChangedCall).toBeDefined();
    expect(statusChangedCall![0].data.notes).toBe('Auto-updated from quantity change');
  });

  it('sets status to in_stock when restocking from 0', async () => {
    const lot = { id: 'lot-2', quantity: 0, quantityMode: 'exact', status: 'out' };
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(lot);

    const updateResult = { ...lot, quantity: 10, status: 'in_stock' };
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([updateResult, {}, {}]);

    const res = await POST(makeRequest('lot-2', { delta: 10 }), { params: Promise.resolve({ id: 'lot-2' }) });
    expect(res.status).toBe(200);

    const updateCall = (mockPrisma.lot.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).toMatchObject({ quantity: 10, status: 'in_stock' });
  });

  it('does not change status for reserved lots even when quantity reaches 0', async () => {
    const lot = { id: 'lot-3', quantity: 3, quantityMode: 'exact', status: 'reserved' };
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(lot);

    const updateResult = { ...lot, quantity: 0 };
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([updateResult, {}]);

    const res = await POST(makeRequest('lot-3', { delta: -3 }), { params: Promise.resolve({ id: 'lot-3' }) });
    expect(res.status).toBe(200);

    const transactionCall = (mockPrisma.$transaction as jest.Mock).mock.calls[0][0];
    // Only 2 operations: lot update + edited event (no status_changed)
    expect(transactionCall).toHaveLength(2);

    const updateCall = (mockPrisma.lot.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('status');
  });

  it('does not change status when in_stock lot quantity stays positive', async () => {
    const lot = { id: 'lot-4', quantity: 10, quantityMode: 'exact', status: 'in_stock' };
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(lot);

    const updateResult = { ...lot, quantity: 7 };
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([updateResult, {}]);

    const res = await POST(makeRequest('lot-4', { delta: -3 }), { params: Promise.resolve({ id: 'lot-4' }) });
    expect(res.status).toBe(200);

    const transactionCall = (mockPrisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(transactionCall).toHaveLength(2);

    const updateCall = (mockPrisma.lot.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('status');
  });
});

