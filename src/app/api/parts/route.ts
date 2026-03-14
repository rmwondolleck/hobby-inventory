import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const tagsParam = searchParams.get('tags') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const tagList = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const where: Prisma.PartWhereInput = {
    archivedAt: null,
    ...(category ? { category } : {}),
    ...(q || tagList.length > 0
      ? {
          AND: [
            ...(q
              ? [
                  {
                    OR: [
                      { name: { contains: q } },
                      { mpn: { contains: q } },
                      { manufacturer: { contains: q } },
                      { tags: { contains: q } },
                      { notes: { contains: q } },
                    ],
                  },
                ]
              : []),
            ...(tagList.length > 0
              ? tagList.map((tag) => ({ tags: { contains: tag } }))
              : []),
          ],
        }
      : {}),
  };

  const [total, parts] = await Promise.all([
    prisma.part.count({ where }),
    prisma.part.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const data = parts.map((part: (typeof parts)[number]) => ({
    ...part,
    tags: (() => { try { return JSON.parse(part.tags); } catch { return []; } })(),
    parameters: (() => { try { return JSON.parse(part.parameters); } catch { return {}; } })(),
  }));

  return NextResponse.json({ data, total, limit, offset });
}
