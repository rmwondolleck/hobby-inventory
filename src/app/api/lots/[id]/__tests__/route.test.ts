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

const mockFindUnique = prisma.lot.findUnique as jest.Mock;
const mockUpdate = prisma.lot.update as jest.Mock;
const mockLocationFindUnique = prisma.location.findUnique as jest.Mock;

const basePart = {
  id: 'part001',
  name: 'ESP32',
  category: 'microcontroller',
  mpn: 'ESP32-WROOM-32',
};

const baseLocation = {
  id: 'loc001',
  name: 'Shelf A',
  path: 'Office/Shelf A',
};

const baseLot = {
  id: 'lot001',
  partId: 'part001',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: null,
  status: 'in_stock',
  locationId: 'loc001',
  source: '{"type":"digikey","seller":"Digi-Key","url":"https://www.digikey.com/en/products/detail/abc","unitCost":1.25,"currency":"USD"}',
  receivedAt: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  part: basePart,
  location: baseLocation,
  allocations: [],
  events: [],
};

function makeRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/lots/[id]', () => {
  it('returns 200 with lot data', async () => {
    mockFindUnique.mockResolvedValue(baseLot);

    const res = await GET(makeRequest('http://localhost/api/lots/lot001'), makeParams('lot001'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.id).toBe('lot001');
  });

  it('parses source JSON into object', async () => {
    mockFindUnique.mockResolvedValue(baseLot);

    const res = await GET(makeRequest('http://localhost/api/lots/lot001'), makeParams('lot001'));
    const json = await res.json();

    expect(json.data.source).toEqual({
      type: 'digikey',
      seller: 'Digi-Key',
      url: 'https://www.digikey.com/en/products/detail/abc',
      unitCost: 1.25,
      currency: 'USD',
    });
  });

  it('returns 404 when lot does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest('http://localhost/api/lots/nonexistent'), makeParams('nonexistent'));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('includes source URL for re-order link', async () => {
    mockFindUnique.mockResolvedValue(baseLot);

    const res = await GET(makeRequest('http://localhost/api/lots/lot001'), makeParams('lot001'));
    const json = await res.json();

    expect(json.data.source.url).toBe('https://www.digikey.com/en/products/detail/abc');
  });

  it('returns 500 on internal error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await GET(makeRequest('http://localhost/api/lots/lot001'), makeParams('lot001'));
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});

describe('PATCH /api/lots/[id]', () => {
  it('returns 404 when lot does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'low' }),
      }),
      makeParams('nonexistent')
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
  });

  it('updates lot fields and returns updated lot', async () => {
    mockFindUnique.mockResolvedValue(baseLot);
    mockUpdate.mockResolvedValue({
      ...baseLot,
      status: 'low',
      source: '{"type":"digikey","seller":"Digi-Key","url":"https://www.digikey.com/en/products/detail/abc","unitCost":1.25,"currency":"USD"}',
    });

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'low' }),
      }),
      makeParams('lot001')
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.status).toBe('low');
  });

  it('merges source fields (partial update)', async () => {
    mockFindUnique.mockResolvedValue(baseLot);
    mockUpdate.mockResolvedValue({
      ...baseLot,
      source: '{"type":"digikey","seller":"New Seller","url":"https://www.digikey.com/en/products/detail/abc","unitCost":1.25,"currency":"USD"}',
    });

    await PATCH(
      makeRequest('http://localhost/api/lots/lot001', {
        method: 'PATCH',
        body: JSON.stringify({ source: { seller: 'New Seller' } }),
      }),
      makeParams('lot001')
    );

    const callArgs = mockUpdate.mock.calls[0][0];
    const savedSource = JSON.parse(callArgs.data.source);
    expect(savedSource.seller).toBe('New Seller');
    // Should preserve existing fields
    expect(savedSource.type).toBe('digikey');
  });

  it('auto-detects source type when url is updated without type', async () => {
    mockFindUnique.mockResolvedValue({ ...baseLot, source: '{}' });
    mockUpdate.mockResolvedValue({ ...baseLot, source: '{"type":"mouser","url":"https://www.mouser.com/ProductDetail/abc"}' });

    await PATCH(
      makeRequest('http://localhost/api/lots/lot001', {
        method: 'PATCH',
        body: JSON.stringify({ source: { url: 'https://www.mouser.com/ProductDetail/abc' } }),
      }),
      makeParams('lot001')
    );

    const callArgs = mockUpdate.mock.calls[0][0];
    const savedSource = JSON.parse(callArgs.data.source);
    expect(savedSource.type).toBe('mouser');
  });

  it('returns 404 when locationId references non-existent location', async () => {
    mockFindUnique.mockResolvedValue(baseLot);
    mockLocationFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot001', {
        method: 'PATCH',
        body: JSON.stringify({ locationId: 'bad-loc' }),
      }),
      makeParams('lot001')
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error).toBe('not_found');
    expect(json.message).toContain('Location');
  });

  it('returns 500 on internal error', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB failure'));

    const res = await PATCH(
      makeRequest('http://localhost/api/lots/lot001', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'low' }),
      }),
      makeParams('lot001')
    );
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('internal_error');
  });
});
