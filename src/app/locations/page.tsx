'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LocationData {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  notes: string | null;
  children?: { id: string; name: string; path: string }[];
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/locations?withChildren=true&limit=500')
      .then((r) => r.json())
      .then((data) => {
        setLocations(data.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load locations');
        setLoading(false);
      });
  }, []);

  const openPrintLabel = (ids: string[], size = 'medium') => {
    window.open(
      `/print/labels?type=location&ids=${encodeURIComponent(ids.join(','))}&size=${encodeURIComponent(size)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-muted-foreground">Loading locations…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <Button
            onClick={() => openPrintLabel(locations.map((l) => l.id))}
            disabled={locations.length === 0}
          >
            🖨️ Print All Labels
          </Button>
        </div>

        {locations.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No locations found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/locations/${location.id}`}
                      className="text-primary hover:underline"
                    >
                      {location.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {location.path}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {location.notes ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPrintLabel([location.id])}
                        title="Print label for this location"
                      >
                        🏷️ Label
                      </Button>
                      {(location.children?.length ?? 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrintLabel((location.children ?? []).map((c) => c.id))}
                          title="Print labels for all child locations"
                        >
                          🏷️ Children
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/print/labels?type=lot&locationId=${encodeURIComponent(location.id)}&size=medium`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Print labels for all lots at this location"
                        >
                          🏷️ Lots
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
