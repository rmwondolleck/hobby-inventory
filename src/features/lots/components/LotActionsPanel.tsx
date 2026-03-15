'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoveModal } from './MoveModal';
import { AllocateModal } from './AllocateModal';
import { ScrapLostModal } from './ScrapLostModal';
import { AdjustQuantityModal } from './AdjustQuantityModal';

type ActiveModal = 'move' | 'allocate' | 'scrap' | 'lost' | 'adjust' | null;

export interface LotActionsPanelProps {
  lotId: string;
  status: string;
  quantityMode: string;
  quantity: number | null;
  qualitativeStatus: string | null;
  unit: string | null;
  locationId: string | null;
  notes: string | null;
}

const CAN_MOVE = new Set(['in_stock', 'low', 'out', 'reserved', 'installed']);
const CAN_ALLOCATE = new Set(['in_stock', 'low']);
const CAN_ADJUST = new Set(['in_stock', 'low', 'out', 'reserved']);
const CAN_MARK_LOST = new Set(['in_stock', 'low', 'reserved', 'installed']);
const CAN_SCRAP = new Set(['in_stock', 'low', 'out', 'reserved', 'installed', 'lost']);
const CAN_RESTORE = new Set(['lost']);

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
  if (status === 'scrapped') return null;

  return (
    <>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {CAN_MOVE.has(status) && (
            <button
              onClick={() => setActiveModal('move')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              📦 Move
            </button>
          )}

          {CAN_ALLOCATE.has(status) && (
            <button
              onClick={() => setActiveModal('allocate')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              🔗 Allocate to Project
            </button>
          )}

          {CAN_ADJUST.has(status) && (
            <button
              onClick={() => setActiveModal('adjust')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ✏️ {quantityMode === 'exact' ? 'Adjust Quantity' : 'Update Stock Level'}
            </button>
          )}

          {CAN_MARK_LOST.has(status) && (
            <button
              onClick={() => setActiveModal('lost')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
            >
              ❓ Mark Lost
            </button>
          )}

          {CAN_RESTORE.has(status) && (
            <button
              onClick={handleRestoreToStock}
              disabled={restoring}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              ↩️ Restore to Stock
            </button>
          )}

          {CAN_SCRAP.has(status) && (
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
