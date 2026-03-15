import type { Metadata } from 'next';
import { PartsListClient } from '@/features/parts/components/PartsListClient';

export const metadata: Metadata = {
  title: 'Parts — Hobby Inventory',
  description: 'Browse and manage your parts catalog',
};

export default function PartsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Parts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage your parts catalog
          </p>
        </div>
        <PartsListClient />
      </div>
    </div>
  );
}
