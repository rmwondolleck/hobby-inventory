import { GET, PATCH } from '../route';

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
  },
}));

import prisma from '@/lib/db';
const mockLotFindUnique = prisma.lot.findUnique as jest.Mock;
const mockLotUpdate = prisma.lot.update as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;

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
  source: '{"type":"digikey","seller":"DigiKey","unitCost":0.5,"currency":"USD"}',
  receivedAt: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  part: { id: 'part-1', name: 'Capacitor', category: 'passive' },
  location: { id: 'loc-1', name: 'Drawer 1', path: 'Office/Shelf A/Drawer 1' },
  allocations: [],
  events: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GET /api/lots/[id] ───────────────────────────────────────────────────────

describe('GET /api/lots/[id]', () => {
  it('returns 200 with lot detail', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await GET(
      makeRequest('http://localhost/api/lots/lot-1'),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('lot-1');
  });

  it('parses source JSON string into object', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await GET(
      makeRequest('http://localhost/api/lots/lot-1'),
      makeParams('lot-1')
    );

    const json = await res.json();
    expect(json.data.source).toEqual({
      type: 'digikey',
      seller: 'DigiKey',
      unitCost: 0.5,
      currency: 'USD',
    });
  });

  it('includes events and allocations in response', async () => {
    const lotWithData = {
      ...baseLot,
      allocations: [{ id: 'alloc-1', status: 'reserved' }],
      events: [{ id: 'evt-1', type: 'created' }],
    };
    mockLotFindUnique.mockResolvedValue(lotWithData);

    const res = await GET(
      makeRequest('http://localhost/api/lots/lot-1'),
      makeParams('lot-1')
    );

    const json = await res.json();
    expect(json.data.allocations).toHaveLength(1);
    expect(json.data.events).toHaveLength(1);
  });

  it('returns 404 when lot does not exist', async () => {
    mockLotFindUnique.mockResolvedValue(null);

    const res = await GET(
      makeRequest('http://localhost/api/lots/nonexistent'),
      makeParams('nonexistent')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });
});

// ─── PATCH /api/lots/[id] ─────────────────────────────────────────────────────

describe('PATCH /api/lots/[id]', () => {
  it('updates a lot field and returns 200', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    const updated = { ...baseLot, notes: 'Updated note', source: '{}' };
    mockLotUpdate.mockResolvedValue(updated);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated note' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.notes).toBe('Updated note');
  });

  it('returns 404 when lot does not exist', async () => {
    mockLotFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'x' }),
      }),
      makeParams('nonexistent')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('returns 400 for invalid JSON body', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: 'bad-json',
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_json');
  });

  it('returns 422 for invalid status transition', async () => {
    mockLotFindUnique.mockResolvedValue({
      ...baseLot,
      status: 'scrapped', // terminal state
    });

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_stock' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('invalid_transition');
  });

  it('allows valid status transition', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot); // status: in_stock
    const updated = { ...baseLot, status: 'low', source: '{}' };
    mockLotUpdate.mockResolvedValue(updated);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'low' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('low');
  });

  it('returns 400 for invalid quantityMode', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ quantityMode: 'invalid' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 when setting quantity in qualitative mode', async () => {
    mockLotFindUnique.mockResolvedValue({
      ...baseLot,
      quantityMode: 'qualitative',
    });

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ quantity: 5 }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(400);
  });

  it('returns 404 when locationId does not exist', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ locationId: 'bad-loc' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(404);
  });

  it('updates source field as JSON', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLotUpdate.mockResolvedValue({
      ...baseLot,
      source: '{"type":"ebay","seller":"eBayStore"}',
    });

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ source: { type: 'ebay', seller: 'eBayStore' } }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    expect(mockLotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: JSON.stringify({ type: 'ebay', seller: 'eBayStore' }),
        }),
      })
    );
    const json = await res.json();
    expect(json.data.source).toEqual({ type: 'ebay', seller: 'eBayStore' });
  });

  it('clears locationId when set to null', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLotUpdate.mockResolvedValue({ ...baseLot, locationId: null, source: '{}' });

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ locationId: null }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    expect(mockLotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ locationId: null }),
      })
    );
  });
});
