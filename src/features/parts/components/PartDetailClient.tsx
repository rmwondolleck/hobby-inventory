'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { PencilIcon } from 'lucide-react';
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
import { PageHeader } from '@/components/PageHeader';
import { EditPartDialog } from './EditPartDialog';
import { DuplicatePartDialog } from './DuplicatePartDialog';
import { AllocateModal } from '@/features/lots/components/AllocateModal';
import { EventTimeline } from '@/components/EventTimeline';
import type { AllocationStatus } from '@/lib/types';
import type { PartDetail, LotWithDetails } from '../types';
import type { TimelineEvent } from '@/components/EventTimeline';

const ACTIVE_ALLOCATION_STATUSES: AllocationStatus[] = ['reserved', 'in_use', 'deployed'];

function getAvailableQuantity(lot: LotWithDetails): number | null {
  if (lot.quantityMode !== 'exact' || lot.quantity == null) return null;
  const allocated = lot.allocations
    .filter((a) => ACTIVE_ALLOCATION_STATUSES.includes(a.status))
    .reduce((sum, a) => sum + (a.quantity ?? 0), 0);
  return Math.max(0, lot.quantity - allocated);
}

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

// ── AdjustLotDialog (PR #158) ─────────────────────────────────────────────────

interface AdjustLotDialogProps {
  lot: LotWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AdjustLotDialog({ lot, open, onOpenChange, onSuccess }: AdjustLotDialogProps) {
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
    const consume = consumeAmount === '' ? 0 : Number(consumeAmount);
    const add = addAmount === '' ? 0 : Number(addAmount);

    if (!Number.isFinite(consume) || !Number.isInteger(consume) || consume < 0) {
      setFormError('Consume amount must be a non-negative integer.');
      return;
    }
    if (!Number.isFinite(add) || !Number.isInteger(add) || add < 0) {
      setFormError('Add amount must be a non-negative integer.');
      return;
    }

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
      const res = await fetch(`/api/lots/${lot.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, notes: notes || undefined }),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { message?: string };
        throw new Error(errData.message ?? 'Failed to adjust lot quantity');
      }

      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Quantity</DialogTitle>
          <DialogDescription>
            Current: <strong>{currentQty}{unitLabel}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="consume-amount" className="text-sm font-medium text-muted-foreground">
              Consume (subtract)
            </label>
            <Input
              id="consume-amount"
              type="number"
              min={0}
              step={1}
              max={currentQty}
              placeholder={`e.g. 50${unitLabel}`}
              value={consumeAmount}
              onChange={(e) => { setConsumeAmount(e.target.value); setAddAmount(''); setFormError(null); }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-amount" className="text-sm font-medium text-muted-foreground">
              Add stock (receive more)
            </label>
            <Input
              id="add-amount"
              type="number"
              min={0}
              step={1}
              placeholder={`e.g. 100${unitLabel}`}
              value={addAmount}
              onChange={(e) => { setAddAmount(e.target.value); setConsumeAmount(''); setFormError(null); }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="adjust-notes" className="text-sm font-medium text-muted-foreground">
              Notes <span className="font-normal text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              id="adjust-notes"
              placeholder="Reason or reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
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

// ── PartDetailClient ──────────────────────────────────────────────────────────

export function PartDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // PR #157 — Edit Part modal
  const [editOpen, setEditOpen] = useState(false);
  // PR #174 — Duplicate Part dialog
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  // PR #158 — Adjust lot quantity
  const [adjustLotId, setAdjustLotId] = useState<string | null>(null);
  // PR #178 — Allocate lot from part detail
  const [refreshKey, setRefreshKey] = useState(0);
  const [allocatingLot, setAllocatingLot] = useState<LotWithDetails | null>(null);
  // Event history
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const loadPart = useCallback(() => {
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

  const loadEvents = useCallback(() => {
    if (!id) return;
    fetch(`/api/parts/${id}/events`)
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<{ data: TimelineEvent[] }>;
      })
      .then((json) => {
        if (json && Array.isArray(json.data)) setEvents(json.data);
      })
      .catch((err: unknown) => {
        // non-fatal: event history is best-effort
        console.warn('[PartDetailClient] Failed to load events:', err);
      });
  }, [id]);

  useEffect(() => {
    loadPart();
  }, [loadPart, refreshKey]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshKey]);

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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
        {error ?? 'Part not found'}
      </div>
    );
  }

  const { availableQuantity, reservedQuantity, inUseQuantity, scrappedQuantity } = part;

  // Aggregate allocations by project across all lots
  const projectAllocations = new Map<string, { name: string; status: string; allocated: number }>();
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
  const selectedLot = adjustLotId ? part.lots.find((l) => l.id === adjustLotId) ?? null : null;

  return (
    <div className="space-y-6">
      {/* Dialogs — conditionally mounted to avoid eager data fetching */}
      {editOpen && (
        <EditPartDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          part={part}
          onSave={setPart}
        />
      )}
      {duplicateOpen && (
        <DuplicatePartDialog
          part={part}
          open={duplicateOpen}
          onOpenChange={setDuplicateOpen}
        />
      )}

      <PageHeader
        title={part.name}
        description={[part.category, part.manufacturer, part.mpn ? `MPN: ${part.mpn}` : null].filter(Boolean).join(' · ') || undefined}
        actions={
          <div className="flex items-center gap-4">
            {part.archivedAt && <Badge variant="secondary">Archived</Badge>}
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{availableQuantity}</div>
              <div className="text-sm text-muted-foreground">available</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <PencilIcon className="size-3.5 mr-1" />
                Edit Part
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDuplicateOpen(true)}>
                Duplicate
              </Button>
            </div>
          </div>
        }
      />

      {/* Quantity breakdown stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-900/30">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{availableQuantity}</div>
          <div className="text-xs font-medium text-green-600 dark:text-green-500">Available</div>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center dark:border-yellow-800 dark:bg-yellow-900/30">
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{reservedQuantity}</div>
          <div className="text-xs font-medium text-yellow-600 dark:text-yellow-500">Reserved</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center dark:border-blue-800 dark:bg-blue-900/30">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{inUseQuantity}</div>
          <div className="text-xs font-medium text-blue-600 dark:text-blue-500">In-Use</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-900/30">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{scrappedQuantity}</div>
          <div className="text-xs font-medium text-red-600 dark:text-red-500">Scrapped</div>
        </div>
      </div>

      {part.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {part.tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}

      {part.notes && (
        <div className="rounded-lg bg-muted p-4 text-sm text-foreground">
          {part.notes}
        </div>
      )}

      {paramEntries.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Parameters</h2>
          <dl className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            {paramEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{key}</dt>
                <dd className="mt-0.5 text-sm text-foreground">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Lots */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Lots ({part.lots.length})</h2>
        {part.lots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No lots yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Received</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {part.lots.map((lot) => {
                  const availableQty = getAvailableQuantity(lot);
                  const canAllocate =
                    (lot.status === 'in_stock' || lot.status === 'low') &&
                    (lot.quantityMode === 'qualitative' || (availableQty !== null && availableQty > 0));
                  return (
                    <tr key={lot.id} className="hover:bg-muted">
                      <td className="px-4 py-3 font-medium"><QuantityDisplay lot={lot} /></td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lot.location ? lot.location.path : <span className="italic text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lot.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {lot.receivedAt ? formatDate(lot.receivedAt) : '—'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{lot.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {lot.quantityMode === 'exact' && (
                            <Button size="sm" variant="outline" onClick={() => setAdjustLotId(lot.id)}>
                              Adjust
                            </Button>
                          )}
                          {canAllocate && (
                            <Button size="sm" variant="outline" onClick={() => setAllocatingLot(lot)}>
                              Allocate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Project Allocations */}
      {projectAllocations.size > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Allocations by Project</h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from(projectAllocations.entries()).map(([projId, data]) => (
                  <tr key={projId} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">{data.name}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{data.status}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{data.allocated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="border-t pt-4 text-xs text-muted-foreground">
        Created {formatDate(part.createdAt)} · Updated {formatDate(part.updatedAt)}
      </div>

      {/* Event History */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Event History</h2>
        <div className="rounded-lg border bg-card p-4">
          <EventTimeline events={events} />
        </div>
      </section>

      <Link href="/parts" className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline">
        ← Back to Parts
      </Link>

      {/* AdjustLotDialog (PR #158) */}
      {selectedLot && (
        <AdjustLotDialog
          lot={selectedLot}
          open={true}
          onOpenChange={(open) => { if (!open) setAdjustLotId(null); }}
          onSuccess={() => {
            setAdjustLotId(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* AllocateModal (PR #178) */}
      {allocatingLot && (
        <AllocateModal
          lotId={allocatingLot.id}
          quantityMode={allocatingLot.quantityMode}
          availableQuantity={getAvailableQuantity(allocatingLot)}
          unit={allocatingLot.unit ?? null}
          onClose={() => setAllocatingLot(null)}
          onSuccess={() => {
            setAllocatingLot(null);
            toast.success('Lot allocated successfully');
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
