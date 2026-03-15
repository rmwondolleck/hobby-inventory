'use client';

import { useState, useEffect } from 'react';

interface LocationOption {
  id: string;
  name: string;
  path: string;
}

interface MoveModalProps {
  lotId: string;
  currentLocationId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveModal({ lotId, currentLocationId, onClose, onSuccess }: MoveModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch('/api/locations?limit=500');
        if (!res.ok) throw new Error('Failed to load locations');
        const json = (await res.json()) as { data: LocationOption[] };
        setLocations(json.data);
      } catch {
        setError('Failed to load locations');
      } finally {
        setFetching(false);
      }
    }
    fetchLocations();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lots/${lotId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: locationId || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'Failed to move lot');
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
          <h3 className="text-lg font-semibold text-gray-900">Move to New Location</h3>
          <button
            onClick={onClose}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {fetching ? (
          <p className="py-4 text-center text-sm text-gray-500">Loading locations…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New Location</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">— No location —</option>
                {locations.map((loc) => (
                  <option
                    key={loc.id}
                    value={loc.id}
                    disabled={loc.id === currentLocationId}
                  >
                    {loc.path || loc.name}
                    {loc.id === currentLocationId ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional reason for move…"
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
                disabled={loading}
              >
                {loading ? 'Moving…' : 'Move Lot'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
