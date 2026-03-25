'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { safeParseJson } from '@/lib/utils';
import type { ProjectListItem } from '@/features/projects/types';
import type { LotListItem } from '@/features/lots/types';

// --- Inventory value widget ---
const INVENTORY_VALUE_COLLAPSED_KEY = 'inventory-value-collapsed';

interface InventoryStats {
  totalValue: number;
  currency: string;
  valueByCategoryTop5: { category: string; value: number }[];
  lotsWithCostData: number;
  lotsWithoutCostData: number;
}

// --- Pinned projects ---
const PINNED_KEY = 'pinned-projects';

function loadPinnedIds(): string[] {
  const raw = localStorage.getItem(PINNED_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown>(raw, []);
  return Array.isArray(parsed) ? (parsed as string[]) : [];
}

// --- Low stock ---
const DEFAULT_THRESHOLD = 5;
const THRESHOLDS_KEY = 'stock-thresholds';

interface PartStockSummary {
  partId: string;
  partName: string;
  totalQuantity: number;
}

function loadThresholds(): Record<string, number> {
  try {
    const raw = localStorage.getItem(THRESHOLDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveThresholds(thresholds: Record<string, number>): void {
  localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));
}

export default function Home() {
  // Pinned projects state
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Low stock state
  const [lowStockParts, setLowStockParts] = useState<PartStockSummary[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [thresholdInputs, setThresholdInputs] = useState<Record<string, string>>({});

  // Inventory value state
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [valueWidgetOpen, setValueWidgetOpen] = useState(true);

  useEffect(() => {
    setPinnedIds(loadPinnedIds());
    setThresholds(loadThresholds());

    // Restore collapsed state from localStorage
    try {
      const stored = localStorage.getItem(INVENTORY_VALUE_COLLAPSED_KEY);
      if (stored !== null) setValueWidgetOpen(stored !== 'true');
    } catch {
      // storage disabled — keep default open state
    }

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

    async function fetchLowStock() {
      try {
        const [lowResult, outResult] = await Promise.allSettled([
          fetch('/api/lots?status=low&limit=100'),
          fetch('/api/lots?status=out&limit=100'),
        ]);

        const [lowData, outData] = await Promise.all([
          lowResult.status === 'fulfilled' && lowResult.value.ok
            ? (lowResult.value.json() as Promise<{ data: LotListItem[] }>)
            : Promise.resolve({ data: [] as LotListItem[] }),
          outResult.status === 'fulfilled' && outResult.value.ok
            ? (outResult.value.json() as Promise<{ data: LotListItem[] }>)
            : Promise.resolve({ data: [] as LotListItem[] }),
        ]);

        const allLots: LotListItem[] = [...lowData.data, ...outData.data];

        const partMap = new Map<string, PartStockSummary>();
        for (const lot of allLots) {
          const existing = partMap.get(lot.partId);
          const qty = lot.quantity ?? 0;
          if (existing) {
            existing.totalQuantity += qty;
          } else {
            partMap.set(lot.partId, {
              partId: lot.partId,
              partName: lot.part.name,
              totalQuantity: qty,
            });
          }
        }

        setLowStockParts(Array.from(partMap.values()));
      } catch {
        // silently ignore fetch errors on dashboard
      }
    }

    fetchLowStock();

    (async () => {
      try {
        const res = await fetch('/api/parts/stats', { signal: controller.signal });
        if (!res.ok) return;
        const data: InventoryStats = await res.json();
        setInventoryStats(data);
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

  function handleValueWidgetOpenChange(open: boolean) {
    setValueWidgetOpen(open);
    try {
      localStorage.setItem(INVENTORY_VALUE_COLLAPSED_KEY, String(!open));
    } catch {
      // storage disabled — state updated in memory only
    }
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  function handleThresholdBlur(partId: string) {
    const raw = thresholdInputs[partId];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_THRESHOLD;
    setThresholds((prev) => {
      const updated = { ...prev, [partId]: value };
      saveThresholds(updated);
      return updated;
    });
    setThresholdInputs((prev) => {
      const next = { ...prev };
      delete next[partId];
      return next;
    });
  }

  function getThreshold(partId: string): number {
    return thresholds[partId] ?? DEFAULT_THRESHOLD;
  }

  function getThresholdDisplayValue(partId: string): string {
    return thresholdInputs[partId] ?? String(getThreshold(partId));
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

        {inventoryStats !== null && (
          <section className="mt-8">
            <Collapsible open={valueWidgetOpen} onOpenChange={handleValueWidgetOpenChange}>
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    💰 Inventory Value
                    {!valueWidgetOpen && inventoryStats.lotsWithCostData > 0 && (
                      <span className="ml-2 text-base font-normal text-gray-500">
                        {formatCurrency(inventoryStats.totalValue)}
                      </span>
                    )}
                  </h2>
                  <span className="text-gray-400 text-sm select-none">
                    {valueWidgetOpen ? '▲' : '▼'}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border px-5 py-4">
                    {inventoryStats.lotsWithCostData === 0 ? (
                      <p className="text-sm text-gray-500">
                        Add purchase prices to lots to see inventory value.
                      </p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(inventoryStats.totalValue)}
                        </p>
                        {inventoryStats.lotsWithoutCostData > 0 && (
                          <p className="mt-1 text-xs text-gray-400">
                            {inventoryStats.lotsWithoutCostData} lot
                            {inventoryStats.lotsWithoutCostData === 1 ? '' : 's'} without cost
                            data excluded
                          </p>
                        )}
                        {inventoryStats.valueByCategoryTop5.length > 0 && (
                          <div className="mt-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Top Categories
                            </h3>
                            <ul className="space-y-1">
                              {inventoryStats.valueByCategoryTop5.map((item) => (
                                <li
                                  key={item.category}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">{item.category}</span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(item.value)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </section>
        )}

        {lowStockParts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
              ⚠️ Low Stock Warnings
            </h2>
            <div className="flex flex-col gap-3">
              {lowStockParts.map((part) => (
                <Alert key={part.partId} variant="default" className="border-yellow-300 bg-yellow-50">
                  <AlertTitle className="text-yellow-800">{part.partName}</AlertTitle>
                  <AlertDescription>
                    <div className="flex flex-wrap items-center gap-4 text-yellow-700">
                      <span>Qty: {part.totalQuantity}</span>
                      <span className="flex items-center gap-1">
                        Threshold:
                        <input
                          type="number"
                          min={0}
                          value={getThresholdDisplayValue(part.partId)}
                          onChange={(e) =>
                            setThresholdInputs((prev) => ({ ...prev, [part.partId]: e.target.value }))
                          }
                          onBlur={() => handleThresholdBlur(part.partId)}
                          className="ml-1 w-16 rounded border border-yellow-300 bg-white px-1 py-0.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                          aria-label={`Stock threshold for ${part.partName}`}
                        />
                      </span>
                      <Link
                        href={`/parts/${part.partId}`}
                        className="font-medium text-blue-600 underline hover:text-blue-800"
                      >
                        View Part
                      </Link>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </section>
        )}

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
            <span className="text-2xl">��</span>
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
