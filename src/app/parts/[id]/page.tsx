import type { Metadata } from 'next';
import { PartDetailClient } from '@/features/parts/components/PartDetailClient';

export const metadata: Metadata = {
  title: 'Part Detail — Hobby Inventory',
};

export default function PartDetailPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <PartDetailClient />
      </div>
    </div>
  );
}
