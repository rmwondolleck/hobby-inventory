'use client';

import { cn } from '@/lib/utils';
import type { PartFilters } from '../types';

interface FilterSidebarProps {
  filters: PartFilters;
  categories: string[];
  availableTags: string[];
  onChange: (filters: PartFilters) => void;
}

export function FilterSidebar({
  filters,
  categories,
  availableTags,
  onChange,
}: FilterSidebarProps) {
  const handleCategoryToggle = (category: string) => {
    onChange({
      ...filters,
      category: filters.category === category ? '' : category,
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: newTags });
  };

  const hasActiveFilters =
    filters.category !== '' || filters.tags.length > 0 || filters.includeArchived;

  return (
    <aside className="w-56 shrink-0">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={() =>
                onChange({ ...filters, category: '', tags: [], includeArchived: false })
              }
              className="text-xs text-blue-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Category
            </h3>
            <ul className="mt-2 space-y-1">
              {categories.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => handleCategoryToggle(cat)}
                    aria-pressed={filters.category === cat}
                    className={cn(
                      'w-full rounded px-2 py-1 text-left text-sm transition-colors',
                      filters.category === cat
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Tags
            </h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  aria-pressed={filters.tags.includes(tag)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs transition-colors',
                    filters.tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 border-t pt-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={filters.includeArchived}
              onChange={() =>
                onChange({ ...filters, includeArchived: !filters.includeArchived })
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Show archived</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
