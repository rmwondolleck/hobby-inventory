'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import type { PartDetail, LotWithDetails } from '../types';

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
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
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
      <PageHeader
        title={part.name}
        description={[part.category, part.manufacturer, part.mpn ? `MPN: ${part.mpn}` : null].filter(Boolean).join(' · ') || undefined}
        actions={
          <div className="flex items-center gap-4">
            {part.archivedAt && <Badge variant="secondary">Archived</Badge>}
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{totalQuantity}</div>
              <div className="text-sm text-muted-foreground">in stock</div>
            </div>
          </div>
        }
      />

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
        <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
          {part.notes}
        </div>
      )}

      {/* Parameters */}
      {paramEntries.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Parameters</h2>
          <dl className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            {paramEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {key}
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Lots */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Lots ({part.lots.length})
        </h2>
        {part.lots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No lots yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Received
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {part.lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium">
                      <QuantityDisplay lot={lot} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lot.location ? (
                        lot.location.path
                      ) : (
                        <span className="italic text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lot.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lot.receivedAt ? formatDate(lot.receivedAt) : '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
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
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Allocations by Project
          </h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Project
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Allocated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from(projectAllocations.entries()).map(([projId, data]) => (
                  <tr key={projId} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">{data.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{data.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{data.allocated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Metadata footer */}
      <div className="border-t pt-4 text-xs text-muted-foreground">
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
