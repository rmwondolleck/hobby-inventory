import type { Metadata } from 'next';
import { ProjectsListClient } from '@/features/projects/components/ProjectsListClient';

export const metadata: Metadata = {
  title: 'Projects — Hobby Inventory',
  description: 'Track your hobby projects and the parts allocated to them.',
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track where your parts are going and the status of each project.
        </p>
      </div>
      <ProjectsListClient />
    </div>
  );
}
