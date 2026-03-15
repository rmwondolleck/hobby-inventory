import { NextResponse } from 'next/server';

type RouteParams = { params: Promise<{ type: string }> };

const TEMPLATES: Record<string, { headers: string; example: string }> = {
  parts: {
    headers: 'name,category,manufacturer,mpn,tags,notes',
    example: 'ATmega328P,Microcontroller,Microchip,ATmega328P-PU,8-bit;AVR;DIP,"28-pin DIP AVR MCU"',
  },
  lots: {
    headers: 'partName,partMpn,quantity,unit,locationPath,seller,sourceUrl,unitCost,currency,purchaseDate,notes',
    example: 'ATmega328P,ATmega328P-PU,10,pcs,Office/Shelf A/Drawer 2,Digi-Key,https://www.digikey.com/product/12345,1.75,USD,2024-01-15,"Bulk purchase"',
  },
  locations: {
    headers: 'path,notes',
    example: 'Office/Shelf A/Drawer 2,"Main work area drawer"',
  },
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { type } = await params;

  const template = TEMPLATES[type];
  if (!template) {
    return NextResponse.json(
      { error: 'not_found', message: `No template for type "${type}". Valid types: parts, lots, locations` },
      { status: 404 }
    );
  }

  const csv = [template.headers, template.example].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-template.csv"`,
    },
  });
}
