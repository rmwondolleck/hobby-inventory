import { POST } from '../validate/route';
import { POST as POSTExecute } from '../execute/route';

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    location: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    lot: { findMany: jest.fn(), create: jest.fn() },
    event: { create: jest.fn() },
  },
}));

jest.mock('@/lib/events', () => ({
  createEvent: jest.fn().mockResolvedValue({}),
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/import/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Validate – input validation
// ---------------------------------------------------------------------------

describe('POST /api/import/validate – input validation', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/import/validate', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown type', async () => {
    const res = await POST(makeRequest({ type: 'widgets', csv: 'a,b\n1,2' }));
    expect(res.status).toBe(400);
    const json = await res.json() as { message: string };
    expect(json.message).toMatch(/type must be one of/);
  });

  it('returns 400 when csv is empty', async () => {
    const res = await POST(makeRequest({ type: 'parts', csv: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when csv has only a header', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([]);
    const res = await POST(makeRequest({ type: 'parts', csv: 'name,category\n' }));
    expect(res.status).toBe(400);
    const json = await res.json() as { message: string };
    expect(json.message).toMatch(/no data rows/i);
  });
});

// ---------------------------------------------------------------------------
// Validate – parts happy path
// ---------------------------------------------------------------------------

describe('POST /api/import/validate – parts', () => {
  beforeEach(() => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('returns 200 with plan for valid parts CSV', async () => {
    const csv = 'name,category,mpn\nESP32,MCU,ESP32-WROOM\nArduino,,';
    const res = await POST(makeRequest({ type: 'parts', csv }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { willCreate: number; errorCount: number } };
    expect(json.data.willCreate).toBe(2);
    expect(json.data.errorCount).toBe(0);
  });

  it('marks duplicate parts (by MPN) as update', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'existing-1', name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' },
    ]);
    const csv = 'name,category,mpn\nESP32,MCU,ESP32-WROOM';
    const res = await POST(makeRequest({ type: 'parts', csv }));
    const json = await res.json() as { data: { willUpdate: number; willCreate: number } };
    expect(json.data.willUpdate).toBe(1);
    expect(json.data.willCreate).toBe(0);
  });

  it('returns error row for parts with no name', async () => {
    const csv = 'name,category\n,MCU';
    const res = await POST(makeRequest({ type: 'parts', csv }));
    const json = await res.json() as { data: { errorCount: number } };
    expect(json.data.errorCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Validate – locations happy path
// ---------------------------------------------------------------------------

describe('POST /api/import/validate – locations', () => {
  beforeEach(() => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('returns willCreate for new locations', async () => {
    const csv = 'path,notes\nOffice/Shelf A,';
    const res = await POST(makeRequest({ type: 'locations', csv }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { willCreate: number } };
    // "Office" (ancestor) + "Office/Shelf A" (leaf) = 2 creates
    expect(json.data.willCreate).toBe(2);
  });

  it('returns error for rows missing path', async () => {
    const csv = 'path,notes\n,my note';
    const res = await POST(makeRequest({ type: 'locations', csv }));
    const json = await res.json() as { data: { errorCount: number } };
    expect(json.data.errorCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Validate – lots
// ---------------------------------------------------------------------------

describe('POST /api/import/validate – lots', () => {
  beforeEach(() => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'part-1', name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' },
    ]);
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc-1', path: 'Office/Shelf A' },
    ]);
  });

  it('resolves part by MPN and location by path', async () => {
    const csv = 'partName,partMpn,quantity,locationPath\n,ESP32-WROOM,10,Office/Shelf A';
    const res = await POST(makeRequest({ type: 'lots', csv }));
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { willCreate: number; errorCount: number } };
    expect(json.data.willCreate).toBe(1);
    expect(json.data.errorCount).toBe(0);
  });

  it('errors when part not found', async () => {
    const csv = 'partName,partMpn,quantity\nUnknownPart,,5';
    const res = await POST(makeRequest({ type: 'lots', csv }));
    const json = await res.json() as { data: { errorCount: number } };
    expect(json.data.errorCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Execute – aborts on errors
// ---------------------------------------------------------------------------

describe('POST /api/import/execute – aborts on errors', () => {
  beforeEach(() => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('returns 422 when CSV has error rows', async () => {
    const makeExec = (body: unknown) =>
      new Request('http://localhost/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    const csv = 'name,category\n,MCU'; // blank name → error
    const res = await POSTExecute(makeExec({ type: 'parts', csv }));
    expect(res.status).toBe(422);
  });
});

