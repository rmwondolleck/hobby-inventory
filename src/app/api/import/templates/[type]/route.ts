import { NextResponse } from 'next/server';
import { buildCSVTemplate } from '@/lib/csv';

const TEMPLATES: Record<string, string[]> = {
  parts: ['name', 'category', 'manufacturer', 'mpn', 'tags', 'notes'],
  lots: ['partName', 'partMpn', 'quantity', 'unit', 'locationPath', 'seller', 'sourceUrl', 'unitCost', 'currency', 'purchaseDate', 'notes'],
  locations: ['path', 'notes'],
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  const columns = TEMPLATES[type];
  if (!columns) {
    return NextResponse.json(
      { error: 'NotFound', message: `No template for type "${type}". Valid: ${Object.keys(TEMPLATES).join(', ')}` },
      { status: 404 }
    );
  }

  const csv = buildCSVTemplate(columns);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="import-template-${type}.csv"`,
    },
  });
}

