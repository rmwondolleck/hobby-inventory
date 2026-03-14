import prisma from '@/lib/db';
import LocationTree from '@/components/locations/LocationTree';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({
    include: {
      _count: { select: { children: true, lots: true } },
    },
    orderBy: { path: 'asc' },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <p className="text-gray-500 text-sm mt-1">
          Browse and manage your storage hierarchy — rooms, shelves, drawers, and bins.
        </p>
      </div>
      <LocationTree locations={locations} />
    </div>
  );
}
