'use client';

import { useState, useEffect } from 'react';

import type { QuantityMode } from '@/lib/types';

interface ProjectOption {
  id: string;
  name: string;
  status: string;
}

interface AllocateModalProps {
  lotId: string;
  quantityMode: QuantityMode;
  availableQuantity: number | null;
  unit: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOCATABLE_STATUSES = ['idea', 'planned', 'active'];

export function AllocateModal({
  lotId,
  quantityMode,
  availableQuantity,
  unit,
  onClose,
  onSuccess,
}: AllocateModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects?limit=500');
        if (!res.ok) throw new Error('Failed to load projects');
        const json = (await res.json()) as { data: ProjectOption[] };
        setProjects(json.data.filter((p) => ALLOCATABLE_STATUSES.includes(p.status)));
      } catch {
        setError('Failed to load projects');
      } finally {
        setFetching(false);
      }
    }
    fetchProjects();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      setError('Please select a project');
      return;
    }

    if (quantityMode === 'exact') {
      if (quantity === '') {
        setError('Quantity is required');
        return;
      }
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        setError('Quantity must be a positive integer');
        return;
      }
      if (availableQuantity !== null && qty > availableQuantity) {
        setError(`Cannot allocate more than available quantity (${availableQuantity})`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        lotId,
        projectId,
        notes: notes.trim() || null,
      };
      if (quantityMode === 'exact') {
        body.quantity = parseInt(quantity, 10);
      }

      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Failed to allocate');
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
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Allocate to Project</h3>
          <button
            onClick={onClose}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {fetching ? (
          <p className="py-4 text-center text-sm text-gray-500">Loading projects…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              >
                <option value="">— Select project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No active or planned projects found.
                </p>
              )}
            </div>

            {quantityMode === 'exact' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Quantity{unit ? ` (${unit})` : ''}{' '}
                  <span className="text-red-500">*</span>
                  {availableQuantity !== null && (
                    <span className="ml-1 font-normal text-gray-500">
                      — {availableQuantity} available
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQuantity ?? undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes…"
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !projectId}
              >
                {loading ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
