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

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        lots: {
          include: {
            location: true,
            allocations: {
              include: {
                project: {
                  select: { id: true, name: true, status: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!part) {
      return NextResponse.json(
        { error: 'not_found', message: 'Part not found' },
        { status: 404 }
      );
    }

    const data = {
      ...part,
      tags: safeJsonParse<string[]>(part.tags, []),
      parameters: safeJsonParse<Record<string, unknown>>(part.parameters, {}),
      lots: part.lots.map((lot) => ({
        ...lot,
        source: safeJsonParse<Record<string, unknown>>(lot.source, {}),
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/parts/[id]]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch part' },
      { status: 500 }
    );
  }
}
