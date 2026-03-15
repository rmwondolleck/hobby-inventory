import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

type RouteParams = { params: Promise<{ id: string }> };

function parseSource(source: unknown): Record<string, unknown> {
  if (typeof source === 'string') {
    try {
      return JSON.parse(source) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    return source as Record<string, unknown>;
  }
  return {};
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [project, events] = await Promise.all([
      prisma.project.findUnique({
        where: { id },
        include: {
          allocations: {
            include: {
              lot: {
                include: {
                  location: { select: { id: true, name: true, path: true } },
                  part: { select: { id: true, name: true, category: true } },
                },
              },
            },
          },
        },
      }),
      prisma.event.findMany({
        where: { projectId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          lot: {
            include: {
              part: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    if (!project) {
      return NextResponse.json(
        { error: 'not_found', message: `Project ${id} not found` },
        { status: 404 },
      );
    }

    const tags = safeParseJson<string[]>(project.tags, []);

    const allocations = project.allocations.map((alloc) => ({
      ...alloc,
      lot: {
        ...alloc.lot,
        source: parseSource(alloc.lot.source),
      },
    }));

    const allocationsByStatus = allocations.reduce<Record<string, number>>((acc, alloc) => {
      acc[alloc.status] = (acc[alloc.status] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      data: {
        ...project,
        tags,
        allocations,
        allocationCount: allocations.length,
        allocationsByStatus,
        events,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
