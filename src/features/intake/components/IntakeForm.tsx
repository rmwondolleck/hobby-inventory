'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn, detectSourceType } from '@/lib/utils';
import { PartSearch } from './PartSearch';
import { LocationPicker } from './LocationPicker';
import type {
  IntakeMode,
  PartFormData,
  LotFormData,
  LocationOption,
  PartOption,
} from '../types';

const LAST_CATEGORY_KEY = 'intake_last_category';
const LAST_LOCATION_KEY = 'intake_last_location';

const today = () => new Date().toISOString().split('T')[0];

const emptyPart = (): PartFormData => ({
  name: '',
  category: '',
  manufacturer: '',
  mpn: '',
  notes: '',
});

const emptyLot = (): LotFormData => ({
  quantityMode: 'exact',
  quantity: '',
  unit: '',
  qualitativeStatus: 'plenty',
  sourceUrl: '',
  receivedAt: today(),
  notes: '',
});

interface CategoryOption {
  id: string | null;
  name: string;
  isDefault?: boolean;
}

export function IntakeForm() {
  const [mode, setMode] = useState<IntakeMode>('new-part');
  const [part, setPart] = useState<PartFormData>(emptyPart());
  const [lot, setLot] = useState<LotFormData>(emptyLot());
  const [selectedPart, setSelectedPart] = useState<PartOption | null>(null);
  const [location, setLocation] = useState<LocationOption | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ partName: string; lotId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load categories and restore last-used values from localStorage
  useEffect(() => {
    fetch('/api/categories?includeDefaults=true')
      .then((res) => res.json())
      .then((data) => {
        const db: CategoryOption[] = (data.data ?? []).map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }));
        const defaults: CategoryOption[] = (data.defaults ?? []).map(
          (c: { name: string }) => ({ id: null, name: c.name, isDefault: true })
        );
        // Merge: db categories first, then defaults not already in db
        const dbNames = new Set(db.map((c) => c.name));
        setCategories([...db, ...defaults.filter((d) => !dbNames.has(d.name))]);
      })
      .catch(() => {});

    // Restore last-used category
    const lastCategory = localStorage.getItem(LAST_CATEGORY_KEY);
    if (lastCategory) {
      setPart((p) => ({ ...p, category: lastCategory }));
    }

    // Restore last-used location
    const lastLocation = localStorage.getItem(LAST_LOCATION_KEY);
    if (lastLocation) {
      try {
        setLocation(JSON.parse(lastLocation) as LocationOption);
      } catch {
        // ignore
      }
    }
  }, []);

  const handlePartChange = <K extends keyof PartFormData>(key: K, value: PartFormData[K]) => {
    setPart((p) => ({ ...p, [key]: value }));
  };

  const handleLotChange = <K extends keyof LotFormData>(key: K, value: LotFormData[K]) => {
    setLot((l) => ({ ...l, [key]: value }));
  };

  const detectedSource = lot.sourceUrl ? detectSourceType(lot.sourceUrl) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let partId: string;
      let partName: string;

      if (mode === 'new-part') {
        // Step 1: create part
        const partRes = await fetch('/api/parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: part.name.trim(),
            category: part.category.trim() || undefined,
            manufacturer: part.manufacturer.trim() || undefined,
            mpn: part.mpn.trim() || undefined,
            notes: part.notes.trim() || undefined,
          }),
        });
        if (!partRes.ok) {
          const err = await partRes.json();
          throw new Error(err.message ?? 'Failed to create part');
        }
        const partData = await partRes.json();
        partId = partData.id;
        partName = partData.name;

        // Save last-used category
        if (part.category) {
          localStorage.setItem(LAST_CATEGORY_KEY, part.category);
        }
      } else {
        if (!selectedPart) {
          throw new Error('Please select a part first');
        }
        partId = selectedPart.id;
        partName = selectedPart.name;
      }

      // Build source object from URL
      const sourceObj =
        lot.sourceUrl.trim()
          ? {
              type: detectedSource ?? 'manual',
              url: lot.sourceUrl.trim(),
            }
          : undefined;

      // Step 2: create lot (backend auto-creates received event)
      const lotBody: Record<string, unknown> = {
        partId,
        quantityMode: lot.quantityMode,
        locationId: location?.id ?? undefined,
        receivedAt: lot.receivedAt || undefined,
        notes: lot.notes.trim() || undefined,
        source: sourceObj,
      };

      if (lot.quantityMode === 'exact') {
        const qty = parseInt(lot.quantity, 10);
        if (!isNaN(qty) && qty >= 0) {
          lotBody.quantity = qty;
        }
        if (lot.unit.trim()) {
          lotBody.unit = lot.unit.trim();
        }
      } else {
        lotBody.qualitativeStatus = lot.qualitativeStatus;
      }

      const lotRes = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lotBody),
      });

      if (!lotRes.ok) {
        const err = await lotRes.json();
        throw new Error(err.message ?? 'Failed to create lot');
      }

      const lotData = await lotRes.json();

      // Save last-used location
      if (location) {
        localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
      }

      setSuccess({ partName, lotId: lotData.data.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setSuccess(null);
    setError(null);
    setPart(emptyPart());
    setLot({ ...emptyLot(), receivedAt: today() });
    setSelectedPart(null);
    // Restore last category/location defaults
    const lastCategory = localStorage.getItem(LAST_CATEGORY_KEY);
    if (lastCategory) setPart((p) => ({ ...p, category: lastCategory }));
  };

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="mb-2 text-2xl">✓</div>
        <h2 className="text-lg font-semibold text-green-800">Added to inventory</h2>
        <p className="mt-1 text-sm text-green-700">
          <strong>{success.partName}</strong> was added successfully.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={handleAddAnother}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Add another
          </button>
          <Link
            href="/"
            className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  const showPartForm = mode === 'new-part';
  const showPartSearch = mode !== 'new-part';
  const isQuickRestock = mode === 'quick-restock';

  const canSubmit =
    !isSubmitting &&
    (showPartForm ? part.name.trim().length > 0 : selectedPart !== null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode selector */}
      <div className="flex overflow-hidden rounded-lg border border-gray-200">
        {(
          [
            { id: 'new-part', label: 'New Part + Lot' },
            { id: 'add-lot', label: 'Add Lot to Part' },
            { id: 'quick-restock', label: 'Quick Restock' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors',
              mode === id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Part section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {showPartForm ? 'Part' : 'Select Part'}
        </h2>

        {showPartSearch && (
          <PartSearch
            value={selectedPart}
            onChange={setSelectedPart}
            placeholder={
              mode === 'add-lot'
                ? 'Search for an existing part…'
                : 'Search for a part to restock…'
            }
          />
        )}

        {showPartForm && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={part.name}
                onChange={(e) => handlePartChange('name', e.target.value)}
                placeholder="e.g. ESP32-WROOM-32"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  list="categories-list"
                  value={part.category}
                  onChange={(e) => handlePartChange('category', e.target.value)}
                  placeholder="e.g. Resistors"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <datalist id="categories-list">
                  {categories.map((c) => (
                    <option key={c.name} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Manufacturer</label>
                <input
                  type="text"
                  value={part.manufacturer}
                  onChange={(e) => handlePartChange('manufacturer', e.target.value)}
                  placeholder="e.g. Espressif"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">MPN</label>
              <input
                type="text"
                value={part.mpn}
                onChange={(e) => handlePartChange('mpn', e.target.value)}
                placeholder="Manufacturer part number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
              <textarea
                value={part.notes}
                onChange={(e) => handlePartChange('notes', e.target.value)}
                placeholder="Optional part notes"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </section>

      {/* Lot section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Lot</h2>
        <div className="space-y-3">
          {/* Quantity mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-700">Quantity mode</span>
            <div className="flex overflow-hidden rounded-md border border-gray-200">
              {(['exact', 'qualitative'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleLotChange('quantityMode', m)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition-colors',
                    lot.quantityMode === m
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {lot.quantityMode === 'exact' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={lot.quantity}
                  onChange={(e) => handleLotChange('quantity', e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  value={lot.unit}
                  onChange={(e) => handleLotChange('unit', e.target.value)}
                  placeholder="e.g. pcs, m, kg"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Stock level</label>
              <div className="flex gap-2">
                {(['plenty', 'low', 'out'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLotChange('qualitativeStatus', level)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors',
                      lot.qualitativeStatus === level
                        ? level === 'plenty'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : level === 'low'
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Source URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Source URL
              {detectedSource && detectedSource !== 'manual' && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 capitalize">
                  {detectedSource}
                </span>
              )}
            </label>
            <input
              type="url"
              value={lot.sourceUrl}
              onChange={(e) => handleLotChange('sourceUrl', e.target.value)}
              placeholder="https://www.amazon.com/…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Received date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Received date</label>
            <input
              type="date"
              value={lot.receivedAt}
              onChange={(e) => handleLotChange('receivedAt', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {!isQuickRestock && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Lot notes</label>
              <textarea
                value={lot.notes}
                onChange={(e) => handleLotChange('notes', e.target.value)}
                placeholder="Optional notes for this batch"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </section>

      {/* Location section */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Location
        </h2>
        <LocationPicker value={location} onChange={setLocation} />
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Adding…' : 'Add to Inventory →'}
      </button>
    </form>
  );
}
