import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface HealthCounts {
  parts: number;
  lots: number;
  locations: number;
  projects: number;
  allocations: number;
  events: number;
}

interface DatabaseStatus {
  connected: boolean;
  counts: HealthCounts;
}

interface BasicHealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
}

interface DetailedHealthResponse extends BasicHealthResponse {
  database: DatabaseStatus;
}

export type HealthResponse = BasicHealthResponse | DetailedHealthResponse;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  const base: BasicHealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  };

  if (!detailed) {
    return NextResponse.json(base);
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [parts, lots, locations, projects, allocations, events] = await Promise.all([
      prisma.part.count(),
      prisma.lot.count(),
      prisma.location.count(),
      prisma.project.count(),
      prisma.allocation.count(),
      prisma.event.count(),
    ]);

    const response: DetailedHealthResponse = {
      ...base,
      database: {
        connected: true,
        counts: { parts, lots, locations, projects, allocations, events },
      },
    };
    return NextResponse.json(response);
  } catch {
    const response: DetailedHealthResponse = {
      ...base,
      status: 'degraded',
      database: {
        connected: false,
        counts: { parts: 0, lots: 0, locations: 0, projects: 0, allocations: 0, events: 0 },
      },
    };
    return NextResponse.json(response);
  }
}

