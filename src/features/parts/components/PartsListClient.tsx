'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { PartListItem, PartFilters } from '../types';
import { PartCard } from './PartCard';
import { FilterSidebar } from './FilterSidebar';

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder="Search by name, MPN, manufacturer…"
        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function PartsListClient() {
  const [parts, setParts] = useState<PartListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<PartFilters>({
    search: '',
    category: '',
    tags: [],
    includeArchived: false,
  });

  // Track whether sidebar data has been initialized
  const sidebarInitialized = useRef(false);
  // Hold a reference to the latest AbortController so we can cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchParts = useCallback(async (currentFilters: PartFilters) => {
    // Abort any in-flight request before starting a new one
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.category) params.set('category', currentFilters.category);
      if (currentFilters.tags.length > 0)
        params.set('tags', currentFilters.tags.join(','));
      if (currentFilters.includeArchived) params.set('includeArchived', 'true');

      const res = await fetch(`/api/parts?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to fetch parts');
      const json = (await res.json()) as { data: PartListItem[]; total: number };

      setParts(json.data ?? []);
      setTotal(json.total ?? 0);

      // Populate sidebar metadata from first unfiltered load
      if (!sidebarInitialized.current) {
        const cats = Array.from(
          new Set(
            (json.data as PartListItem[])
              .map((p) => p.category)
              .filter((c): c is string => Boolean(c))
          )
        ).sort();
        setCategories(cats);

        const allTags = (json.data as PartListItem[]).flatMap((p) => p.tags);
        setAvailableTags(Array.from(new Set(allTags)).sort());
        sidebarInitialized.current = true;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts(filters);
  }, [fetchParts, filters]);

  return (
    <div className="flex gap-6">
      <FilterSidebar
        filters={filters}
        categories={categories}
        availableTags={availableTags}
        onChange={setFilters}
      />

      <div className="min-w-0 flex-1">
        <SearchInput
          value={filters.search}
          onChange={(search) => setFilters((f: PartFilters) => ({ ...f, search }))}
        />

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Error: {error}
            </div>
          ) : parts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">
                {filters.search || filters.category || filters.tags.length > 0
                  ? 'No parts match your filters.'
                  : 'No parts yet. Add your first part to get started.'}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-500">
                {total} part{total !== 1 ? 's' : ''}
                {filters.search || filters.category || filters.tags.length > 0
                  ? ' matching filters'
                  : ' total'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {parts.map((part) => (
                  <PartCard key={part.id} part={part} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
