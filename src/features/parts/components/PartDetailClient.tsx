'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { PartDetail, LotWithDetails } from '../types';
import { DuplicatePartDialog } from './DuplicatePartDialog';

function QuantityDisplay({ lot }: { lot: LotWithDetails }) {
  if (lot.quantityMode === 'qualitative') {
    const colorClass =
      lot.qualitativeStatus === 'plenty'
        ? 'text-green-600'
        : lot.qualitativeStatus === 'low'
        ? 'text-yellow-600'
        : 'text-red-600';
    return <span className={colorClass}>{lot.qualitativeStatus ?? 'unknown'}</span>;
  }
  return (
    <span>
      {lot.quantity ?? 0}
      {lot.unit ? ` ${lot.unit}` : ''}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'in_stock'
      ? 'success'
      : status === 'low'
      ? 'warning'
      : status === 'out' || status === 'scrapped' || status === 'lost'
      ? 'danger'
      : 'secondary';
  return (
    <Badge variant={variant as 'success' | 'warning' | 'danger' | 'secondary'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function PartDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/parts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Part not found' : 'Failed to load');
        return res.json() as Promise<{ data: PartDetail }>;
      })
      .then((json) => setPart(json.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (error || !part) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error ?? 'Part not found'}
      </div>
    );
  }

  const totalQuantity = part.lots
    .filter((l) => l.quantityMode === 'exact' && l.status === 'in_stock')
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  // Aggregate allocations by project across all lots
  const projectAllocations = new Map<
    string,
    { name: string; status: string; allocated: number }
  >();
  for (const lot of part.lots) {
    for (const alloc of lot.allocations) {
      const existing = projectAllocations.get(alloc.project.id);
      if (existing) {
        existing.allocated += alloc.quantity ?? 0;
      } else {
        projectAllocations.set(alloc.project.id, {
          name: alloc.project.name,
          status: alloc.project.status,
          allocated: alloc.quantity ?? 0,
        });
      }
    }
  }

  const paramEntries = Object.entries(part.parameters);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{part.name}</h1>
            {part.archivedAt && <Badge variant="secondary">Archived</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
            {part.category && <span>{part.category}</span>}
            {part.manufacturer && <span>· {part.manufacturer}</span>}
            {part.mpn && <span>· MPN: {part.mpn}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{totalQuantity}</div>
            <div className="text-sm text-gray-500">in stock</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)}>
            Duplicate
          </Button>
        </div>
      </div>

      {duplicateOpen && (
        <DuplicatePartDialog
          part={part}
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
        />
      )}

      {/* Tags */}
      {part.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {part.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Notes */}
      {part.notes && (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          {part.notes}
        </div>
      )}

      {/* Parameters */}
      {paramEntries.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Parameters</h2>
          <dl className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            {paramEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {key}
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Lots */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Lots ({part.lots.length})
        </h2>
        {part.lots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
            No lots yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {part.lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <QuantityDisplay lot={lot} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lot.location ? (
                        lot.location.path
                      ) : (
                        <span className="italic text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lot.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {lot.receivedAt ? formatDate(lot.receivedAt) : '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                      {lot.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Project Allocations */}
      {projectAllocations.size > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Allocations by Project
          </h2>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Allocated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from(projectAllocations.entries()).map(([projId, data]) => (
                  <tr key={projId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{data.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{data.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{data.allocated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Metadata footer */}
      <div className="border-t pt-4 text-xs text-gray-400">
        Created {formatDate(part.createdAt)} · Updated {formatDate(part.updatedAt)}
      </div>

      <Link
        href="/parts"
        className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        ← Back to Parts
      </Link>
    </div>
  );
}
