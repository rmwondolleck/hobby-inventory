'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
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

interface AdjustLotDialogProps {
  lot: LotWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuantityUpdated: (lotId: string, newQuantity: number) => void;
}

function AdjustLotDialog({ lot, open, onOpenChange, onQuantityUpdated }: AdjustLotDialogProps) {
  const [consumeAmount, setConsumeAmount] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const currentQty = lot.quantity ?? 0;
  const unitLabel = lot.unit ? ` ${lot.unit}` : '';

  function reset() {
    setConsumeAmount('');
    setAddAmount('');
    setNotes('');
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const consume = consumeAmount ? parseInt(consumeAmount, 10) : 0;
    const add = addAmount ? parseInt(addAmount, 10) : 0;
    const delta = add - consume;

    if (delta === 0) {
      setFormError('No change: enter a consume or add amount.');
      return;
    }

    const newQty = currentQty + delta;
    if (newQty < 0) {
      setFormError(`Cannot consume more than current quantity (${currentQty}${unitLabel}).`);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const patchRes = await fetch(`/api/lots/${lot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!patchRes.ok) {
        const errData = (await patchRes.json()) as { message?: string };
        throw new Error(errData.message ?? 'Failed to update lot quantity');
      }

      await fetch(`/api/lots/${lot.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'edited',
          delta,
          notes: notes || undefined,
        }),
      });

      onQuantityUpdated(lot.id, newQty);
      reset();
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Quantity</DialogTitle>
          <DialogDescription>
            Current:{' '}
            <strong>
              {currentQty}
              {unitLabel}
            </strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="consume-amount" className="text-sm font-medium text-gray-700">
              Consume (subtract)
            </label>
            <Input
              id="consume-amount"
              type="number"
              min={0}
              max={currentQty}
              placeholder={`e.g. 50${unitLabel}`}
              value={consumeAmount}
              onChange={(e) => {
                setConsumeAmount(e.target.value);
                setAddAmount('');
                setFormError(null);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-amount" className="text-sm font-medium text-gray-700">
              Add stock (receive more)
            </label>
            <Input
              id="add-amount"
              type="number"
              min={0}
              placeholder={`e.g. 100${unitLabel}`}
              value={addAmount}
              onChange={(e) => {
                setAddAmount(e.target.value);
                setConsumeAmount('');
                setFormError(null);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="adjust-notes" className="text-sm font-medium text-gray-700">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <Input
              id="adjust-notes"
              placeholder="Reason or reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PartDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustLotId, setAdjustLotId] = useState<string | null>(null);

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

  function updateLotQuantity(lotId: string, newQuantity: number) {
    setPart((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lots: prev.lots.map((l) => (l.id === lotId ? { ...l, quantity: newQuantity } : l)),
      };
    });
  }

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
        <div className="shrink-0 text-right">
          <div className="text-3xl font-bold text-gray-900">{totalQuantity}</div>
          <div className="text-sm text-gray-500">in stock</div>
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
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
                    <td className="px-4 py-3">
                      {lot.quantityMode === 'exact' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustLotId(lot.id)}
                        >
                          Adjust
                        </Button>
                      )}
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

      {adjustLotId && (
        <AdjustLotDialog
          lot={part.lots.find((l) => l.id === adjustLotId)!}
          open={!!adjustLotId}
          onOpenChange={(open) => { if (!open) setAdjustLotId(null); }}
          onQuantityUpdated={updateLotQuantity}
        />
      )}
    </div>
  );
}
