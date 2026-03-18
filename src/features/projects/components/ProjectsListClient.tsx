'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ProjectListItem, ProjectFilters } from '../types';
import { ProjectCard } from './ProjectCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const PROJECT_STATUS_VALUES = ['idea', 'planned', 'active', 'deployed', 'retired'] as const;

const PROJECT_STATUSES: Array<{ value: (typeof PROJECT_STATUS_VALUES)[number]; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'retired', label: 'Retired' },
];

const newProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  status: z.enum(PROJECT_STATUS_VALUES),
  tags: z.string(),
  notes: z.string(),
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;

function NewProjectDialog({ onCreated }: { onCreated: (project: ProjectListItem) => void }) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: '',
      status: 'idea',
      tags: '',
      notes: '',
    },
  });

  const onSubmit = async (data: NewProjectFormData) => {
    setSubmitError(null);
    try {
      const body = {
        name: data.name,
        status: data.status,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        notes: data.notes || undefined,
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? 'Failed to create project');
      }

      const json = (await res.json()) as { data: ProjectListItem };
      onCreated(json.data);
      reset();
      setOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { reset(); setSubmitError(null); } }}>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        + New Project
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. RC Car Build"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tags{' '}
              <span className="font-normal text-gray-400">(comma-separated)</span>
            </label>
            <input
              {...register('tags')}
              type="text"
              placeholder="e.g. rc, electronics, hobby"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <Textarea {...register('notes')} placeholder="Optional notes…" rows={3} />
          </div>

          {submitError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => { reset(); setSubmitError(null); setOpen(false); }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create Project'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  const refreshControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    return () => { refreshControllerRef.current?.abort(); };
  }, []);

  const handleProjectCreated = useCallback((_project: ProjectListItem) => {
    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    fetchProjects(filters, controller.signal);
  }, [fetchProjects, filters]);

  return (
    <div className="flex gap-6">
      <FilterSidebar
        filters={filters}
        availableTags={availableTags}
        onChange={setFilters}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SearchInput
              value={filters.search}
              onChange={(search) => setFilters((f) => ({ ...f, search }))}
            />
          </div>
          <NewProjectDialog onCreated={handleProjectCreated} />
        </div>

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
