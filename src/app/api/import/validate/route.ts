import { NextResponse } from 'next/server';
import { validateImport } from '@/lib/import/processor';
import type { ImportType } from '@/lib/import/types';

const VALID_TYPES: ImportType[] = ['parts', 'lots', 'locations'];

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

  const { type, csv, overrideDuplicates } = body as Record<string, unknown>;

  if (!type || !VALID_TYPES.includes(type as ImportType)) {
    return NextResponse.json(
      { error: 'validation_error', message: `type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!csv || typeof csv !== 'string' || csv.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'csv must be a non-empty string' },
      { status: 400 }
    );
  }

  try {
    const summary = await validateImport(
      type as ImportType,
      csv as string,
      overrideDuplicates === true
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('POST /api/import/validate error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to validate import' },
      { status: 500 }
    );
  }
}
