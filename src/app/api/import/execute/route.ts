import { NextResponse } from 'next/server';
import { parseCSV, csvRowsToRecords } from '@/lib/csv';
import { planImport, executeImport } from '@/lib/import';
import type { ImportType } from '@/lib/import/types';

const VALID_TYPES: ImportType[] = ['parts', 'lots', 'locations'];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'BadRequest', message: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, csv } = body as { type?: unknown; csv?: unknown };

  if (!type || !VALID_TYPES.includes(type as ImportType)) {
    return NextResponse.json(
      { error: 'BadRequest', message: `type must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  if (typeof csv !== 'string' || csv.trim() === '') {
    return NextResponse.json(
      { error: 'BadRequest', message: 'csv must be a non-empty string' },
      { status: 400 }
    );
  }

  let rows: Record<string, string>[];
  try {
    const parsed = parseCSV(csv);
    const records = csvRowsToRecords(parsed);
    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'CSV has no data rows (only a header or is empty)' },
        { status: 400 }
      );
    }
    rows = records;
  } catch {
    return NextResponse.json(
      { error: 'BadRequest', message: 'Failed to parse CSV content' },
      { status: 400 }
    );
  }

  try {
    const plan = await planImport(type as ImportType, rows);

    // Abort if there are any hard errors
    if (plan.errorCount > 0) {
      return NextResponse.json(
        {
          error: 'ValidationFailed',
          message: `${plan.errorCount} row(s) have errors. Fix them before executing.`,
          data: plan,
        },
        { status: 422 }
      );
    }

    const summary = await executeImport(plan);
    return NextResponse.json({ data: summary }, { status: 201 });
  } catch (err) {
    console.error('[import/execute]', err);
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to execute import' },
      { status: 500 }
    );
  }
}

