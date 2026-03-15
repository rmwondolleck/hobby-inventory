import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        allocations: {
          include: {
            lot: {
              include: {
                location: {
                  select: { id: true, name: true, path: true },
                },
                part: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'not_found', message: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch events linked to this project
    const events = await prisma.event.findMany({
      where: { projectId: id },
      include: {
        lot: {
          include: {
            part: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allocationsByStatus = project.allocations.reduce<Record<string, number>>(
      (acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const data = {
      ...project,
      tags: safeJsonParse<string[]>(project.tags, []),
      allocationCount: project.allocations.length,
      allocationsByStatus,
      allocations: project.allocations.map((allocation) => ({
        ...allocation,
        lot: {
          ...allocation.lot,
          source: safeJsonParse<Record<string, unknown>>(allocation.lot.source, {}),
        },
      })),
      events,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/projects/[id]]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}
