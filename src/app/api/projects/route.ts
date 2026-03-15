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
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Math.min(isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit, MAX_LIMIT);
    const offset = isNaN(rawOffset) ? 0 : rawOffset;

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
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.project.count({ where }),
    ]);

    const projectIds = projects.map((p) => p.id);

    const allocationCounts =
      projectIds.length > 0
        ? await prisma.allocation.groupBy({
            by: ['projectId', 'status'],
            _count: { id: true },
            where: { projectId: { in: projectIds } },
          })
        : [];

    // Build a map of projectId → { total, byStatus }
    const allocationMap = new Map<string, { total: number; byStatus: Record<string, number> }>();
    for (const row of allocationCounts) {
      if (!allocationMap.has(row.projectId)) {
        allocationMap.set(row.projectId, { total: 0, byStatus: {} });
      }
      const entry = allocationMap.get(row.projectId)!;
      entry.total += row._count.id;
      entry.byStatus[row.status] = row._count.id;
    }

    const tagFilter = tags.split(',').filter(Boolean);

    const enriched = projects.map((project) => {
      const parsedTags = safeJsonParse<string[]>(project.tags, []);
      const counts = allocationMap.get(project.id) ?? { total: 0, byStatus: {} };

      return {
        ...project,
        tags: parsedTags,
        allocationCount: counts.total,
        allocationsByStatus: counts.byStatus,
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
