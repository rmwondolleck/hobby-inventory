import type { StockStatus, QuantityMode, QualitativeLevel, AllocationStatus, ProjectStatus } from '@/lib/types';

export interface PartListItem {
  id: string;
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  mpn?: string | null;
  tags: string[];
  notes?: string | null;
  parameters: Record<string, unknown>;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  inUseQuantity: number;
  scrappedQuantity: number;
  qualitativeStatuses: string[];
  lotCount: number;
}

export interface LotWithDetails {
  id: string;
  partId: string;
  quantity?: number | null;
  quantityMode: QuantityMode;
  qualitativeStatus?: QualitativeLevel | null;
  unit?: string | null;
  status: StockStatus;
  locationId?: string | null;
  notes?: string | null;
  receivedAt?: string | null;
  source: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  location?: {
    id: string;
    name: string;
    path: string;
  } | null;
  allocations: AllocationWithProject[];
}

export interface AllocationWithProject {
  id: string;
  lotId: string;
  projectId: string;
  quantity?: number | null;
  status: AllocationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
  };
}

export interface PartDetail {
  id: string;
  name: string;
  category?: string | null;
  manufacturer?: string | null;
  mpn?: string | null;
  tags: string[];
  notes?: string | null;
  parameters: Record<string, unknown>;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  inUseQuantity: number;
  scrappedQuantity: number;
  qualitativeStatuses: string[];
  lotCount: number;
  lots: LotWithDetails[];
}

export interface PartFilters {
  search: string;
  category: string;
  tags: string[];
  includeArchived: boolean;
}
