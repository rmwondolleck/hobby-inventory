import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { safeParseJson } from '@/lib/utils';

const ACTIVE_ALLOCATION_STATUSES = ['reserved', 'in_use', 'deployed'] as const;
const VALID_AVAILABILITY = ['any', 'available', 'in_stock_only'] as const;
type Availability = (typeof VALID_AVAILABILITY)[number];

// Lot statuses that indicate the item is gone/unusable
const GONE_STATUSES = ['lost', 'scrapped'];

/**
 * Parse `parameters.*` query params from the URL.
 * e.g. ?parameters.ble=true&parameters.voltage=3.3V => { ble: 'true', voltage: '3.3V' }
 */
function parseParameterFilters(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of Array.from(searchParams.entries())) {
    if (key.startsWith('parameters.')) {
      const paramKey = key.slice('parameters.'.length);
      if (paramKey) filters[paramKey] = value;
    }
  }
  return filters;
}

/**
 * Match a part's parsed parameters object against the filter map.
 * Coerces booleans and numbers for comparison.
 */
function matchesParameterFilters(
  parameters: Record<string, unknown>,
  filters: Record<string, string>
): boolean {
  for (const [key, rawValue] of Object.entries(filters)) {
    const actual = parameters[key];
    if (actual === undefined) return false;

    if (rawValue === 'true' || rawValue === 'false') {
      if (actual !== (rawValue === 'true')) return false;
    } else if (rawValue.trim() !== '' && !isNaN(Number(rawValue))) {
      if (Number(actual) !== Number(rawValue)) return false;
    } else {
      if (String(actual) !== rawValue) return false;
    }
  }
  return true;
}

/** Priority order for lot status when sorting results. Lower = better. */
function lotStatusPriority(status: string): number {
  if (status === 'in_stock' || status === 'low') return 0;
  if (status === 'reserved') return 1;
  if (status === 'installed') return 2;
  return 3;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get('category');
  const rawAvailability = searchParams.get('availability') ?? 'available';
  const projectId = searchParams.get('projectId') ?? undefined;
  const paramFilters = parseParameterFilters(searchParams);

  if (!category || category.trim() === '') {
    return NextResponse.json(
      { error: 'validation_error', message: 'category is required' },
      { status: 400 }
    );
  }

  if (!VALID_AVAILABILITY.includes(rawAvailability as Availability)) {
    return NextResponse.json(
      {
        error: 'validation_error',
        message: `availability must be one of: ${VALID_AVAILABILITY.join(', ')}`,
      },
      { status: 400 }
    );
  }
  const availability = rawAvailability as Availability;

  try {
    // Fetch all non-archived parts in this category
    const parts = await prisma.part.findMany({
      where: { category: category.trim(), archivedAt: null },
      orderBy: { name: 'asc' },
    });

    // Apply parameter filters in-memory (same strategy as /api/parts)
    const hasParamFilters = Object.keys(paramFilters).length > 0;
    const filteredParts = hasParamFilters
      ? parts.filter((part: { parameters: string }) => {
          const params = safeParseJson<Record<string, unknown>>(part.parameters, {});
          return matchesParameterFilters(params, paramFilters);
        })
      : parts;

    if (filteredParts.length === 0) {
      return NextResponse.json({
        matches: [],
        total: 0,
        message: 'No parts found matching the specified criteria',
      });
    }

    // Determine which lot statuses to exclude based on availability mode
    const excludedLotStatuses: string[] = [...GONE_STATUSES];
    if (availability === 'available' || availability === 'in_stock_only') {
      excludedLotStatuses.push('out');
    }
    // in_stock_only also excludes items that are fully reserved
    if (availability === 'in_stock_only') {
      excludedLotStatuses.push('reserved');
    }

    const partIds = filteredParts.map((p: { id: string }) => p.id);

    // Fetch lots for all matching parts with their active allocations and location
    const lots = await prisma.lot.findMany({
      where: {
        partId: { in: partIds },
        status: { notIn: excludedLotStatuses },
      },
      include: {
        location: { select: { id: true, name: true, path: true } },
        allocations: {
          where: { status: { in: Array.from(ACTIVE_ALLOCATION_STATUSES) } },
          select: { id: true, projectId: true, quantity: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group lots by partId
    const lotsByPartId = new Map<string, typeof lots>();
    for (const lot of lots) {
      const existing = lotsByPartId.get(lot.partId) ?? [];
      existing.push(lot);
      lotsByPartId.set(lot.partId, existing);
    }

    // Build match results
    const matches: Array<{
      part: {
        id: string;
        name: string;
        category: string | null;
        manufacturer: string | null;
        mpn: string | null;
        parameters: Record<string, unknown>;
        tags: string[];
      };
      lots: Array<{
        id: string;
        available: number | null;
        total: number | null;
        quantityMode: string;
        qualitativeStatus: string | null;
        unit: string | null;
        status: string;
        location: string | null;
        allocations: Array<{ projectId: string; quantity: number | null; status: string }>;
      }>;
      totalAvailable: number;
    }> = [];

    for (const part of filteredParts) {
      const partLots = lotsByPartId.get(part.id) ?? [];
      const processedLots: (typeof matches)[0]['lots'] = [];

      for (const lot of partLots) {
        // Skip lots already allocated to the requesting project
        if (projectId) {
          const alreadyAllocated = lot.allocations.some(
            (a: { projectId: string }) => a.projectId === projectId
          );
          if (alreadyAllocated) continue;
        }

        // Compute available quantity for exact-count lots
        const allocatedTotal = lot.allocations.reduce(
          (sum: number, a: { quantity: number | null }) => sum + (a.quantity ?? 0),
          0
        );
        const available =
          lot.quantityMode === 'exact' && lot.quantity !== null
            ? lot.quantity - allocatedTotal
            : null;

        // For 'available' mode: skip exact lots with no available units
        if (
          (availability === 'available' || availability === 'in_stock_only') &&
          lot.quantityMode === 'exact' &&
          available !== null &&
          available <= 0
        ) {
          continue;
        }

        processedLots.push({
          id: lot.id,
          available,
          total: lot.quantity,
          quantityMode: lot.quantityMode,
          qualitativeStatus: lot.qualitativeStatus,
          unit: lot.unit,
          status: lot.status,
          location: lot.location?.path ?? lot.location?.name ?? null,
          allocations: lot.allocations.map((a: { projectId: string; quantity: number | null; status: string }) => ({
            projectId: a.projectId,
            quantity: a.quantity,
            status: a.status,
          })),
        });
      }

      if (processedLots.length === 0) continue;

      // Sort lots: available (in_stock/low) first, then reserved, then installed
      processedLots.sort(
        (a, b) => lotStatusPriority(a.status) - lotStatusPriority(b.status)
      );

      const totalAvailable = processedLots.reduce(
        (sum, lot) => (lot.available !== null ? sum + lot.available : sum),
        0
      );

      matches.push({
        part: {
          id: part.id,
          name: part.name,
          category: part.category,
          manufacturer: part.manufacturer,
          mpn: part.mpn,
          parameters: safeParseJson<Record<string, unknown>>(part.parameters, {}),
          tags: safeParseJson<string[]>(part.tags, []),
        },
        lots: processedLots,
        totalAvailable,
      });
    }

    const response: {
      matches: typeof matches;
      total: number;
      message?: string;
    } = {
      matches,
      total: matches.length,
    };

    if (matches.length === 0) {
      response.message = 'No matching inventory found for the specified criteria';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/inventory/match error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to query inventory' },
      { status: 500 }
    );
  }
}
