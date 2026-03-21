'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CategoryCombobox, type CategoryOptionWithSchema } from './CategoryCombobox';
import type { PartDetail } from '../types';

interface DuplicatePartDialogProps {
  part: PartDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParameterRow {
  key: string;
  value: string;
  originalType: 'string' | 'number' | 'boolean';
  fromTemplate?: boolean;
}

export function DuplicatePartDialog({ part, open, onOpenChange }: DuplicatePartDialogProps) {
  const router = useRouter();

  const initialParams: ParameterRow[] = Object.entries(part.parameters).map(([key, value]) => ({
    key,
    value: String(value),
    originalType: (typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string') as 'string' | 'number' | 'boolean',
  }));

  const [name, setName] = useState(`${part.name} (copy)`);
  const [category, setCategory] = useState(part.category ?? '');
  const [manufacturer, setManufacturer] = useState(part.manufacturer ?? '');
  const [mpn, setMpn] = useState(part.mpn ?? '');
  const [notes, setNotes] = useState(part.notes ?? '');
  const [tagsInput, setTagsInput] = useState(part.tags.join(', '));
  const [paramRows, setParamRows] = useState<ParameterRow[]>(initialParams);
  const [categories, setCategories] = useState<CategoryOptionWithSchema[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories (with schemas) on mount
  useEffect(() => {
    const req = fetch('/api/categories?includeDefaults=true');
    if (!req || typeof req.then !== 'function') return;
    req
      .then((res) => res.json())
      .then((data) => {
        const db: CategoryOptionWithSchema[] = (
          data.data ?? []
        ).map((c: { id: string; name: string; parameterSchema: Record<string, unknown> }) => ({
          id: c.id,
          name: c.name,
          parameterSchema: c.parameterSchema ?? {},
        }));
        const defaults: CategoryOptionWithSchema[] = (data.defaults ?? []).map(
          (c: { name: string; parameterSchema: Record<string, unknown> }) => ({
            id: null,
            name: c.name,
            parameterSchema: c.parameterSchema ?? {},
          })
        );
        const dbNames = new Set(db.map((c) => c.name));
        setCategories([...db, ...defaults.filter((d) => !dbNames.has(d.name))]);
      })
      .catch(() => {});
  }, []);

  function updateParamRow(index: number, field: 'key' | 'value', val: string) {
    setParamRows((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, [field]: val, fromTemplate: field === 'key' ? false : row.fromTemplate }
          : row
      ),
    );
  }

  function addParamRow() {
    setParamRows((rows) => [...rows, { key: '', value: '', originalType: 'string' }]);
  }

  function removeParamRow(index: number) {
    setParamRows((rows) => rows.filter((_, i) => i !== index));
  }

  function handleCategorySelect(cat: CategoryOptionWithSchema | null) {
    if (!cat) return;
    const schemaKeys = Object.keys(cat.parameterSchema);
    if (schemaKeys.length === 0) return;
    setParamRows((current) => {
      const existingKeys = new Set(current.map((r) => r.key.trim()).filter(Boolean));
      const newRows: ParameterRow[] = schemaKeys
        .filter((k) => !existingKeys.has(k))
        .map((k) => ({ key: k, value: '', originalType: 'string' as const, fromTemplate: true }));
      return newRows.length > 0 ? [...current, ...newRows] : current;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const categoryName = category.trim() || undefined;

    // If a new (non-existing) category was typed, upsert it first
    if (categoryName) {
      const isExisting = categories.some(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (!isExisting) {
        try {
          await fetch('/api/categories/upsert-by-name', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName }),
          });
        } catch {
          // Non-fatal: the POST /api/parts route will handle category resolution
        }
      }
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const parameters: Record<string, string | number | boolean> = {};
    for (const row of paramRows) {
      if (row.key.trim()) {
        const raw = row.value;
        let coerced: string | number | boolean = raw;
        if (row.originalType === 'number') {
          const n = Number(raw);
          coerced = isNaN(n) ? raw : n;
        } else if (row.originalType === 'boolean') {
          coerced = raw === 'true' ? true : raw === 'false' ? false : raw;
        }
        parameters[row.key.trim()] = coerced;
      }
    }

    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category: categoryName,
          manufacturer: manufacturer.trim() || undefined,
          mpn: mpn.trim() || undefined,
          notes: notes.trim() || undefined,
          tags,
          parameters,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { message?: string; error?: string };
        throw new Error(json.message ?? json.error ?? 'Failed to create part');
      }

      const json = (await res.json()) as { id: string };
      onOpenChange(false);
      router.push(`/parts/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate Part</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dup-name">Name *</Label>
            <Input
              id="dup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dup-category">Category</Label>
            <CategoryCombobox
              id="dup-category"
              value={category}
              onValueChange={setCategory}
              onCategorySelect={handleCategorySelect}
              categories={categories}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dup-manufacturer">Manufacturer</Label>
              <Input
                id="dup-manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dup-mpn">MPN</Label>
              <Input
                id="dup-mpn"
                value={mpn}
                onChange={(e) => setMpn(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dup-notes">Notes</Label>
            <Textarea
              id="dup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dup-tags">Tags (comma-separated)</Label>
            <Input
              id="dup-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. pla, filament, blue"
            />
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <Label>Parameters</Label>
            {paramRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Key"
                  value={row.key}
                  onChange={(e) => updateParamRow(i, 'key', e.target.value)}
                  className="flex-1"
                />
                <div className="relative flex-1">
                  <Input
                    placeholder={row.fromTemplate && !row.value ? 'Template key — enter value' : 'Value'}
                    value={row.value}
                    onChange={(e) => updateParamRow(i, 'value', e.target.value)}
                    className={row.fromTemplate && !row.value ? 'border-dashed' : ''}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeParamRow(i)}
                  aria-label="Remove parameter"
                  className="shrink-0 text-gray-400 hover:text-red-600"
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addParamRow}>
              + Add parameter
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating…' : 'Save as New Part'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
