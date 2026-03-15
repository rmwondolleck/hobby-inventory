import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const tags = searchParams.get('tags') ?? '';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    );
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (!includeArchived) {
      where.archivedAt = null;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { notes: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          allocations: {
            select: { status: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.project.count({ where }),
    ]);

    const tagFilter = tags.split(',').filter(Boolean);

    const enriched = projects.map((project) => {
      const parsedTags = safeJsonParse<string[]>(project.tags, []);
      const allocationsByStatus: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      project.allocations.forEach((a: any) => {
        allocationsByStatus[a.status] = (allocationsByStatus[a.status] ?? 0) + 1;
      });

      return {
        ...project,
        tags: parsedTags,
        allocationCount: project.allocations.length,
        allocationsByStatus,
        allocations: undefined,
      };
    });

    const filtered =
      tagFilter.length > 0
        ? enriched.filter((p) => tagFilter.some((t) => p.tags.includes(t)))
        : enriched;

    return NextResponse.json({
      data: filtered,
      total: tagFilter.length > 0 ? filtered.length : total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[GET /api/projects]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
