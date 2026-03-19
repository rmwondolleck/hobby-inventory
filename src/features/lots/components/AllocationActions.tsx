'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AllocationStatus } from '@/lib/types';

type AllocationAction = 'return' | 'scrap' | null;

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClass,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-xl leading-none text-muted-foreground hover:text-muted-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{description}</p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${confirmClass}`}
            disabled={loading}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface AllocationActionsProps {
  allocationId: string;
  status: AllocationStatus;
  projectName: string;
}

const NEXT_STATUS_LABEL: Partial<Record<AllocationStatus, string>> = {
  in_use: 'Mark In Use',
  deployed: 'Mark Deployed',
};

export function AllocationActions({
  allocationId,
  status,
  projectName,
}: AllocationActionsProps) {
  const [activeModal, setActiveModal] = useState<AllocationAction>(null);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const router = useRouter();

  const nextStatus =
    status === 'reserved' ? 'in_use' : status === 'in_use' ? 'deployed' : null;

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    setAdvancing(true);
    setAdvanceError(null);
    try {
      const res = await fetch(`/api/allocations/${allocationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setAdvanceError(data.message ?? 'Failed to update status');
        return;
      }
      router.refresh();
    } catch {
      setAdvanceError('Network error. Please try again.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleReturn = async () => {
    const res = await fetch(`/api/allocations/${allocationId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      throw new Error(data.message ?? 'Failed to return allocation');
    }
    setActiveModal(null);
    router.refresh();
  };

  const handleScrap = async () => {
    const res = await fetch(`/api/allocations/${allocationId}/scrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      throw new Error(data.message ?? 'Failed to scrap allocation');
    }
    setActiveModal(null);
    router.refresh();
  };

  // Terminal state — no actions
  if (status === 'recovered') return null;

  return (
    <>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {nextStatus && (
          <button
            onClick={handleAdvanceStatus}
            disabled={advancing}
            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
          >
            {NEXT_STATUS_LABEL[nextStatus]}
          </button>
        )}
        <button
          onClick={() => setActiveModal('return')}
          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          Return to Stock
        </button>
        <button
          onClick={() => setActiveModal('scrap')}
          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
        >
          Scrap
        </button>
      </div>

      {advanceError && <p className="mt-1 text-xs text-red-600">{advanceError}</p>}

      {activeModal === 'return' && (
        <ConfirmDialog
          title="Return to Stock"
          description={`Return this allocation from "${projectName}" back to stock? This will mark the allocation as recovered.`}
          confirmLabel="Return to Stock"
          confirmClass="bg-blue-600 hover:bg-blue-700"
          onClose={() => setActiveModal(null)}
          onConfirm={handleReturn}
        />
      )}

      {activeModal === 'scrap' && (
        <ConfirmDialog
          title="Scrap Allocation"
          description={`Permanently remove these parts from the allocation to "${projectName}"? This will reduce the lot quantity for exact-count lots and cannot be undone.`}
          confirmLabel="Scrap"
          confirmClass="bg-red-600 hover:bg-red-700"
          onClose={() => setActiveModal(null)}
          onConfirm={handleScrap}
        />
      )}
    </>
  );
}
