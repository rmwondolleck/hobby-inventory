import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Detect source type from URL domain
 */
export function detectSourceType(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('amazon')) return 'amazon';
    if (hostname.includes('aliexpress')) return 'aliexpress';
    if (hostname.includes('digikey')) return 'digikey';
    if (hostname.includes('mouser')) return 'mouser';
    if (hostname.includes('adafruit')) return 'adafruit';
    if (hostname.includes('sparkfun')) return 'sparkfun';
    if (hostname.includes('ebay')) return 'ebay';
    
    return 'manual';
  } catch {
    return 'manual';
  }
}

/**
 * Generate a slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a location path from parent chain
 */
export function buildLocationPath(name: string, parentPath?: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

/**
 * Safely parse a JSON string, returning a fallback value on error
 */
export function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

