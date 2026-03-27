/**
 * Domain types for Hobby Inventory System
 * 
 * These types represent the core entities of the inventory system.
 * See Issue #5 (Define domain model) for full specification.
 */

// ============================================================================
// Enums - Status definitions from Issue #6
// ============================================================================

/** Stock status for lots */
export type StockStatus = 
  | 'in_stock' 
  | 'low' 
  | 'out' 
  | 'reserved' 
  | 'installed' 
  | 'lost' 
  | 'scrapped';

/** Project lifecycle status */
export type ProjectStatus = 
  | 'idea' 
  | 'planned' 
  | 'active' 
  | 'deployed' 
  | 'retired';

/** Allocation workflow status */
export type AllocationStatus = 
  | 'reserved' 
  | 'in_use' 
  | 'deployed' 
  | 'recovered';

/** Quantity tracking mode */
export type QuantityMode = 'exact' | 'qualitative';

/** Qualitative stock level (for bulk/cheap items) */
export type QualitativeLevel = 'plenty' | 'low' | 'out';

/** Event types for history tracking */
export type EventType =
  | 'created'
  | 'received'
  | 'moved'
  | 'allocated'
  | 'installed'
  | 'returned'
  | 'lost'
  | 'scrapped'
  | 'edited';

/** Source types for purchase tracking */
export type SourceType =
  | 'amazon'
  | 'aliexpress'
  | 'digikey'
  | 'mouser'
  | 'adafruit'
  | 'sparkfun'
  | 'ebay'
  | 'manual';

// ============================================================================
// Core Entity Types
// ============================================================================

/** Part - A reusable catalog entry (e.g., "ESP32-WROOM-32") */
export interface Part {
  id: string;
  name: string;
  category?: string;
  manufacturer?: string;
  mpn?: string; // Manufacturer part number
  tags: string[];
  notes?: string;
  parameters: Record<string, unknown>; // Category-specific parameters
  reorderPoint?: number | null; // Quantity below which a lot is considered "low"; null = use client default
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/** Source - Purchase/order metadata for a lot */
export interface Source {
  type: SourceType;
  seller?: string;
  url?: string;
  orderRef?: string;
  unitCost?: number;
  currency?: string;
  purchaseDate?: Date;
}

/** Lot - A specific purchased batch of a part */
export interface Lot {
  id: string;
  partId: string;
  quantity?: number; // null for qualitative mode
  quantityMode: QuantityMode;
  qualitativeStatus?: QualitativeLevel;
  unit?: string;
  status: StockStatus;
  locationId?: string;
  source?: Source;
  receivedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Location - Physical storage hierarchy */
export interface Location {
  id: string;
  name: string;
  parentId?: string;
  path: string; // Computed, e.g., "Office/Shelf A/Drawer 2"
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Project - Where parts are allocated or installed */
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  notes?: string;
  tags: string[];
  wishlistNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/** Allocation - Links a lot to a project */
export interface Allocation {
  id: string;
  lotId: string;
  projectId: string;
  quantity?: number;
  status: AllocationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Event - Immutable record of a stock mutation */
export interface Event {
  id: string;
  lotId: string;
  type: EventType;
  delta?: number;
  fromLocationId?: string;
  toLocationId?: string;
  projectId?: string;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// Category and Parameter Types
// ============================================================================

/** Supported parameter value types in a category template */
export type ParameterType = 'string' | 'boolean' | 'number';

/** Definition of a single parameter field in a category template */
export interface ParameterDefinition {
  type: ParameterType;
  /** Allowed values for string parameters */
  options?: string[];
  /** Optional unit label for number parameters (e.g., "MHz", "mA") */
  unit?: string;
}

/** Category - Groups parts by type and defines their shared parameter schema */
export interface Category {
  id: string;
  name: string;
  /** Maps parameter keys to their definitions */
  parameterSchema: Record<string, ParameterDefinition>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

