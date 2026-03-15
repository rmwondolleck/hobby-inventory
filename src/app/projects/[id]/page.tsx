import type { Metadata } from 'next';
import { ProjectDetailClient } from '@/features/projects/components/ProjectDetailClient';

export const metadata: Metadata = {
  title: 'Project Detail — Hobby Inventory',
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ProjectDetailClient id={id} />
    </div>
  );
}
