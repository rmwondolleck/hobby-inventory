import type { Metadata } from 'next';
import { ProjectsListClient } from '@/features/projects/components/ProjectsListClient';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = {
  title: 'Projects — Hobby Inventory',
  description: 'Track your hobby projects and the parts allocated to them.',
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Projects"
        description="Track where your parts are going and the status of each project."
      />
      <ProjectsListClient />
    </div>
  );
}
