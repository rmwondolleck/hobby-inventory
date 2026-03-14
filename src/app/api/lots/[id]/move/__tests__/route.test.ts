import { POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
    event: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '@/lib/db';
const mockLotFindUnique = prisma.lot.findUnique as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const makeRequest = (url: string, options?: RequestInit) =>
  new Request(url, options);

type RouteParams = { params: Promise<{ id: string }> };

const makeParams = (id: string): RouteParams => ({
  params: Promise.resolve({ id }),
});

const baseLot = {
  id: 'lot-1',
  partId: 'part-1',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  locationId: 'loc-1',
  source: '{}',
  receivedAt: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const updatedLot = {
  ...baseLot,
  locationId: 'loc-2',
  part: { id: 'part-1', name: 'Resistor', category: 'passive' },
  location: { id: 'loc-2', name: 'Shelf B', path: 'Office/Shelf B' },
};

const baseEvent = {
  id: 'evt-1',
  lotId: 'lot-1',
  type: 'moved',
  fromLocationId: 'loc-1',
  toLocationId: 'loc-2',
  notes: null,
  createdAt: new Date('2024-01-02'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/lots/[id]/move ─────────────────────────────────────────────────

describe('POST /api/lots/[id]/move', () => {
  it('moves lot to new location and returns 200', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLocationFindUnique.mockResolvedValue({
      id: 'loc-2',
      name: 'Shelf B',
      path: 'Office/Shelf B',
    });
    mockTransaction.mockResolvedValue([updatedLot, baseEvent]);

    const res = await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'loc-2' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.locationId).toBe('loc-2');
  });

  it('creates an event of type "moved" in the transaction', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLocationFindUnique.mockResolvedValue({
      id: 'loc-2',
      name: 'Shelf B',
      path: 'Office/Shelf B',
    });
    mockTransaction.mockResolvedValue([updatedLot, baseEvent]);

    await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'loc-2' }),
      }),
      makeParams('lot-1')
    );

    // Verify $transaction was called with the right operations
    const [[transactionOps]] = mockTransaction.mock.calls;
    expect(transactionOps).toHaveLength(2); // lot update + event create
  });

  it('returns 404 when lot does not exist', async () => {
    mockLotFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost/api/lots/nonexistent/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'loc-2' }),
      }),
      makeParams('nonexistent')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 400 when locationId field is missing', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ notes: 'Moving...' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
    expect(json.message).toMatch(/locationId/i);
  });

  it('returns 400 when locationId is not a string or null', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: 123 }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('validation_error');
  });

  it('returns 404 when destination location does not exist', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'bad-loc' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('allows clearing location by passing null', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    const clearedLot = { ...updatedLot, locationId: null, location: null };
    mockTransaction.mockResolvedValue([clearedLot, baseEvent]);

    const res = await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: null }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('passes fromLocationId and toLocationId to event creation', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot); // locationId: 'loc-1'
    mockLocationFindUnique.mockResolvedValue({
      id: 'loc-2',
      name: 'Shelf B',
      path: 'Office/Shelf B',
    });
    mockTransaction.mockResolvedValue([updatedLot, baseEvent]);

    await POST(
      makeRequest('http://localhost/api/lots/lot-1/move', {
        method: 'POST',
        body: JSON.stringify({ locationId: 'loc-2', notes: 'Moving to shelf B' }),
      }),
      makeParams('lot-1')
    );

    // Verify $transaction was called with the right operations
    const [[transactionOps]] = mockTransaction.mock.calls;
    expect(transactionOps).toHaveLength(2); // lot update + event create
  });
});
