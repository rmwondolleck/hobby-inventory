import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ProjectListItem } from '../types';

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  planned: 'Planned',
  active: 'Active',
  deployed: 'Deployed',
  retired: 'Retired',
};

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-600',
  planned: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  deployed: 'bg-purple-100 text-purple-700',
  retired: 'bg-red-100 text-red-600',
};

const ALLOCATION_LABELS: Record<string, string> = {
  in_use: 'in use',
  reserved: 'reserved',
  deployed: 'deployed',
  recovered: 'recovered',
};

const MAX_VISIBLE_TAGS = 4;

interface ProjectCardProps {
  project: ProjectListItem;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const isArchived = !!project.archivedAt;
  const visibleTags = project.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = project.tags.length - MAX_VISIBLE_TAGS;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md',
        isArchived && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">{project.name}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {isArchived && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              Archived
            </span>
          )}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600',
            )}
          >
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        </div>
      </div>

      {project.notes && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{project.notes}</p>
      )}

      {project.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {project.allocationCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(project.allocationsByStatus).map(([status, count]) => (
            <span key={status} className="text-xs text-gray-500">
              {count} {ALLOCATION_LABELS[status] ?? status}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
