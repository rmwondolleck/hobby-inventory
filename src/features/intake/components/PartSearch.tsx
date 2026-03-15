'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { PartOption } from '../types';

interface PartSearchProps {
  value: PartOption | null;
  onChange: (part: PartOption | null) => void;
  placeholder?: string;
}

export function PartSearch({ value, onChange, placeholder = 'Search parts…' }: PartSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PartOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/parts?search=${encodeURIComponent(query.trim())}&limit=10`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.data ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [query]);

  const handleSelect = (part: PartOption) => {
    onChange(part);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{value.name}</p>
          {(value.category || value.mpn) && (
            <p className="text-xs text-gray-500 truncate">
              {[value.category, value.mpn].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Clear selection"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No parts found</div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {results.map((part) => (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(part)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
                    )}
                  >
                    <span className="font-medium text-gray-900">{part.name}</span>
                    {(part.category || part.mpn) && (
                      <span className="ml-2 text-xs text-gray-500">
                        {[part.category, part.mpn].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
