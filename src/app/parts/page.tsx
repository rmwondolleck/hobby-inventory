import type { Metadata } from 'next';
import { PartsListClient } from '@/features/parts/components/PartsListClient';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = {
  title: 'Parts — Hobby Inventory',
  description: 'Browse and manage your parts catalog',
};

export default function PartsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Parts"
          description="Browse and manage your parts catalog"
        />
        <PartsListClient />
      </div>
    </div>
  );
}
