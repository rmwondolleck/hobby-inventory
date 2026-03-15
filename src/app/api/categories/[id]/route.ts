import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import type { ParameterDefinition } from '@/lib/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const category = await prisma.category.findUnique({ where: { id } });

    if (!category) {
      return NextResponse.json(
        { error: 'not_found', message: `Category ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...category,
      parameterSchema: safeParseJson<Record<string, ParameterDefinition>>(
        category.parameterSchema,
        {}
      ),
    });
  } catch (error) {
    console.error(`GET /api/categories/${id} error:`, error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Request body must be an object' },
      { status: 400 }
    );
  }

  const { name, parameterSchema } = body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return NextResponse.json(
      { error: 'validation_error', message: 'name must be a non-empty string' },
      { status: 400 }
    );
  }

  const updates: { name?: string; parameterSchema?: string } = {};

  if (name !== undefined) {
    updates.name = (name as string).trim();
  }

  if (parameterSchema !== undefined) {
    if (typeof parameterSchema !== 'object' || parameterSchema === null || Array.isArray(parameterSchema)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'parameterSchema must be an object' },
        { status: 400 }
      );
    }
    updates.parameterSchema = JSON.stringify(parameterSchema);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'validation_error', message: 'No valid fields provided for update' },
      { status: 400 }
    );
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      ...category,
      parameterSchema: safeParseJson<Record<string, ParameterDefinition>>(
        category.parameterSchema,
        {}
      ),
    });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'not_found', message: `Category ${id} not found` },
        { status: 404 }
      );
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const conflictName = updates.name ?? 'unknown';
      return NextResponse.json(
        { error: 'conflict', message: `Category name "${conflictName}" already exists` },
        { status: 409 }
      );
    }
    console.error(`PATCH /api/categories/${id} error:`, error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to update category' },
      { status: 500 }
    );
  }
}
