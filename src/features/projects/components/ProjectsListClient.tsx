'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ProjectListItem, ProjectFilters } from '../types';
import { ProjectCard } from './ProjectCard';

const PROJECT_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'retired', label: 'Retired' },
];

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
        placeholder="Search projects…"
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

function FilterSidebar({
  filters,
  availableTags,
  onChange,
}: {
  filters: ProjectFilters;
  availableTags: string[];
  onChange: (f: ProjectFilters) => void;
}) {
  const hasActiveFilters =
    filters.status !== '' || filters.tags.length > 0;

  return (
    <aside className="w-56 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Filters
        </span>
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ ...filters, status: '', tags: [] })}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-gray-600">Status</p>
        <div className="space-y-1">
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() =>
                onChange({
                  ...filters,
                  status: filters.status === s.value ? '' : s.value,
                })
              }
              className={`w-full rounded px-2 py-1 text-left text-sm transition-colors ${
                filters.status === s.value
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {availableTags.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-600">Tags</p>
          <div className="flex flex-wrap gap-1">
            {availableTags.map((tag) => {
              const isSelected = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() =>
                    onChange({
                      ...filters,
                      tags: isSelected
                        ? filters.tags.filter((t) => t !== tag)
                        : [...filters.tags, tag],
                    })
                  }
                  className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

export function ProjectsListClient() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: '',
    tags: [],
  });

  const sidebarInitialized = useRef(false);

  const fetchProjects = useCallback(async (currentFilters: ProjectFilters, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.tags.length > 0)
        params.set('tags', currentFilters.tags.join(','));
      params.set('limit', '200');

      const res = await fetch(`/api/projects?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const json = (await res.json()) as { data: ProjectListItem[]; total: number };

      setProjects(json.data ?? []);
      setTotal(json.total ?? 0);

      if (!sidebarInitialized.current) {
        const allTags = (json.data as ProjectListItem[]).flatMap((p) => p.tags);
        setAvailableTags(Array.from(new Set(allTags)).sort());
        sidebarInitialized.current = true;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(filters, controller.signal);
    return () => controller.abort();
  }, [fetchProjects, filters]);

  return (
    <div className="flex gap-6">
      <FilterSidebar
        filters={filters}
        availableTags={availableTags}
        onChange={setFilters}
      />

      <div className="min-w-0 flex-1">
        <SearchInput
          value={filters.search}
          onChange={(search) => setFilters((f) => ({ ...f, search }))}
        />

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Error: {error}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500">
                {filters.search || filters.status || filters.tags.length > 0
                  ? 'No projects match your filters.'
                  : 'No projects yet.'}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-gray-500">
                {total} project{total !== 1 ? 's' : ''}
                {filters.search || filters.status || filters.tags.length > 0
                  ? ' matching filters'
                  : ' total'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
