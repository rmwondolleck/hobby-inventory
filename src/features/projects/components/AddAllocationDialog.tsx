'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PartSearch } from '@/features/intake/components/PartSearch';
import type { PartOption } from '@/features/intake/types';
import type { QuantityMode } from '@/lib/types';
import type { AllocationWithDetails } from '../types';

interface LotForPicker {
  id: string;
  quantity: number | null;
  quantityMode: QuantityMode;
  qualitativeStatus: string | null;
  unit: string | null;
  status: string;
  location: { id: string; name: string; path: string } | null;
  part: { id: string; name: string };
}

interface AddAllocationDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllocationAdded: (allocation: AllocationWithDetails) => void;
}

export function AddAllocationDialog({
  projectId,
  open,
  onOpenChange,
  onAllocationAdded,
}: AddAllocationDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPart, setSelectedPart] = useState<PartOption | null>(null);
  const [lots, setLots] = useState<LotForPicker[]>([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [availableQtyLoading, setAvailableQtyLoading] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedPart(null);
      setLots([]);
      setLotsError(null);
      setSelectedLotId('');
      setAvailableQty(null);
      setQuantity('');
      setNotes('');
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Fetch lots when entering step 2
  useEffect(() => {
    if (step !== 2 || !selectedPart) return;
    setLotsLoading(true);
    setLotsError(null);
    fetch(`/api/lots?partId=${encodeURIComponent(selectedPart.id)}&limit=100`)
      .then(async (res) => {
        if (!res.ok) {
          setLotsError('Failed to load lots');
          setLots([]);
          setLotsLoading(false);
          return;
        }
        const data: { data?: LotForPicker[] } = await res.json();
        setLots(data.data ?? []);
        setLotsLoading(false);
      })
      .catch(() => {
        setLotsError('Failed to load lots');
        setLotsLoading(false);
      });
  }, [step, selectedPart]);

  // Compute available quantity for the selected exact-mode lot
  useEffect(() => {
    if (!selectedLotId) {
      setAvailableQty(null);
      return;
    }
    const lot = lots.find((l: LotForPicker) => l.id === selectedLotId);
    if (!lot || lot.quantityMode !== 'exact' || lot.quantity === null) {
      setAvailableQty(null);
      return;
    }
    setAvailableQtyLoading(true);
    fetch(
      `/api/allocations?lotId=${encodeURIComponent(selectedLotId)}&status=reserved,in_use,deployed&limit=500`,
    )
      .then(async (res) => {
        if (!res.ok) {
          setAvailableQty(null);
          setAvailableQtyLoading(false);
          return;
        }
        const data: { data?: { quantity: number | null }[] } = await res.json();
        const active = data.data ?? [];
        const allocated = active.reduce((sum, a) => sum + (a.quantity ?? 0), 0);
        setAvailableQty(Math.max(0, (lot.quantity ?? 0) - allocated));
        setAvailableQtyLoading(false);
      })
      .catch(() => {
        setAvailableQty(null);
        setAvailableQtyLoading(false);
      });
  }, [selectedLotId, lots]);

  const selectedLot = lots.find((l: LotForPicker) => l.id === selectedLotId);

  async function handleSubmit() {
    if (!selectedPart || !selectedLotId || !selectedLot) return;

    if (selectedLot.quantityMode === 'exact') {
      const qty = parseInt(quantity, 10);
      if (!quantity || isNaN(qty) || qty <= 0) {
        setSubmitError('Please enter a valid quantity');
        return;
      }
      if (availableQty !== null && qty > availableQty) {
        setSubmitError(`Quantity exceeds available stock (${availableQty})`);
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    const body: { lotId: string; projectId: string; quantity?: number; notes?: string } = {
      lotId: selectedLotId,
      projectId,
    };

    if (selectedLot.quantityMode === 'exact' && quantity) {
      body.quantity = parseInt(quantity, 10);
    }

    if (notes.trim()) {
      body.notes = notes.trim();
    }

    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: AllocationWithDetails; message?: string };
      if (!res.ok) {
        setSubmitError(json.message ?? 'Failed to create allocation');
        return;
      }
      onAllocationAdded(json.data as AllocationWithDetails);
      onOpenChange(false);
    } catch {
      setSubmitError('Network error, please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === 1 ? 'Select a Part' : 'Select a Lot'}</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <PartSearch
              value={selectedPart}
              onChange={setSelectedPart}
              placeholder="Search parts…"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { if (selectedPart) setStep(2); }}
                disabled={!selectedPart}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Next →
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected part summary */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Part:</span>
              <span className="text-sm font-medium text-gray-900">{selectedPart?.name}</span>
              <button
                type="button"
                onClick={() => { setStep(1); setSelectedLotId(''); setAvailableQty(null); }}
                className="ml-auto text-xs text-blue-600 hover:underline"
              >
                Change
              </button>
            </div>

            {/* Lot list */}
            {lotsLoading ? (
              <div className="text-sm text-gray-500">Loading lots…</div>
            ) : lotsError ? (
              <div className="text-sm text-red-600">{lotsError}</div>
            ) : lots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                No lots found for this part.
              </div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {lots.map((lot: LotForPicker) => {
                  const qtyText =
                    lot.quantityMode === 'qualitative'
                      ? lot.qualitativeStatus ?? '—'
                      : lot.quantity != null
                      ? `${lot.quantity}${lot.unit ? ' ' + lot.unit : ''}`
                      : '—';
                  return (
                    <label
                      key={lot.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                        selectedLotId === lot.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lot"
                        value={lot.id}
                        checked={selectedLotId === lot.id}
                        onChange={() => { setSelectedLotId(lot.id); setQuantity(''); }}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          Lot{' '}
                          <span className="font-mono text-xs text-gray-500">
                            …{lot.id.slice(-8)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Qty: {qtyText}
                          {lot.location && ` · ${lot.location.name}`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Available quantity display */}
            {selectedLotId && selectedLot?.quantityMode === 'exact' && (
              <p className="text-xs text-gray-500">
                {availableQtyLoading
                  ? 'Computing available quantity…'
                  : availableQty !== null
                  ? `Available: ${availableQty}${selectedLot.unit ? ' ' + selectedLot.unit : ''}`
                  : null}
              </p>
            )}

            {/* Quantity input (exact mode only) */}
            {selectedLotId && selectedLot?.quantityMode === 'exact' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={availableQty ?? undefined}
                  value={quantity}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Notes input */}
            {selectedLotId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !selectedLotId ||
                  (selectedLot?.quantityMode === 'exact' && !quantity)
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Adding…' : 'Add to Project'}
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
