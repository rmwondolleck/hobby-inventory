import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';
import { DEFAULT_CATEGORY_TEMPLATES } from '@/lib/categories/defaults';
import type { ParameterDefinition } from '@/lib/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT)), MAX_LIMIT);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const includeDefaults = searchParams.get('includeDefaults') !== 'false';

  try {
    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({ take: limit, skip: offset, orderBy: { name: 'asc' } }),
      prisma.category.count(),
    ]);

    const data = categories.map((cat: { id: string; name: string; parameterSchema: string; createdAt: Date; updatedAt: Date }) => ({
      ...cat,
      parameterSchema: safeParseJson<Record<string, ParameterDefinition>>(cat.parameterSchema, {}),
    }));

    if (includeDefaults && offset === 0) {
      const existingNames = new Set(data.map((c: { name: string }) => c.name));
      const defaults = Object.entries(DEFAULT_CATEGORY_TEMPLATES)
        .filter(([name]) => !existingNames.has(name))
        .map(([name, parameterSchema]) => ({
          id: null,
          name,
          parameterSchema,
          createdAt: null,
          updatedAt: null,
          isDefault: true,
        }));

      return NextResponse.json({
        data,
        defaults,
        total,
        limit,
        offset,
      });
    }

    return NextResponse.json({ data, total, limit, offset });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

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

  const { name, parameterSchema } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'name is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  const schema: Record<string, ParameterDefinition> =
    parameterSchema && typeof parameterSchema === 'object' && !Array.isArray(parameterSchema)
      ? (parameterSchema as Record<string, ParameterDefinition>)
      : {};

  // If parameterSchema is omitted and name matches a default template, use that
  const defaultSchema = DEFAULT_CATEGORY_TEMPLATES[name.trim()];
  const resolvedSchema = Object.keys(schema).length === 0 && defaultSchema ? defaultSchema : schema;

  try {
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        parameterSchema: JSON.stringify(resolvedSchema),
      },
    });

    return NextResponse.json(
      {
        ...category,
        parameterSchema: safeParseJson<Record<string, ParameterDefinition>>(
          category.parameterSchema,
          {}
        ),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'conflict', message: `Category "${name.trim()}" already exists` },
        { status: 409 }
      );
    }
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create category' },
      { status: 500 }
    );
  }
}
