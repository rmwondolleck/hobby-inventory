import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ProjectListItem } from '../types';

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  planned: 'Planned',
  active: 'Active',
  deployed: 'Deployed',
  retired: 'Retired',
};

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger'
> = {
  idea: 'secondary',
  planned: 'default',
  active: 'success',
  deployed: 'warning',
  retired: 'danger',
};

interface ProjectCardProps {
  project: ProjectListItem;
  isPinned?: boolean;
  onPin?: (id: string) => void;
}

export function ProjectCard({ project, isPinned = false, onPin }: ProjectCardProps) {
  const isArchived = !!project.archivedAt;
  const reservedCount = project.allocationsByStatus.reserved ?? 0;
  const inUseCount = project.allocationsByStatus.in_use ?? 0;
  const deployedCount = project.allocationsByStatus.deployed ?? 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'relative block rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        isArchived && 'opacity-60'
      )}
    >
      {onPin && (
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onPin(project.id);
          }}
          aria-label={isPinned ? 'Unpin project' : 'Pin project'}
          className={cn(
            'absolute right-2 top-2 rounded p-0.5 text-base leading-none transition-opacity',
            isPinned ? 'opacity-100' : 'opacity-30 hover:opacity-100'
          )}
        >
          📌
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{project.name}</h3>
          {project.notes && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{project.notes}</p>
          )}
        </div>
        <div className={cn("flex shrink-0 flex-col items-end gap-1", onPin && "mr-6")}>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
          <Badge variant={STATUS_VARIANTS[project.status] ?? 'default'}>
            {STATUS_LABELS[project.status] ?? project.status}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {project.tags.length > 4 && (
            <Badge variant="secondary">+{project.tags.length - 4}</Badge>
          )}
        </div>

        {project.allocationCount > 0 && (
          <div className="ml-2 shrink-0 text-xs text-muted-foreground">
            {deployedCount > 0 && (
              <span className="mr-1 text-green-600">{deployedCount} deployed</span>
            )}
            {inUseCount > 0 && (
              <span className="mr-1 text-blue-600">{inUseCount} in use</span>
            )}
            {reservedCount > 0 && (
              <span className="text-muted-foreground">{reservedCount} reserved</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
