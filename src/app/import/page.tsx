import type { Metadata } from 'next';
import { ImportForm } from '@/features/import/components/ImportForm';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = {
  title: 'Import CSV — Hobby Inventory',
  description: 'Bulk-import parts, locations, and lots from CSV files',
};

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader
          title="CSV Import"
          description="Bulk-import locations, parts, and lots from CSV files. Always run a dry-run first."
        />
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <strong>Recommended order:</strong> Import <em>locations</em> first, then <em>parts</em>, then <em>lots</em>.
          Lots must reference existing parts and locations by name/path.
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <ImportForm />
        </div>
      </div>
    </div>
  );
}

