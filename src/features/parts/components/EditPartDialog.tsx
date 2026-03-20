'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PartDetail } from '../types';

interface CategoryOption {
  id: string | null;
  name: string;
}

interface ParamRow {
  key: string;
  value: string;
}

interface EditPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: PartDetail;
  onSave: (updated: PartDetail) => void;
}

/** Sentinel used for Radix Select when no category is selected. */
const NONE_CATEGORY = '__none__';

function paramsToRows(parameters: Record<string, unknown>): ParamRow[] {
  return Object.entries(parameters).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

function rowsToParams(rows: ParamRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (k) {
      result[k] = row.value;
    }
  }
  return result;
}

export function EditPartDialog({ open, onOpenChange, part, onSave }: EditPartDialogProps) {
  const [name, setName] = useState(part.name);
  const [category, setCategory] = useState(part.category ?? NONE_CATEGORY);
  const [manufacturer, setManufacturer] = useState(part.manufacturer ?? '');
  const [mpn, setMpn] = useState(part.mpn ?? '');
  const [notes, setNotes] = useState(part.notes ?? '');
  const [tags, setTags] = useState(part.tags.join(', '));
  const [paramRows, setParamRows] = useState<ParamRow[]>(() => paramsToRows(part.parameters));

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when part changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(part.name);
      setCategory(part.category ?? NONE_CATEGORY);
      setManufacturer(part.manufacturer ?? '');
      setMpn(part.mpn ?? '');
      setNotes(part.notes ?? '');
      setTags(part.tags.join(', '));
      setParamRows(paramsToRows(part.parameters));
      setError(null);
    }
  }, [open, part]);

  // Load categories once on mount
  useEffect(() => {
    fetch('/api/categories?includeDefaults=true')
      .then((res) => res.json())
      .then((data) => {
        const db: CategoryOption[] = (data.data ?? []).map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }));
        const defaults: CategoryOption[] = (data.defaults ?? []).map(
          (c: { name: string }) => ({ id: null, name: c.name })
        );
        const dbNames = new Set(db.map((c) => c.name));
        setCategories([...db, ...defaults.filter((d) => !dbNames.has(d.name))]);
      })
      .catch(() => {});
  }, []);

  const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
    setParamRows((rows: ParamRow[]) =>
      rows.map((row: ParamRow, i: number) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addParamRow = () => {
    setParamRows((rows: ParamRow[]) => [...rows, { key: '', value: '' }]);
  };

  const removeParamRow = (index: number) => {
    setParamRows((rows: ParamRow[]) => rows.filter((_: ParamRow, i: number) => i !== index));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const parsedTags = tags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const body = {
      name: name.trim(),
      category: category === NONE_CATEGORY ? null : category.trim() || null,
      manufacturer: manufacturer.trim() || null,
      mpn: mpn.trim() || null,
      notes: notes.trim() || null,
      tags: parsedTags,
      parameters: rowsToParams(paramRows),
    };

    try {
      const res = await fetch(`/api/parts/${part.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { message?: string }).message ?? 'Failed to update part');
      }

      const json = await res.json() as { data: Omit<PartDetail, 'lots'> };
      onSave({ ...part, ...json.data });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Part</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="edit-part-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="edit-part-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. ESP32-WROOM-32"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="edit-part-category" className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="edit-part-category">
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_CATEGORY}>— None —</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manufacturer + MPN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-part-manufacturer" className="mb-1 block text-sm font-medium text-gray-700">
                Manufacturer
              </label>
              <Input
                id="edit-part-manufacturer"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Espressif"
              />
            </div>
            <div>
              <label htmlFor="edit-part-mpn" className="mb-1 block text-sm font-medium text-gray-700">
                MPN
              </label>
              <Input
                id="edit-part-mpn"
                value={mpn}
                onChange={(e) => setMpn(e.target.value)}
                placeholder="Manufacturer part number"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit-part-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="edit-part-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className="w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="edit-part-tags" className="mb-1 block text-sm font-medium text-gray-700">
              Tags <span className="text-xs font-normal text-gray-500">(comma-separated)</span>
            </label>
            <Input
              id="edit-part-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. smd, passive, 0402"
            />
          </div>

          {/* Parameters */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Parameters</span>
              <Button type="button" variant="outline" size="sm" onClick={addParamRow}>
                <PlusIcon className="size-3.5" />
                Add row
              </Button>
            </div>

            {paramRows.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No parameters. Click "Add row" to add one.</p>
            ) : (
              <div className="space-y-2">
                {paramRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={row.key}
                      onChange={(e) => handleParamChange(i, 'key', e.target.value)}
                      placeholder="Key"
                      className="flex-1"
                    />
                    <span className="text-gray-400">:</span>
                    <Input
                      value={row.value}
                      onChange={(e) => handleParamChange(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParamRow(i)}
                      className="shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="size-4" />
                      <span className="sr-only">Remove row</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
