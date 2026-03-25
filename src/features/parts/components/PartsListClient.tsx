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
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
        className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-8 text-sm shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
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

  const fetchParts = useCallback(async (currentFilters: PartFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.category) params.set('category', currentFilters.category);
      if (currentFilters.tags.length > 0)
        params.set('tags', currentFilters.tags.join(','));
      if (currentFilters.includeArchived) params.set('includeArchived', 'true');
      params.set('limit', '200');

      const res = await fetch(`/api/parts?${params.toString()}`);
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
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilters((f: PartFilters) => ({ ...f, search }))}
            />
          </div>
          <a
            href={(() => {
              const p = new URLSearchParams();
              if (filters.category) p.set('category', filters.category);
              if (filters.includeArchived) p.set('archived', 'true');
              const qs = p.toString();
              return `/api/parts/export${qs ? `?${qs}` : ''}`;
            })()}
            download
            className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted"
          >
            Export CSV
          </a>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Error: {error}
            </div>
          ) : parts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                {filters.search || filters.category || filters.tags.length > 0
                  ? 'No parts match your filters.'
                  : 'No parts yet. Add your first part to get started.'}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
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
