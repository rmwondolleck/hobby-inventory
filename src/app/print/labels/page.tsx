import { Suspense } from 'react';
import prisma from '@/lib/db';
import LabelsView, { type LabelItem, type LabelSize } from '@/components/labels/LabelsView';

interface PageProps {
  searchParams: Promise<{
    type?: string;
    ids?: string;
    locationId?: string;
    size?: string;
  }>;
}

async function fetchLabels(
  type: string,
  ids: string[],
  locationId: string | undefined
): Promise<LabelItem[]> {
  if (type === 'location') {
    const where = ids.length > 0 ? { id: { in: ids } } : {};
    const locations = await prisma.location.findMany({
      where,
      orderBy: { path: 'asc' },
    });
    return locations.map((loc) => ({
      type: 'location' as const,
      data: { id: loc.id, name: loc.name, path: loc.path },
    }));
  }

  if (type === 'lot') {
    const where =
      ids.length > 0
        ? { id: { in: ids } }
        : locationId
          ? { locationId }
          : {};
    const lots = await prisma.lot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        part: { select: { name: true } },
        location: { select: { path: true } },
      },
    });
    return lots.map((lot) => ({
      type: 'lot' as const,
      data: {
        id: lot.id,
        partName: lot.part.name,
        quantity: lot.quantity,
        quantityMode: lot.quantityMode,
        qualitativeStatus: lot.qualitativeStatus,
        unit: lot.unit,
        locationPath: lot.location?.path,
      },
    }));
  }

  return [];
}

async function LabelsContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const type = params.type ?? 'location';
  const ids = params.ids ? params.ids.split(',').filter(Boolean) : [];
  const locationId = params.locationId;
  const size: LabelSize = (['small', 'medium', 'large'].includes(params.size ?? '')
    ? (params.size as LabelSize)
    : 'medium');

  const labels = await fetchLabels(type, ids, locationId);

  return <LabelsView labels={labels} initialSize={size} />;
}

export const metadata = {
  title: 'Print Labels — Hobby Inventory',
};

export default function LabelsPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 32, color: '#9ca3af', fontSize: 16 }}>Loading labels…</div>
      }
    >
      <LabelsContent {...props} />
    </Suspense>
  );
}
