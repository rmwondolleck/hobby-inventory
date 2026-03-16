'use client';

import React, { useState, useRef } from 'react';
import type { ImportType, ImportPlan, ImportSummary } from '@/lib/import/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'input' | 'preview' | 'done';

const TABS: { type: ImportType; label: string }[] = [
  { type: 'locations', label: 'Locations' },
  { type: 'parts', label: 'Parts' },
  { type: 'lots', label: 'Lots' },
];

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-700 bg-green-50',
  update: 'text-blue-700 bg-blue-50',
  skip: 'text-gray-500 bg-gray-50',
  error: 'text-red-700 bg-red-50',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlanSummaryBar({ plan }: { plan: ImportPlan }) {
  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      <span className="font-medium text-gray-700">Dry-run results:</span>
      <span className="text-green-700">
        <strong>{plan.willCreate}</strong> will create
      </span>
      <span className="text-blue-700">
        <strong>{plan.willUpdate}</strong> will update
      </span>
      <span className="text-gray-500">
        <strong>{plan.willSkip}</strong> will skip
      </span>
      {plan.errorCount > 0 && (
        <span className="font-semibold text-red-600">
          ⚠ {plan.errorCount} error{plan.errorCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function SummarySummaryBar({ summary }: { summary: ImportSummary }) {
  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
      <span className="font-medium text-green-800">Import complete:</span>
      <span className="text-green-700">
        <strong>{summary.created}</strong> created
      </span>
      <span className="text-blue-700">
        <strong>{summary.updated}</strong> updated
      </span>
      <span className="text-gray-500">
        <strong>{summary.skipped}</strong> skipped
      </span>
      {summary.errors > 0 && (
        <span className="text-red-600">
          <strong>{summary.errors}</strong> errors
        </span>
      )}
    </div>
  );
}

function PreviewTable({ plan }: { plan: ImportPlan }) {
  const preview = plan.rows.slice(0, 100);
  const columns = preview.length > 0
    ? Object.keys(preview[0].data).filter((k) => !k.startsWith('_'))
    : [];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium text-gray-500">Row</th>
            <th className="px-3 py-2 font-medium text-gray-500">Action</th>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 font-medium text-gray-500">
                {col}
              </th>
            ))}
            <th className="px-3 py-2 font-medium text-gray-500">Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {preview.map((row) => (
            <tr key={row.rowIndex} className={row.action === 'error' ? 'bg-red-50' : ''}>
              <td className="px-3 py-1.5 text-gray-400">{row.rowIndex}</td>
              <td className="px-3 py-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[row.action] ?? ''}`}
                >
                  {row.action}
                </span>
              </td>
              {columns.map((col) => (
                <td key={col} className="max-w-[160px] truncate px-3 py-1.5 text-gray-700">
                  {String(row.data[col] ?? '')}
                </td>
              ))}
              <td className="px-3 py-1.5 text-red-600">
                {row.errors.map((e, i) => (
                  <span key={i} className="block">
                    {e.field ? `[${e.field}] ` : ''}{e.message}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {plan.rows.length > 100 && (
        <p className="px-3 py-2 text-xs text-gray-400">
          Showing first 100 of {plan.rows.length} rows
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ImportForm
// ---------------------------------------------------------------------------

export function ImportForm() {
  const [activeType, setActiveType] = useState<ImportType>('locations');
  const [csvText, setCsvText] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (type: ImportType) => {
    setActiveType(type);
    setCsvText('');
    setStep('input');
    setPlan(null);
    setSummary(null);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) ?? '');
    };
    reader.readAsText(file);
  };

  const handleDryRun = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, csv: csvText }),
      });
      const json = await res.json() as { data?: ImportPlan; message?: string };
      if (!res.ok) {
        setError(json.message ?? 'Validation failed');
        return;
      }
      setPlan(json.data!);
      setStep('preview');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, csv: csvText }),
      });
      const json = await res.json() as { data?: ImportSummary; message?: string };
      if (!res.ok) {
        setError(json.message ?? 'Import failed');
        return;
      }
      setSummary(json.data!);
      setStep('done');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCsvText('');
    setStep('input');
    setPlan(null);
    setSummary(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Type tabs */}
      <div className="flex overflow-hidden rounded-lg border border-gray-200">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleTabChange(type)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeType === type
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Template download */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Need a template?</span>
        <a
          href={`/api/import/templates/${activeType}`}
          download
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
        >
          ⬇ Download {activeType} template
        </a>
      </div>

      {step === 'done' && summary ? (
        /* ---------- Done state ---------- */
        <div className="space-y-4">
          <SummarySummaryBar summary={summary} />
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Import more
            </button>
            <a
              href={`/${activeType === 'lots' ? 'lots' : activeType}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              View {activeType}
            </a>
          </div>
        </div>
      ) : (
        /* ---------- Input / Preview state ---------- */
        <div className="space-y-4">
          {/* File upload */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Upload CSV file
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Or paste */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Or paste CSV content
            </label>
            <textarea
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setStep('input'); setPlan(null); }}
              rows={8}
              placeholder={`name,category,manufacturer,mpn,tags,notes\n"ESP32","Microcontrollers","Espressif","ESP32-WROOM-32","iot,wifi",""`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Dry-run preview */}
          {step === 'preview' && plan && (
            <div className="space-y-3">
              <PlanSummaryBar plan={plan} />
              <PreviewTable plan={plan} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDryRun}
              disabled={loading || csvText.trim() === ''}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && step === 'input' ? 'Validating…' : '🔍 Dry Run'}
            </button>

            {step === 'preview' && plan && plan.errorCount === 0 && (
              <button
                onClick={handleExecute}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Importing…' : `⬆ Import ${plan.willCreate + plan.willUpdate} rows`}
              </button>
            )}

            {step === 'preview' && plan && plan.errorCount > 0 && (
              <p className="self-center text-sm text-red-600">
                Fix {plan.errorCount} error{plan.errorCount !== 1 ? 's' : ''} before importing
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

