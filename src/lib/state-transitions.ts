/**
 * State transition validation for hobby inventory system
 *
 * See /docs/state-transitions.md for full specification
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
  in_stock: ['low', 'out', 'reserved', 'installed', 'lost', 'scrapped'],
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
  if (from === to) return true; // Allow no-op transitions
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

// ============================================================================
// Unified Validation
// ============================================================================

export type StatusType = 'stock' | 'project' | 'allocation';

/**
 * Validate any status transition based on type
 */
export function isValidTransition(
  type: StatusType,
  from: string,
  to: string
): boolean {
  switch (type) {
    case 'stock':
      return isValidStockTransition(from as StockStatus, to as StockStatus);
    case 'project':
      return isValidProjectTransition(from as ProjectStatus, to as ProjectStatus);
    case 'allocation':
      return isValidAllocationTransition(from as AllocationStatus, to as AllocationStatus);
    default:
      return false;
  }
}

/**
 * Get error message for invalid transition
 */
export function getTransitionError(
  type: StatusType,
  from: string,
  to: string
): string {
  const validStates = getValidTransitions(type, from);
  const validList = validStates.length > 0
    ? validStates.join(', ')
    : 'none (terminal state)';

  return `Invalid ${type} status transition from '${from}' to '${to}'. Valid transitions: ${validList}`;
}

/**
 * Get valid transitions for any status type
 */
export function getValidTransitions(type: StatusType, from: string): string[] {
  switch (type) {
    case 'stock':
      return getValidStockTransitions(from as StockStatus);
    case 'project':
      return getValidProjectTransitions(from as ProjectStatus);
    case 'allocation':
      return getValidAllocationTransitions(from as AllocationStatus);
    default:
      return [];
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate and throw error if transition is invalid
 */
export function validateTransition(
  type: StatusType,
  from: string,
  to: string
): void {
  if (!isValidTransition(type, from, to)) {
    throw new Error(getTransitionError(type, from, to));
  }
}

/**
 * Check if a status is a terminal state (no valid transitions out)
 */
export function isTerminalState(type: StatusType, status: string): boolean {
  const known: StatusType[] = ['stock', 'project', 'allocation'];
  if (!known.includes(type)) return false;
  return getValidTransitions(type, status).length === 0;
}

// ============================================================================
// Auto-Derive Stock Status from Quantity
// ============================================================================

/**
 * Derive a new StockStatus from a quantity change.
 * Only applies when current status is in_stock, low, or out.
 * Returns null when no status change is needed.
 *
 * Rules (exact mode only):
 *   qty → 0  and status is not already 'out'  → 'out'
 *   qty → >0 and status is 'out'               → 'in_stock'
 *   all other cases                            → null (no change)
 */
export function deriveStatusFromQuantity(
  currentStatus: StockStatus,
  newQty: number | null,
  quantityMode: 'exact' | 'qualitative'
): StockStatus | null {
  const autoTransitionStatuses: StockStatus[] = ['in_stock', 'low', 'out'];
  if (!autoTransitionStatuses.includes(currentStatus)) return null;
  if (quantityMode !== 'exact' || newQty === null) return null;

  if (newQty === 0 && currentStatus !== 'out') {
    return isValidStockTransition(currentStatus, 'out') ? 'out' : null;
  }
  if (newQty > 0 && currentStatus === 'out') {
    return isValidStockTransition('out', 'in_stock') ? 'in_stock' : null;
  }
  return null;
}

