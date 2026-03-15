import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') ?? undefined;
    const statusParam = searchParams.get('status') ?? undefined;
    const tagsParam = searchParams.get('tags') ?? undefined;
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

    const where: Record<string, unknown> = {};

    if (!includeArchived) {
      where.archivedAt = null;
    }

    if (statusParam) {
      where.status = statusParam;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { notes: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          allocations: {
            select: { status: true },
          },
        },
      }),
    ]);

    type ProjectFromDB = (typeof projects)[number];

    let data = projects.map((project: ProjectFromDB) => {
      const tags = safeParseJson<string[]>(project.tags, []);
      const allocationsByStatus = project.allocations.reduce<Record<string, number>>(
        (acc, alloc) => {
          acc[alloc.status] = (acc[alloc.status] ?? 0) + 1;
          return acc;
        },
        {},
      );
      const { allocations: _allocations, ...rest } = project;
      return {
        ...rest,
        tags,
        allocationCount: project.allocations.length,
        allocationsByStatus,
      };
    });

    // In-memory tag filter
    if (tagsParam) {
      const filterTags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      data = data.filter((p) => filterTags.every((tag) => p.tags.includes(tag)));
    }

    return NextResponse.json({ data, total: tagsParam ? data.length : total, limit, offset });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
