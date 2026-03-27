import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PartsListClient } from '@/features/parts/components/PartsListClient';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = {
  title: 'Parts — Hobby Inventory',
  description: 'Browse and manage your parts catalog',
};

export default function PartsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Parts"
          description="Browse and manage your parts catalog"
        />
        <Suspense fallback={null}>
          <PartsListClient />
        </Suspense>
      </div>
    </div>
  );
}
