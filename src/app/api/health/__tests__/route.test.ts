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
});

describe('GET /api/health', () => {
  it('returns basic health response without ?detailed=true', async () => {
    const response = await GET(makeRequest('http://localhost/api/health'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.version).toBe('string');
    expect(body.database).toBeUndefined();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it('returns detailed health with DB counts when ?detailed=true and DB is reachable', async () => {
    mockQueryRaw.mockResolvedValue([{ '1': 1 }]);
    mockPartCount.mockResolvedValue(10);
    mockLotCount.mockResolvedValue(20);
    mockLocationCount.mockResolvedValue(5);
    mockProjectCount.mockResolvedValue(3);
    mockAllocationCount.mockResolvedValue(7);
    mockEventCount.mockResolvedValue(50);

    const response = await GET(makeRequest('http://localhost/api/health?detailed=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database.connected).toBe(true);
    expect(body.database.counts).toEqual({
      parts: 10,
      lots: 20,
      locations: 5,
      projects: 3,
      allocations: 7,
      events: 50,
    });
  });

  it('returns degraded status with connected: false when DB is unreachable', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

    const response = await GET(makeRequest('http://localhost/api/health?detailed=true'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.database.connected).toBe(false);
    expect(body.database.counts).toEqual({
      parts: 0,
      lots: 0,
      locations: 0,
      projects: 0,
      allocations: 0,
      events: 0,
    });
  });
});
