'use client';

import { useState } from 'react';
import type { LocationWithCount } from './LocationTree';

interface LocationModalProps {
  mode: 'create' | 'edit';
  parentId?: string | null;
  location?: LocationWithCount;
  locations: LocationWithCount[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function LocationModal({
  mode,
  parentId,
  location,
  locations,
  onClose,
  onSuccess,
}: LocationModalProps) {
  const [name, setName] = useState(location?.name ?? '');
  const [selectedParentId, setSelectedParentId] = useState<string>(
    mode === 'edit' ? (location?.parentId ?? '') : (parentId ?? '')
  );
  const [notes, setNotes] = useState(location?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out self and descendants when editing (to avoid circular references)
  const availableParents = locations
    .filter((loc) => {
      if (mode === 'edit' && location) {
        if (loc.id === location.id) return false;
        if (loc.path.startsWith(location.path + '/')) return false;
      }
      return true;
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = mode === 'create' ? '/api/locations' : `/api/locations/${location!.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const body = {
        name: name.trim(),
        parentId: selectedParentId || null,
        notes: notes.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? 'An error occurred');
        return;
      }

      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-popover rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-popover-foreground">
            {mode === 'create' ? 'Add Location' : 'Edit Location'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-popover-foreground mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Shelf A, Drawer 1, Bin #3"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-popover-foreground mb-1">
              Parent Location
            </label>
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
              disabled={loading}
            >
              <option value="">— Root (no parent) —</option>
              {availableParents.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.path}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-popover-foreground mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional description or notes..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-background"
              disabled={loading}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground border border-border rounded-lg hover:bg-accent"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
