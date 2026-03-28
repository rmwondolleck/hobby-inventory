'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

const PARTS_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Last Updated' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
] as const;

export function PartsListClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = (searchParams.get('sortDir') ?? 'desc') as 'asc' | 'desc';

  const updateSort = useCallback(
    (newSortBy: string, newSortDir: 'asc' | 'desc') => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sortBy', newSortBy);
      params.set('sortDir', newSortDir);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Track whether sidebar data has been initialized
  const sidebarInitialized = useRef(false);

  const fetchParts = useCallback(async (currentFilters: PartFilters, currentSortBy: string, currentSortDir: 'asc' | 'desc') => {
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
      params.set('sortBy', currentSortBy);
      params.set('sortDir', currentSortDir);

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
    fetchParts(filters, sortBy, sortDir);
  }, [fetchParts, filters, sortBy, sortDir]);

  return (
    <div className="flex gap-6">
      <FilterSidebar
        filters={filters}
        categories={categories}
        availableTags={availableTags}
        onChange={setFilters}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilters((f: PartFilters) => ({ ...f, search }))}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="parts-sort-by" className="text-sm text-muted-foreground whitespace-nowrap">
              Sort by
            </label>
            <select
              id="parts-sort-by"
              value={sortBy}
              onChange={e => updateSort(e.target.value, sortDir)}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm"
            >
              {PARTS_SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              id="parts-sort-dir"
              value={sortDir}
              onChange={e => updateSort(sortBy, e.target.value as 'asc' | 'desc')}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
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

