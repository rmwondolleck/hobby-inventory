'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { ProjectDetail, AllocationWithDetails, ProjectEvent } from '../types';

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

const ALLOCATION_STATUS_LABELS: Record<string, string> = {
  reserved: 'Reserved',
  in_use: 'In Use',
  deployed: 'Deployed',
  recovered: 'Recovered',
};

const ALLOCATION_STATUS_ORDER = ['in_use', 'deployed', 'reserved', 'recovered'];

function AllocationRow({ allocation }: { allocation: AllocationWithDetails }) {
  const { lot } = allocation;
  const qtyDisplay =
    lot.quantityMode === 'qualitative'
      ? lot.qualitativeStatus ?? '—'
      : allocation.quantity != null
      ? `${allocation.quantity}${lot.unit ? ' ' + lot.unit : ''}`
      : lot.quantity != null
      ? `${lot.quantity}${lot.unit ? ' ' + lot.unit : ''}`
      : '—';

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="py-2 pr-4 text-sm">
        <Link
          href={`/parts/${lot.part.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {lot.part.name}
        </Link>
        {lot.part.category && (
          <span className="ml-2">
            <Badge variant="default">{lot.part.category}</Badge>
          </span>
        )}
      </td>
      <td className="py-2 pr-4 text-sm text-gray-600">
        {lot.location ? (
          <Link
            href={`/locations/${lot.location.id}`}
            className="text-blue-600 hover:underline"
          >
            {lot.location.name}
          </Link>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="py-2 pr-4 text-sm text-gray-700">{qtyDisplay}</td>
      <td className="py-2 text-sm text-gray-500">{allocation.notes ?? '—'}</td>
    </tr>
  );
}

function AllocationGroup({
  status,
  allocations,
}: {
  status: string;
  allocations: AllocationWithDetails[];
}) {
  if (allocations.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {ALLOCATION_STATUS_LABELS[status] ?? status}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
          {allocations.length}
        </span>
      </h3>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Part</th>
              <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Location</th>
              <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Quantity</th>
              <th className="py-2 text-left text-xs font-medium text-gray-500">Notes</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <AllocationRow key={a.id} allocation={a} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: ProjectEvent }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="py-2 pr-4 text-xs text-gray-400 whitespace-nowrap">
        {formatDateTime(event.createdAt)}
      </td>
      <td className="py-2 pr-4 text-sm">
        <Link
          href={`/parts/${event.lot.part.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {event.lot.part.name}
        </Link>
      </td>
      <td className="py-2 pr-4 text-sm text-gray-600 capitalize">{event.type}</td>
      <td className="py-2 pr-4 text-sm text-gray-600">
        {event.delta != null ? (event.delta > 0 ? `+${event.delta}` : event.delta) : '—'}
      </td>
      <td className="py-2 text-sm text-gray-500">{event.notes ?? '—'}</td>
    </tr>
  );
}

interface ProjectDetailClientProps {
  id: string;
}

export function ProjectDetailClient({ id }: ProjectDetailClientProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch project');
        const json = (await res.json()) as { data: ProjectDetail };
        setProject(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">Project not found.</p>
        <Link href="/projects" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Error: {error ?? 'Could not load project'}
      </div>
    );
  }

  // Group allocations by status in a defined order
  const allocationGroups = ALLOCATION_STATUS_ORDER.map((status) => ({
    status,
    allocations: project.allocations.filter((a) => a.status === status),
  }));

  const hasAllocations = project.allocations.length > 0;
  const hasEvents = (project.events ?? []).length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <Badge variant={STATUS_VARIANTS[project.status] ?? 'default'}>
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
            {project.archivedAt && (
              <Badge variant="secondary">Archived</Badge>
            )}
          </div>
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/projects"
          className="shrink-0 text-sm text-blue-600 hover:underline"
        >
          ← Back to projects
        </Link>
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Notes
          </p>
          <p className="whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* Wishlist notes */}
      {project.wishlistNotes && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-500">
            Wishlist / Parts Needed
          </p>
          <p className="whitespace-pre-wrap">{project.wishlistNotes}</p>
        </div>
      )}

      {/* Allocations */}
      <div className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Allocations
          {hasAllocations && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({project.allocationCount} total)
            </span>
          )}
        </h2>

        {!hasAllocations ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No parts allocated to this project yet.
          </div>
        ) : (
          allocationGroups.map(({ status, allocations }) => (
            <AllocationGroup key={status} status={status} allocations={allocations} />
          ))
        )}
      </div>

      {/* Event history */}
      <div className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Event History</h2>

        {!hasEvents ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No events recorded for this project.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Part</th>
                  <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="py-2 pr-4 text-left text-xs font-medium text-gray-500">Delta</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(project.events ?? []).map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-8 border-t border-gray-100 pt-4 text-xs text-gray-400">
        <span>Created {formatDate(project.createdAt)}</span>
        <span className="mx-2">·</span>
        <span>Updated {formatDate(project.updatedAt)}</span>
        {project.archivedAt && (
          <>
            <span className="mx-2">·</span>
            <span>Archived {formatDate(project.archivedAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}
