'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/PageHeader';

interface LocationData {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  notes: string | null;
  children?: { id: string; name: string; path: string }[];
}

interface LocationFormData {
  name: string;
  parentId: string | null;
  notes: string;
}

/** Returns IDs of all descendants of a given location. */
function getDescendantIds(locationId: string, locations: LocationData[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [locationId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const loc of locations) {
      if (loc.parentId === current && !descendants.has(loc.id)) {
        descendants.add(loc.id);
        queue.push(loc.id);
      }
    }
  }
  return descendants;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({ name: '', parentId: null, notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const openEditDialog = (location: LocationData) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      parentId: location.parentId,
      notes: location.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingLocation(null);
    setFormData({ name: '', parentId: null, notes: '' });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: formData.name.trim(),
        parentId: formData.parentId ?? null,
        notes: formData.notes.trim() || null,
      };
      if (editingLocation) {
        const res = await fetch(`/api/locations/${editingLocation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? 'Failed to update location');
        }
        const updated = (await res.json()) as { data: LocationData };
        setLocations((prev) =>
          prev.map((l) =>
            l.id === editingLocation.id
              ? { ...updated.data, children: l.children }
              : l
          )
        );
      } else {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? 'Failed to create location');
        }
        const created = (await res.json()) as { data: LocationData };
        setLocations((prev) => [...prev, created.data]);
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Parent dropdown excludes the location being edited and all its descendants.
  const parentOptions = editingLocation
    ? locations.filter((l) => {
        if (l.id === editingLocation.id) return false;
        return !getDescendantIds(editingLocation.id, locations).has(l.id);
      })
    : locations;

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
        <PageHeader
          title="Locations"
          description="Manage storage locations and hierarchy."
          actions={
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={openAddDialog}>
                + Add Location
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPrintLabel(locations.map((l) => l.id))}
                disabled={locations.length === 0}
              >
                🖨️ Print All Labels
              </Button>
            </div>
          }
        />

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
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(location)}
                        title="Edit this location"
                      >
                        <PencilIcon className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
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

      {/* Add / Edit Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location-name">Name *</Label>
              <Input
                id="location-name"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Location name"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location-parent">Parent Location</Label>
              <Select
                value={formData.parentId ?? '__none__'}
                onValueChange={(val) =>
                  setFormData((f) => ({ ...f, parentId: val === '__none__' ? null : val }))
                }
              >
                <SelectTrigger id="location-parent">
                  <SelectValue placeholder="None (root location)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (root location)</SelectItem>
                  {parentOptions.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.path || loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location-notes">Notes</Label>
              <Textarea
                id="location-notes"
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                rows={3}
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingLocation ? 'Save Changes' : 'Add Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
