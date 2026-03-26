import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

const EXCLUDED_STATUSES = ['scrapped', 'lost'];

interface SourceData {
  unitCost?: number;
  [key: string]: unknown;
}

interface CategoryValue {
  category: string;
  value: number;
}

export async function GET() {
  const lots = await prisma.lot.findMany({
    where: {
      status: { notIn: EXCLUDED_STATUSES },
      quantityMode: 'exact',
    },
    select: {
      id: true,
      quantity: true,
      source: true,
      part: {
        select: {
          category: true,
        },
      },
    },
  });

  let totalValue = 0;
  let lotsWithCostData = 0;
  let lotsWithoutCostData = 0;
  const categoryValueMap = new Map<string, number>();

  for (const lot of lots) {
    const source = safeParseJson<SourceData>(lot.source, {});
    const unitCost = source.unitCost;

    if (typeof unitCost !== 'number' || unitCost <= 0 || lot.quantity === null) {
      lotsWithoutCostData++;
      continue;
    }

    const value = unitCost * lot.quantity;
    totalValue += value;
    lotsWithCostData++;

    const category = lot.part.category ?? 'Uncategorized';
    categoryValueMap.set(category, (categoryValueMap.get(category) ?? 0) + value);
  }

  const valueByCategoryTop5: CategoryValue[] = Array.from(categoryValueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }));

  return NextResponse.json({
    totalValue: Math.round(totalValue * 100) / 100,
    currency: 'USD',
    note: 'No FX conversion performed; all stored unit costs are assumed to be in USD.',
    valueByCategoryTop5,
    lotsWithCostData,
    lotsWithoutCostData,
    computedAt: new Date().toISOString(),
  });
}
