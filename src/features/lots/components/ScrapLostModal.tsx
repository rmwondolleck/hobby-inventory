'use client';

import { useState } from 'react';

interface ScrapLostModalProps {
  lotId: string;
  action: 'scrap' | 'lost';
  currentNotes: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScrapLostModal({
  lotId,
  action,
  currentNotes,
  onClose,
  onSuccess,
}: ScrapLostModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetStatus = action === 'scrap' ? 'scrapped' : 'lost';
  const title = action === 'scrap' ? 'Scrap Lot' : 'Mark as Lost';
  const confirmLabel = action === 'scrap' ? 'Scrap Lot' : 'Mark Lost';
  const description =
    action === 'scrap'
      ? 'This will permanently mark the lot as scrapped. This cannot be undone.'
      : 'This will mark the lot as lost.';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Append reason to existing notes when provided
      const updatedNotes = reason.trim()
        ? currentNotes
          ? `${currentNotes}\n[${action === 'scrap' ? 'Scrapped' : 'Lost'}] ${reason.trim()}`
          : `[${action === 'scrap' ? 'Scrapped' : 'Lost'}] ${reason.trim()}`
        : undefined;

      const body: Record<string, unknown> = { status: targetStatus };
      if (updatedNotes !== undefined) body.notes = updatedNotes;

      const res = await fetch(`/api/lots/${lotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Action failed');
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

        <p className="mb-4 text-sm text-muted-foreground">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Reason / Notes
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason…"
              rows={3}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            />
          </div>

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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
