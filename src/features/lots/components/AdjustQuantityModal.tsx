'use client';

import { useState } from 'react';

interface AdjustQuantityModalProps {
  lotId: string;
  quantityMode: string;
  currentQuantity: number | null;
  currentQualitativeStatus: string | null;
  unit: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const QUALITATIVE_OPTIONS = [
  { value: 'plenty', label: 'Plenty' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out' },
] as const;

export function AdjustQuantityModal({
  lotId,
  quantityMode,
  currentQuantity,
  currentQualitativeStatus,
  unit,
  onClose,
  onSuccess,
}: AdjustQuantityModalProps) {
  const [quantity, setQuantity] = useState(
    currentQuantity !== null ? String(currentQuantity) : ''
  );
  const [qualitativeStatus, setQualitativeStatus] = useState(
    currentQualitativeStatus ?? 'plenty'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (quantityMode === 'exact') {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty < 0) {
          setError('Quantity must be a non-negative integer');
          setLoading(false);
          return;
        }
        body.quantity = qty;
      } else {
        body.qualitativeStatus = qualitativeStatus;
      }

      const res = await fetch(`/api/lots/${lotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Update failed');
        return;
      }
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {quantityMode === 'exact' ? 'Adjust Quantity' : 'Update Stock Level'}
          </h3>
          <button
            onClick={onClose}
            className="text-xl leading-none text-muted-foreground hover:text-muted-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {quantityMode === 'exact' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                New Quantity{unit ? ` (${unit})` : ''}
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
                autoFocus
                required
              />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Stock Level
              </label>
              <div className="flex gap-4">
                {QUALITATIVE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="qualitativeStatus"
                      value={opt.value}
                      checked={qualitativeStatus === opt.value}
                      onChange={() => setQualitativeStatus(opt.value)}
                      disabled={loading}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
