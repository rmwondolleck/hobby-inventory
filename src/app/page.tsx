'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { safeParseJson } from '@/lib/utils';
import type { ProjectListItem } from '@/features/projects/types';

const PINNED_KEY = 'pinned-projects';

function loadPinnedIds(): string[] {
  const raw = localStorage.getItem(PINNED_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown>(raw, []);
  return Array.isArray(parsed) ? (parsed as string[]) : [];
}

export default function Home() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    setPinnedIds(loadPinnedIds());

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/projects?status=active&limit=20', {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: { data?: ProjectListItem[] } = await res.json();
        setProjects(data.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    })();

    return () => controller.abort();
  }, []);

  function handlePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {
        // quota exceeded or storage disabled — pinned state updated in memory only
      }
      return next;
    });
  }

  const pinnedProjects = projects.filter((p) => pinnedIds.includes(p.id));
  const unpinnedProjects = projects.filter((p) => !pinnedIds.includes(p.id));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          title="Welcome to Hobby Inventory"
          description="Track parts, lots, and locations for all your hobby projects."
        />

        {pinnedProjects.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">📌 Pinned Projects</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pinnedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isPinned
                  onPin={handlePin}
                />
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/intake"
            className="group flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">＋</span>
            <h2 className="text-base font-semibold text-blue-800">Add to Inventory</h2>
            <p className="text-sm text-blue-600">
              Quick-add new parts and lots in under 60 seconds.
            </p>
          </Link>

          <Link
            href="/parts"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">📦</span>
            <h2 className="text-base font-semibold text-gray-800">Browse Parts</h2>
            <p className="text-sm text-gray-500">Search and filter your parts catalog.</p>
          </Link>

          <Link
            href="/lots"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">🗂️</span>
            <h2 className="text-base font-semibold text-gray-800">Lots</h2>
            <p className="text-sm text-gray-500">View stock quantities, sources, and locations.</p>
          </Link>

          <Link
            href="/locations"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">📍</span>
            <h2 className="text-base font-semibold text-gray-800">Locations</h2>
            <p className="text-sm text-gray-500">Manage storage locations and hierarchy.</p>
          </Link>

          <Link
            href="/projects"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="text-2xl">🔧</span>
            <h2 className="text-base font-semibold text-gray-800">Projects</h2>
            <p className="text-sm text-gray-500">Track part allocations across builds.</p>
          </Link>
        </div>

        {unpinnedProjects.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Active Projects</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unpinnedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isPinned={false}
                  onPin={handlePin}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
