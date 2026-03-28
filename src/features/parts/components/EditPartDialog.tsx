'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { PlusIcon, TrashIcon, BookOpenIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryCombobox, type CategoryOptionWithSchema } from './CategoryCombobox';
import type { PartDetail } from '../types';

interface ParamRow {
  key: string;
  value: string;
  /** True when this row was seeded from a category template (not manually typed) */
  fromTemplate?: boolean;
}

interface EditPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: PartDetail;
  onSave: (updated: PartDetail) => void;
}

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
  const [category, setCategory] = useState(part.category ?? '');
  const [manufacturer, setManufacturer] = useState(part.manufacturer ?? '');
  const [mpn, setMpn] = useState(part.mpn ?? '');
  const [notes, setNotes] = useState(part.notes ?? '');
  const [tags, setTags] = useState(part.tags.join(', '));
  const [paramRows, setParamRows] = useState<ParamRow[]>(() => paramsToRows(part.parameters));

  const [categories, setCategories] = useState<CategoryOptionWithSchema[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when part changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(part.name);
      setCategory(part.category ?? '');
      setManufacturer(part.manufacturer ?? '');
      setMpn(part.mpn ?? '');
      setNotes(part.notes ?? '');
      setTags(part.tags.join(', '));
      setParamRows(paramsToRows(part.parameters));
      setError(null);
    }
  }, [open, part]);

  // Load categories (with schemas) once on mount
  useEffect(() => {
    fetch('/api/categories?includeDefaults=true')
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

  /** Additively seed parameter rows from a category's parameterSchema. */
  function seedParamRowsFromSchema(schema: Record<string, unknown>) {
    const schemaKeys = Object.keys(schema);
    if (schemaKeys.length === 0) return;

    setParamRows((current) => {
      const existingKeys = new Set(current.map((r) => r.key.trim()).filter(Boolean));
      const newRows: ParamRow[] = schemaKeys
        .filter((k) => !existingKeys.has(k))
        .map((k) => ({ key: k, value: '', fromTemplate: true }));
      return newRows.length > 0 ? [...current, ...newRows] : current;
    });
  }

  function handleCategorySelect(cat: CategoryOptionWithSchema | null) {
    if (cat) {
      seedParamRowsFromSchema(cat.parameterSchema);
    }
  }

  const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
    setParamRows((rows: ParamRow[]) =>
      rows.map((row: ParamRow, i: number) =>
        i === index
          ? { ...row, [field]: value, fromTemplate: field === 'key' ? false : row.fromTemplate }
          : row
      )
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

    const categoryName = category.trim() || null;

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
          // Non-fatal: proceed even if upsert fails; the PATCH route will handle it
        }
      }
    }

    const parsedTags = tags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const body = {
      name: name.trim(),
      category: categoryName,
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
            <label htmlFor="edit-part-name" className="mb-1 block text-sm font-medium text-foreground">
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
            <label htmlFor="edit-part-category" className="mb-1 block text-sm font-medium text-foreground">
              Category
            </label>
            <CategoryCombobox
              id="edit-part-category"
              value={category}
              onValueChange={setCategory}
              onCategorySelect={handleCategorySelect}
              categories={categories}
            />
          </div>

          {/* Manufacturer + MPN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-part-manufacturer" className="mb-1 block text-sm font-medium text-foreground">
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
              <label htmlFor="edit-part-mpn" className="mb-1 block text-sm font-medium text-foreground">
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
            <label htmlFor="edit-part-notes" className="mb-1 block text-sm font-medium text-foreground">
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
            <label htmlFor="edit-part-tags" className="mb-1 block text-sm font-medium text-foreground">
              Tags <span className="text-xs font-normal text-muted-foreground">(comma-separated)</span>
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
              <span className="text-sm font-medium text-foreground">Parameters</span>
              <Button type="button" variant="outline" size="sm" onClick={addParamRow}>
                <PlusIcon className="size-3.5" />
                Add row
              </Button>
            </div>

            {paramRows.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No parameters. Click "Add row" to add one.</p>
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
                    <span className="text-muted-foreground">:</span>
                    <div className="relative flex-1">
                      <Input
                        value={row.value}
                        onChange={(e) => handleParamChange(i, 'value', e.target.value)}
                        placeholder={row.fromTemplate && !row.value ? 'Template key — enter value' : 'Value'}
                        className={row.fromTemplate && !row.value ? 'border-dashed pr-7' : ''}
                      />
                      {row.fromTemplate && !row.value && (
                        <BookOpenIcon
                          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50"
                          aria-label="Template-seeded parameter"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParamRow(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
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
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
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

