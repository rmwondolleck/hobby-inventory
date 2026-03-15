'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { LocationOption } from '../types';

interface LocationPickerProps {
  value: LocationOption | null;
  onChange: (location: LocationOption | null) => void;
}

function flattenTree(nodes: LocationOption[], depth = 0): Array<LocationOption & { depth: number }> {
  const result: Array<LocationOption & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [tree, setTree] = useState<LocationOption[]>([]);
  const [filter, setFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadLocations = () => {
    setIsLoading(true);
    fetch('/api/locations?tree=true')
      .then((res) => res.json())
      .then((data) => {
        setTree(data.data ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (tree.length === 0) {
      loadLocations();
    }
  };

  const handleSelect = (loc: LocationOption) => {
    onChange(loc);
    setIsOpen(false);
    setFilter('');
    setShowCreate(false);
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleCreateLocation = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          parentId: newParentId || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const created: LocationOption = {
          id: json.data.id,
          name: json.data.name,
          path: json.data.path,
          parentId: json.data.parentId,
          children: [],
        };
        onChange(created);
        setNewName('');
        setNewParentId('');
        setShowCreate(false);
        setIsOpen(false);
        // Reload tree so the new location appears
        loadLocations();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const flat = flattenTree(tree);
  const filterLower = filter.toLowerCase();
  const filtered = filter
    ? flat.filter(
        (loc) =>
          loc.name.toLowerCase().includes(filterLower) ||
          loc.path.toLowerCase().includes(filterLower)
      )
    : flat;

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{value.name}</p>
            {value.path !== value.name && (
              <p className="text-xs text-gray-500 truncate">{value.path}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Clear location"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm text-gray-500 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Pick a location…
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              autoFocus
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search locations…"
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {isLoading ? (
            <div className="px-3 py-3 text-sm text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500">No locations found</div>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map((loc) => (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50',
                      value?.id === loc.id && 'bg-blue-50 font-medium text-blue-700',
                    )}
                    style={{ paddingLeft: filter ? undefined : `${12 + loc.depth * 16}px` }}
                  >
                    {loc.name}
                    {filter && loc.path !== loc.name && (
                      <span className="ml-1 text-xs text-gray-400">{loc.path}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100 p-2">
            {!showCreate ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50"
              >
                + Add new location
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Location name"
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateLocation();
                    if (e.key === 'Escape') setShowCreate(false);
                  }}
                />
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No parent (top level)</option>
                  {flat.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.path}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateLocation}
                    disabled={!newName.trim() || isCreating}
                    className="flex-1 rounded-md bg-blue-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
