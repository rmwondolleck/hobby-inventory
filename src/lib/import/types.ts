export type ImportType = 'parts' | 'lots' | 'locations';

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface RowResult {
  row: number;
  action: 'create' | 'update' | 'skip' | 'error';
  message?: string;
}

export interface ValidationSummary {
  willCreate: number;
  willUpdate: number;
  willSkip: number;
  errors: RowError[];
  rows: RowResult[];
}

export interface ExecuteSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: RowError[];
}
