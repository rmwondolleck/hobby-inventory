import { GET, PATCH, DELETE } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    location: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
const mockLotFindUnique = prisma.lot.findUnique as jest.Mock;
const mockLotUpdate = prisma.lot.update as jest.Mock;
const mockLotDelete = prisma.lot.delete as jest.Mock;

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
  part: { id: 'part-1', name: 'Capacitor' },
  location: { id: 'loc-1', name: 'Drawer 1', path: 'Office/Shelf A/Drawer 1' },
  allocations: [],
  events: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// --- GET /api/lots/[id] ---

describe('GET /api/lots/[id]', () => {
  it('returns 200 with lot detail', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);

    const res = await GET(
      makeRequest('http://localhost/api/lots/lot-1'),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('lot-1');
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
    expect(json.allocations).toHaveLength(1);
    expect(json.events).toHaveLength(1);
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

// --- PATCH /api/lots/[id] ---

describe('PATCH /api/lots/[id]', () => {
  it('updates notes and returns 200', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    const updated = { ...baseLot, notes: 'Updated note', part: { id: 'part-1', name: 'Capacitor' }, location: baseLot.location };
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
    expect(json.notes).toBe('Updated note');
  });

  it('updates status field', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    const updated = { ...baseLot, status: 'low', part: { id: 'part-1', name: 'Capacitor' }, location: baseLot.location };
    mockLotUpdate.mockResolvedValue(updated);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'low' }),
      }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(200);
    expect(mockLotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'low' }),
      })
    );
  });

  it('clears locationId when set to null', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLotUpdate.mockResolvedValue({ ...baseLot, locationId: null, part: { id: 'part-1', name: 'Capacitor' }, location: null });

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

  it('trims whitespace from notes', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLotUpdate.mockResolvedValue({ ...baseLot, notes: 'trimmed note', part: { id: 'part-1', name: 'Capacitor' }, location: baseLot.location });

    await PATCH(
      makeRequest('http://localhost/api/lots/lot-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: '  trimmed note  ' }),
      }),
      makeParams('lot-1')
    );

    expect(mockLotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: 'trimmed note' }),
      })
    );
  });
});

// --- DELETE /api/lots/[id] ---

describe('DELETE /api/lots/[id]', () => {
  it('deletes a lot and returns 204', async () => {
    mockLotFindUnique.mockResolvedValue(baseLot);
    mockLotDelete.mockResolvedValue(baseLot);

    const res = await DELETE(
      makeRequest('http://localhost/api/lots/lot-1', { method: 'DELETE' }),
      makeParams('lot-1')
    );

    expect(res.status).toBe(204);
    expect(mockLotDelete).toHaveBeenCalledWith({ where: { id: 'lot-1' } });
  });

  it('returns 404 when lot does not exist', async () => {
    mockLotFindUnique.mockResolvedValue(null);

    const res = await DELETE(
      makeRequest('http://localhost/api/lots/nonexistent', { method: 'DELETE' }),
      makeParams('nonexistent')
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('not_found');
  });
});
