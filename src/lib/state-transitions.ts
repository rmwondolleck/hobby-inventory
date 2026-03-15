/**
 * State transition validation for hobby inventory system
 *
 * Related: Issue #6 (Define statuses and state transitions)
 */

import type {
  StockStatus,
  ProjectStatus,
  AllocationStatus,
} from './types';

// ============================================================================
// Stock Status Transitions
// ============================================================================

const STOCK_TRANSITIONS: Record<StockStatus, StockStatus[]> = {
  in_stock: ['low', 'reserved', 'installed', 'lost', 'scrapped'],
  low: ['in_stock', 'out', 'reserved', 'installed', 'lost', 'scrapped'],
  out: ['in_stock', 'low', 'scrapped'],
  reserved: ['in_stock', 'installed', 'lost', 'scrapped'],
  installed: ['in_stock', 'lost', 'scrapped'],
  lost: ['in_stock', 'scrapped'],
  scrapped: [], // Terminal state
};

/**
 * Check if a stock status transition is valid
 */
export function isValidStockTransition(
  from: StockStatus,
  to: StockStatus
): boolean {
  if (from === to) return true;
  return STOCK_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid next states for a stock status
 */
export function getValidStockTransitions(from: StockStatus): StockStatus[] {
  return STOCK_TRANSITIONS[from] ?? [];
}

// ============================================================================
// Project Status Transitions
// ============================================================================

const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  idea: ['planned', 'retired'],
  planned: ['active', 'retired'],
  active: ['deployed', 'planned', 'retired'],
  deployed: ['retired', 'active'],
  retired: ['active'],
};

/**
 * Check if a project status transition is valid
 */
export function isValidProjectTransition(
  from: ProjectStatus,
  to: ProjectStatus
): boolean {
  if (from === to) return true;
  return PROJECT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid next states for a project status
 */
export function getValidProjectTransitions(from: ProjectStatus): ProjectStatus[] {
  return PROJECT_TRANSITIONS[from] ?? [];
}

// ============================================================================
// Allocation Status Transitions
// ============================================================================

const ALLOCATION_TRANSITIONS: Record<AllocationStatus, AllocationStatus[]> = {
  reserved: ['in_use', 'recovered'],
  in_use: ['deployed', 'recovered'],
  deployed: ['recovered'],
  recovered: [], // Terminal state
};

/**
 * Check if an allocation status transition is valid
 */
export function isValidAllocationTransition(
  from: AllocationStatus,
  to: AllocationStatus
): boolean {
  if (from === to) return true;
  return ALLOCATION_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid next states for an allocation status
 */
export function getValidAllocationTransitions(from: AllocationStatus): AllocationStatus[] {
  return ALLOCATION_TRANSITIONS[from] ?? [];
}
