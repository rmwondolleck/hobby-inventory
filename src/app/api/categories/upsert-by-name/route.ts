import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { DEFAULT_CATEGORY_TEMPLATES } from '@/lib/categories/defaults';
import type { ParameterDefinition } from '@/lib/types';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Request body must be an object' },
      { status: 400 }
    );
  }

  const { name } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'name is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();

  try {
    const existing = await prisma.category.findUnique({ where: { name: trimmedName } });

    if (existing) {
      return NextResponse.json({
        ...existing,
        parameterSchema: safeParseJson<Record<string, ParameterDefinition>>(
          existing.parameterSchema,
          {}
        ),
      });
    }

    const defaultSchema = DEFAULT_CATEGORY_TEMPLATES[trimmedName] ?? {};
    const created = await prisma.category.create({
      data: {
        name: trimmedName,
        parameterSchema: JSON.stringify(defaultSchema),
      },
    });

    return NextResponse.json(
      {
        ...created,
        parameterSchema: safeParseJson<Record<string, ParameterDefinition>>(
          created.parameterSchema,
          {}
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/categories/upsert-by-name error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to upsert category' },
      { status: 500 }
    );
  }
}
