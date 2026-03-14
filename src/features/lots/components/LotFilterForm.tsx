'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

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
          value={currentSeller}
          onChange={e => updateFilter('seller', e.target.value)}
          placeholder="Search seller..."
          className={SELECT_CLASS}
        />
      </div>

      {(currentStatus || currentPartId || currentLocationId || currentSeller) && (
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
