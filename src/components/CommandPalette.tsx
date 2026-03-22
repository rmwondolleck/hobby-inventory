'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartResult {
  id: string;
  name: string;
  category: string | null;
  totalQuantity: number;
}

interface LotResult {
  id: string;
  quantity: number | null;
  qualitativeStatus: string | null;
  quantityMode: string;
  status: string;
  part: { id: string; name: string };
  location: { id: string; name: string; path: string } | null;
}

interface LocationResult {
  id: string;
  name: string;
  path: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [parts, setParts] = useState<PartResult[]>([]);
  const [lots, setLots] = useState<LotResult[]>([]);
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cached location list — fetched once when palette first opens
  const locationsCacheRef = useRef<LocationResult[] | null>(null);

  // Fetch locations once when the palette first opens
  useEffect(() => {
    if (!open || locationsCacheRef.current !== null) return;

    fetch('/api/locations')
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => {
        locationsCacheRef.current = json.data ?? [];
        // Apply current query filter immediately if query is already set
        if (query) {
          setLocations(filterLocations(locationsCacheRef.current ?? [], query));
        }
      })
      .catch(() => {
        locationsCacheRef.current = [];
      });
  }, [open, query]);

  // Reset state when palette closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setParts([]);
      setLots([]);
      setLocations([]);
      setIsLoading(false);
    }
  }, [open]);

  const filterLocations = (all: LocationResult[], q: string): LocationResult[] => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return all
      .filter(l => l.name.toLowerCase().includes(lower) || l.path.toLowerCase().includes(lower))
      .slice(0, 5);
  };

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setParts([]);
      setLots([]);
      setLocations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [partsRes, lotsRes] = await Promise.all([
        fetch(`/api/parts?search=${encodeURIComponent(q)}&limit=5`),
        fetch(`/api/lots?q=${encodeURIComponent(q)}&limit=5`),
      ]);

      const [partsJson, lotsJson] = await Promise.all([
        partsRes.ok ? partsRes.json() : { data: [] },
        lotsRes.ok ? lotsRes.json() : { data: [] },
      ]);

      setParts(partsJson.data ?? []);
      setLots(lotsJson.data ?? []);
      setLocations(filterLocations(locationsCacheRef.current ?? [], q));
    } catch {
      // Silently degrade — empty results
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 150);
  };

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const hasResults = parts.length > 0 || lots.length > 0 || locations.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search parts, lots, locations…"
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Searching…
          </div>
        )}

        {!isLoading && query && !hasResults && (
          <CommandEmpty>No results found for &ldquo;{query}&rdquo;</CommandEmpty>
        )}

        {!isLoading && parts.length > 0 && (
          <CommandGroup heading="Parts">
            {parts.map(part => (
              <CommandItem
                key={part.id}
                value={`part-${part.id}`}
                onSelect={() => navigate(`/parts/${part.id}`)}
                className="flex items-center gap-2"
              >
                <span className="flex-1 truncate">{part.name}</span>
                {part.category && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {part.category}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {part.totalQuantity ?? 0} in stock
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isLoading && lots.length > 0 && (
          <CommandGroup heading="Lots">
            {lots.map(lot => (
              <CommandItem
                key={lot.id}
                value={`lot-${lot.id}`}
                onSelect={() => navigate(`/lots/${lot.id}`)}
                className="flex items-center gap-2"
              >
                <span className="flex-1 truncate">{lot.part?.name ?? 'Unknown part'}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {lot.quantityMode === 'exact'
                    ? `${lot.quantity ?? 0} units`
                    : (lot.qualitativeStatus ?? lot.status)}
                </span>
                {lot.location && (
                  <span className="shrink-0 max-w-35 truncate text-xs text-muted-foreground">
                    {lot.location.path}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!isLoading && locations.length > 0 && (
          <CommandGroup heading="Locations">
            {locations.map(loc => (
              <CommandItem
                key={loc.id}
                value={`location-${loc.id}`}
                onSelect={() => navigate(`/locations/${loc.id}`)}
                className="flex items-center gap-2"
              >
                <span className="flex-1 truncate">{loc.name}</span>
                {loc.path !== loc.name && (
                  <span className="shrink-0 max-w-45 truncate text-xs text-muted-foreground">
                    {loc.path}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}



