import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import type { ProjectStatus } from '@/lib/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const VALID_STATUSES: ProjectStatus[] = ['idea', 'planned', 'active', 'deployed', 'retired'];

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .filter((t) => typeof t === 'string')
      .map((t) => (t as string).trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') ?? undefined;
  const statusParam = searchParams.get('status') ?? undefined;
  const tagsParam = searchParams.get('tags') ?? undefined;
  const archived = searchParams.get('archived');
  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const includeArchived = archived === 'true';
  const tagList = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

  // Parse comma-separated status list
  const statusList = statusParam
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const where = {
    ...(!includeArchived ? { archivedAt: null } : {}),
    ...(statusList && statusList.length > 0 ? { status: { in: statusList } } : {}),
    ...(q || tagList.length > 0
      ? {
          AND: [
            ...(q
              ? [
                  {
                    OR: [
                      { name: { contains: q } },
                      { notes: { contains: q } },
                      { tags: { contains: q } },
                      { wishlistNotes: { contains: q } },
                    ],
                  },
                ]
              : []),
            ...(tagList.length > 0 ? tagList.map((tag) => ({ tags: { contains: tag } })) : []),
          ],
        }
      : {}),
  };

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const data = projects.map((project: (typeof projects)[number]) => ({
    ...project,
    tags: safeParseJson<string[]>(project.tags, []),
  }));

  return NextResponse.json({ data, total, limit, offset });
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

  const { name, status, notes, tags, wishlistNotes } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'name is required' },
      { status: 400 },
    );
  }

  const projectStatus = (status ?? 'idea') as string;
  if (!VALID_STATUSES.includes(projectStatus as ProjectStatus)) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      name: (name as string).trim(),
      status: projectStatus,
      notes: notes && typeof notes === 'string' ? notes : undefined,
      tags: JSON.stringify(parseTags(tags)),
      wishlistNotes:
        wishlistNotes && typeof wishlistNotes === 'string' ? wishlistNotes : undefined,
    },
  });

  return NextResponse.json(
    {
      data: {
        ...project,
        tags: safeParseJson<string[]>(project.tags, []),
      },
    },
    { status: 201 },
  );
}
