'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoveModal } from './MoveModal';
import { AllocateModal } from './AllocateModal';
import { ScrapLostModal } from './ScrapLostModal';
import { AdjustQuantityModal } from './AdjustQuantityModal';
import { getValidStockTransitions, isTerminalState } from '@/lib/state-transitions';
import type { StockStatus, QuantityMode, QualitativeLevel } from '@/lib/types';

type ActiveModal = 'move' | 'allocate' | 'scrap' | 'lost' | 'adjust' | null;

export interface LotActionsPanelProps {
  lotId: string;
  status: StockStatus;
  quantityMode: QuantityMode;
  quantity: number | null;
  qualitativeStatus: QualitativeLevel | null;
  unit: string | null;
  locationId: string | null;
  notes: string | null;
}

export function LotActionsPanel({
  lotId,
  status,
  quantityMode,
  quantity,
  qualitativeStatus,
  unit,
  locationId,
  notes,
}: LotActionsPanelProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const router = useRouter();

  const validTransitions = getValidStockTransitions(status);
  const canMove = !isTerminalState('stock', status) && status !== 'lost';
  const canAllocate = validTransitions.includes('reserved');
  const canAdjust = !isTerminalState('stock', status) && status !== 'lost' && status !== 'installed';
  const canMarkLost = validTransitions.includes('lost');
  const canRestore = status === 'lost';
  const canScrap = validTransitions.includes('scrapped');

  const handleSuccess = () => {
    setActiveModal(null);
    router.refresh();
  };

  const handleRestoreToStock = async () => {
    setRestoring(true);
    setRestoreError(null);
    try {
      const res = await fetch(`/api/lots/${lotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_stock' }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setRestoreError(data.message ?? 'Failed to restore');
        return;
      }
      router.refresh();
    } catch {
      setRestoreError('Network error. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  // Terminal state — no actions available
  if (isTerminalState('stock', status)) return null;

  return (
    <>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {canMove && (
            <button
              onClick={() => setActiveModal('move')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📦 Move
            </button>
          )}

          {canAllocate && (
            <button
              onClick={() => setActiveModal('allocate')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              🔗 Allocate to Project
            </button>
          )}

          {canAdjust && (
            <button
              onClick={() => setActiveModal('adjust')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ✏️ {quantityMode === 'exact' ? 'Adjust Quantity' : 'Update Stock Level'}
            </button>
          )}

          {canMarkLost && (
            <button
              onClick={() => setActiveModal('lost')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
            >
              ❓ Mark Lost
            </button>
          )}

          {canRestore && (
            <button
              onClick={handleRestoreToStock}
              disabled={restoring}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              ↩️ Restore to Stock
            </button>
          )}

          {canScrap && (
            <button
              onClick={() => setActiveModal('scrap')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              🗑️ Scrap
            </button>
          )}
        </div>

        {restoreError && <p className="mt-2 text-sm text-red-600">{restoreError}</p>}
      </section>

      {activeModal === 'move' && (
        <MoveModal
          lotId={lotId}
          currentLocationId={locationId}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {activeModal === 'allocate' && (
        <AllocateModal
          lotId={lotId}
          quantityMode={quantityMode}
          availableQuantity={quantity}
          unit={unit}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {activeModal === 'scrap' && (
        <ScrapLostModal
          lotId={lotId}
          action="scrap"
          currentNotes={notes}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {activeModal === 'lost' && (
        <ScrapLostModal
          lotId={lotId}
          action="lost"
          currentNotes={notes}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}

      {activeModal === 'adjust' && (
        <AdjustQuantityModal
          lotId={lotId}
          quantityMode={quantityMode}
          currentQuantity={quantity}
          currentQualitativeStatus={qualitativeStatus}
          unit={unit}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
