export type ImportType = 'parts' | 'lots' | 'locations';

export type RowAction = 'create' | 'update' | 'skip' | 'error';

export interface ImportRowError {
  field?: string;
  message: string;
}

export interface ImportRowResult {
  rowIndex: number; // 1-based data row number
  action: RowAction;
  data: Record<string, unknown>;
  errors: ImportRowError[];
  warnings?: ImportRowError[];
}

export interface ImportPlan {
  type: ImportType;
  willCreate: number;
  willUpdate: number;
  willSkip: number;
  errorCount: number;
  rows: ImportRowResult[];
}

export interface ImportSummary {
  type: ImportType;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: ImportRowResult[];
}

// --- Row shapes ----------------------------------------------------------

export interface PartRow {
  name: string;
  category?: string;
  manufacturer?: string;
  mpn?: string;
  tags?: string; // comma-separated
  notes?: string;
}

export interface LotRow {
  partName: string;
  partMpn?: string;
  quantity?: string;
  unit?: string;
  locationPath?: string;
  seller?: string;
  sourceUrl?: string;
  unitCost?: string;
  currency?: string;
  purchaseDate?: string;
  notes?: string;
}

export interface LocationRow {
  path: string;
  notes?: string;
}

