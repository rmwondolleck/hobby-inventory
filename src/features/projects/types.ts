import type { ProjectStatus, AllocationStatus, QuantityMode, QualitativeLevel, StockStatus, EventType } from '@/lib/types';

export interface ProjectListItem {
  id: string;
  name: string;
  status: ProjectStatus;
  tags: string[];
  notes?: string | null;
  wishlistNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  allocationCount: number;
  allocationsByStatus: Partial<Record<AllocationStatus, number>>;
}

export interface AllocationLot {
  id: string;
  partId: string;
  quantity?: number | null;
  quantityMode: QuantityMode;
  qualitativeStatus?: QualitativeLevel | null;
  unit?: string | null;
  status: StockStatus;
  locationId?: string | null;
  location?: {
    id: string;
    name: string;
    path: string;
  } | null;
  part: {
    id: string;
    name: string;
    category?: string | null;
  };
}

export interface AllocationWithDetails {
  id: string;
  lotId: string;
  projectId: string;
  quantity?: number | null;
  status: AllocationStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  lot: AllocationLot;
}

export interface ProjectEvent {
  id: string;
  lotId: string;
  type: EventType;
  delta?: number | null;
  notes?: string | null;
  createdAt: string;
  lot: {
    id: string;
    part: {
      id: string;
      name: string;
    };
  };
}

export interface ProjectDetail extends ProjectListItem {
  allocations: AllocationWithDetails[];
  events: ProjectEvent[];
}

export interface ProjectFilters {
  search: string;
  status: ProjectStatus | '';
  tags: string[];
}
