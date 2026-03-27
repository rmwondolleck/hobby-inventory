import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const VALID_STATUSES: ProjectStatus[] = ['idea', 'planned', 'active', 'deployed', 'retired'];

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

    if (tagsParam) {
      const filterTags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const tagConditions = filterTags.map((tag) => ({
        tags: { contains: `"${tag}"` },
      }));
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...tagConditions];
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

    return NextResponse.json({ data, total, limit, offset });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'name must be a non-empty string' },
      { status: 400 },
    );
  }

  const status: ProjectStatus = (body.status as ProjectStatus | undefined) ?? 'idea';
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string')
    : [];

  const notes =
    body.notes !== undefined && body.notes !== null ? String(body.notes) : null;

  try {
    const project = await prisma.project.create({
      data: {
        name: body.name.trim(),
        status,
        tags: JSON.stringify(tags),
        notes,
      },
    });

    return NextResponse.json(
      {
        data: {
          ...project,
          tags,
          allocationCount: 0,
          allocationsByStatus: {},
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
