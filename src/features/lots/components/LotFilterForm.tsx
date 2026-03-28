'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface LotFilterFormProps {
  partOptions: FilterOption[];
  locationOptions: FilterOption[];
}

const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'installed', label: 'Installed' },
  { value: 'lost', label: 'Lost' },
  { value: 'scrapped', label: 'Scrapped' },
];

const SELECT_CLASS =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mt-2';

const SECTION_LABEL = 'block text-xs font-medium uppercase tracking-wide text-muted-foreground';

export function LotFilterForm({ partOptions, locationOptions }: LotFilterFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('offset');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const currentStatus = searchParams.get('status') ?? '';
  const currentPartId = searchParams.get('partId') ?? '';
  const currentLocationId = searchParams.get('locationId') ?? '';
  const currentSeller = searchParams.get('seller') ?? '';
  const currentSortBy = searchParams.get('sortBy') ?? '';
  const currentSortDir = searchParams.get('sortDir') ?? 'desc';

  // Local state for seller input to avoid pushing on every keystroke
  const [sellerInput, setSellerInput] = useState(currentSeller);
  const sellerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when the URL param changes externally (e.g. clear filters)
  useEffect(() => {
    setSellerInput(currentSeller);
  }, [currentSeller]);

  // Clean up pending debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (sellerDebounceRef.current) clearTimeout(sellerDebounceRef.current);
    };
  }, []);

  const handleSellerChange = (value: string) => {
    setSellerInput(value);
    if (sellerDebounceRef.current) clearTimeout(sellerDebounceRef.current);
    sellerDebounceRef.current = setTimeout(() => {
      updateFilter('seller', value);
    }, 400);
  };

  const hasActiveFilters = !!(currentStatus || currentPartId || currentLocationId || currentSeller);

  return (
    <aside className="w-56 shrink-0">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={() => router.push(pathname)}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mt-4">
          <label htmlFor="filter-status" className={SECTION_LABEL}>
            Status
          </label>
          <select
            id="filter-status"
            value={currentStatus}
            onChange={e => updateFilter('status', e.target.value)}
            className={SELECT_CLASS}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Part */}
        {partOptions.length > 0 && (
          <div className="mt-4">
            <label htmlFor="filter-part" className={SECTION_LABEL}>
              Part
            </label>
            <select
              id="filter-part"
              value={currentPartId}
              onChange={e => updateFilter('partId', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All Parts</option>
              {partOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location */}
        {locationOptions.length > 0 && (
          <div className="mt-4">
            <label htmlFor="filter-location" className={SECTION_LABEL}>
              Location
            </label>
            <select
              id="filter-location"
              value={currentLocationId}
              onChange={e => updateFilter('locationId', e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All Locations</option>
              {locationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Seller */}
        <div className="mt-4">
          <label htmlFor="filter-seller" className={SECTION_LABEL}>
            Seller
          </label>
          <input
            id="filter-seller"
            type="text"
            value={sellerInput}
            onChange={e => handleSellerChange(e.target.value)}
            placeholder="Search seller…"
            className={SELECT_CLASS}
          />
        </div>

        {/* Sort — visually separated */}
        <div className="mt-4 border-t border-border pt-4">
          <h3 className={SECTION_LABEL}>Sort</h3>
          <select
            id="filter-sort-by"
            value={currentSortBy}
            onChange={e => updateFilter('sortBy', e.target.value)}
            className={SELECT_CLASS}
            aria-label="Sort by"
          >
            <option value="">Default (Updated)</option>
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Date Created</option>
            <option value="quantity">Quantity</option>
            <option value="status">Status</option>
          </select>
          <select
            id="filter-sort-dir"
            value={currentSortDir}
            onChange={e => updateFilter('sortDir', e.target.value)}
            className={SELECT_CLASS}
            aria-label="Sort direction"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
