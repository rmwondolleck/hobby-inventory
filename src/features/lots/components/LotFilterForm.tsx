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
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

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

  return (
    <aside className="w-56 shrink-0 space-y-5">
      <h2 className="font-semibold text-gray-700">Filters</h2>

      <div className="space-y-1.5">
        <label htmlFor="filter-status" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
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

      {partOptions.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="filter-part" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
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

      {locationOptions.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="filter-location" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
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

      <div className="space-y-1.5">
        <label htmlFor="filter-seller" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
          Seller
        </label>
        <input
          id="filter-seller"
          type="text"
          value={sellerInput}
          onChange={e => handleSellerChange(e.target.value)}
          placeholder="Search seller..."
          className={SELECT_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-sort-by" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
          Sort By
        </label>
        <select
          id="filter-sort-by"
          value={currentSortBy}
          onChange={e => updateFilter('sortBy', e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Default (Updated)</option>
          <option value="updatedAt">Last Updated</option>
          <option value="createdAt">Date Created</option>
          <option value="quantity">Quantity</option>
          <option value="status">Status</option>
        </select>
      </div>

      {currentSortBy && (
        <div className="space-y-1.5">
          <label htmlFor="filter-sort-dir" className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
            Sort Direction
          </label>
          <select
            id="filter-sort-dir"
            value={currentSortDir}
            onChange={e => updateFilter('sortDir', e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      )}

      {(currentStatus || currentPartId || currentLocationId || currentSeller || currentSortBy) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-blue-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </aside>
  );
}
