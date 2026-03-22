import { GET } from '../route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    part: { count: jest.fn() },
    lot: { count: jest.fn() },
    location: { count: jest.fn() },
    project: { count: jest.fn() },
    allocation: { count: jest.fn() },
    event: { count: jest.fn() },
  },
}));

import prisma from '@/lib/db';

const mockQueryRaw = prisma.$queryRaw as jest.Mock;
const mockPartCount = prisma.part.count as jest.Mock;
const mockLotCount = prisma.lot.count as jest.Mock;
const mockLocationCount = prisma.location.count as jest.Mock;
const mockProjectCount = prisma.project.count as jest.Mock;
const mockAllocationCount = prisma.allocation.count as jest.Mock;
const mockEventCount = prisma.event.count as jest.Mock;

function makeRequest(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryRaw.mockResolvedValue([{ 1: 1 }]);
  mockPartCount.mockResolvedValue(10);
  mockLotCount.mockResolvedValue(20);
  mockLocationCount.mockResolvedValue(5);
  mockProjectCount.mockResolvedValue(3);
  mockAllocationCount.mockResolvedValue(7);
  mockEventCount.mockResolvedValue(100);
});

describe('GET /api/health', () => {
  it('returns basic health status without detailed param', async () => {
    const req = makeRequest('http://localhost/api/health');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(typeof json.timestamp).toBe('string');
    expect(typeof json.version).toBe('string');
    expect(json.database).toBeUndefined();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('returns detailed health with DB counts when ?detailed=true', async () => {
    const req = makeRequest('http://localhost/api/health?detailed=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.database.connected).toBe(true);
    expect(json.database.counts).toEqual({
      parts: 10,
      lots: 20,
      locations: 5,
      projects: 3,
      allocations: 7,
      events: 100,
    });
  });

  it('returns degraded status with connected=false when DB is unreachable', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

    const req = makeRequest('http://localhost/api/health?detailed=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('degraded');
    expect(json.database.connected).toBe(false);
    expect(json.database.counts).toEqual({
      parts: 0,
      lots: 0,
      locations: 0,
      projects: 0,
      allocations: 0,
      events: 0,
    });
  });

  it('still returns 200 even when DB connectivity check fails', async () => {
    mockQueryRaw.mockRejectedValue(new Error('timeout'));

    const req = makeRequest('http://localhost/api/health?detailed=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
  });
});
