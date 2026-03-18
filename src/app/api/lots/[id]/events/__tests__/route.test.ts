import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findUnique: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/events', () => ({
  createEvent: jest.fn(),
}));

import prisma from '@/lib/db';
import { createEvent } from '@/lib/events';

const mockCreateEvent = createEvent as jest.Mock;

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const sampleEvent = {
  id: 'evt-1',
  lotId: 'lot-1',
  type: 'received',
  delta: 5,
  fromLocationId: null,
  toLocationId: null,
  projectId: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/lots/[id]/events', () => {
  it('returns events for an existing lot', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([sampleEvent]);

    const res = await GET(new Request('http://localhost/api/lots/lot-1/events'), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it('returns 404 when lot does not exist', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/lots/missing/events'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns empty list when lot has no events', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-empty' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new Request('http://localhost/api/lots/lot-empty/events'), {
      params: Promise.resolve({ id: 'lot-empty' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('queries events filtered by lotId ordered by createdAt desc', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    (mockPrisma.event.findMany as jest.Mock).mockResolvedValue([]);

    await GET(new Request('http://localhost/api/lots/lot-1/events'), {
      params: Promise.resolve({ id: 'lot-1' }),
    });

    expect(mockPrisma.event.findMany as jest.Mock).toHaveBeenCalledWith({
      where: { lotId: 'lot-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

// ─── POST /api/lots/[id]/events ───────────────────────────────────────────────

const createdEvent = {
  id: 'evt-new',
  lotId: 'lot-1',
  type: 'edited',
  delta: -3,
  fromLocationId: null,
  toLocationId: null,
  projectId: null,
  notes: 'used in repair',
  createdAt: new Date('2026-03-01T00:00:00Z'),
};

function makePostRequest(lotId: string, body: unknown): Request {
  return new Request(`http://localhost/api/lots/${lotId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/lots/[id]/events', () => {
  it('creates an event and returns 201', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    mockCreateEvent.mockResolvedValue(createdEvent);

    const res = await POST(makePostRequest('lot-1', { type: 'edited', delta: -3, notes: 'used in repair' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('evt-new');
    expect(body.data.type).toBe('edited');
  });

  it('calls createEvent with correct arguments', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    mockCreateEvent.mockResolvedValue(createdEvent);

    await POST(makePostRequest('lot-1', { type: 'received', delta: 10, notes: 'restock' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });

    expect(mockCreateEvent).toHaveBeenCalledWith({
      lotId: 'lot-1',
      type: 'received',
      delta: 10,
      notes: 'restock',
    });
  });

  it('creates an event without optional fields', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    mockCreateEvent.mockResolvedValue({ ...createdEvent, delta: undefined, notes: undefined });

    const res = await POST(makePostRequest('lot-1', { type: 'scrapped' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });

    expect(res.status).toBe(201);
    expect(mockCreateEvent).toHaveBeenCalledWith({
      lotId: 'lot-1',
      type: 'scrapped',
      delta: undefined,
      notes: undefined,
    });
  });

  it('returns 404 when lot does not exist', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makePostRequest('missing', { type: 'edited', delta: -1 }), {
      params: Promise.resolve({ id: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('not_found');
  });

  it('returns 400 for invalid JSON body', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });

    const req = new Request('http://localhost/api/lots/lot-1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'lot-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('invalid_json');
  });

  it('returns 400 when type field is missing', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });

    const res = await POST(makePostRequest('lot-1', { delta: 5 }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('returns 400 when type is not a valid EventType', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });

    const res = await POST(makePostRequest('lot-1', { type: 'destroyed' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('returns 400 when delta is provided but not a number', async () => {
    (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });

    const res = await POST(makePostRequest('lot-1', { type: 'edited', delta: 'five' }), {
      params: Promise.resolve({ id: 'lot-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('validation_error');
  });

  it('accepts all valid event types', async () => {
    const validTypes = ['created', 'received', 'moved', 'allocated', 'installed', 'returned', 'lost', 'scrapped', 'edited'];

    for (const type of validTypes) {
      (mockPrisma.lot.findUnique as jest.Mock).mockResolvedValue({ id: 'lot-1' });
      mockCreateEvent.mockResolvedValue({ ...createdEvent, type });

      const res = await POST(makePostRequest('lot-1', { type }), {
        params: Promise.resolve({ id: 'lot-1' }),
      });

      expect(res.status).toBe(201);
    }
  });
});
