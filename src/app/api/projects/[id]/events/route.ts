import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      return NextResponse.json(
        { error: 'not_found', message: 'Project not found' },
        { status: 404 },
      );
    }

    const events = await prisma.event.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: events, total: events.length });
  } catch {
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
