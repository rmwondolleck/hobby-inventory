import type { StockStatus, QuantityMode, QualitativeLevel, SourceType } from '@/lib/types';

export interface SourceData {
  type: SourceType;
  seller?: string;
  url?: string;
  orderRef?: string;
  unitCost?: number;
  currency?: string;
  purchaseDate?: string;
}

export interface LotListItem {
  id: string;
  partId: string;
  quantity?: number | null;
  quantityMode: QuantityMode;
  qualitativeStatus?: QualitativeLevel | null;
  unit?: string | null;
  status: StockStatus;
  locationId?: string | null;
  source: SourceData | Record<string, never>;
  receivedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  part: {
    id: string;
    name: string;
    category?: string | null;
    mpn?: string | null;
  };
  location?: {
    id: string;
    name: string;
    path: string;
  } | null;
}

export interface LotDetail extends LotListItem {
  allocations: AllocationSummary[];
  events: EventSummary[];
}

export interface AllocationSummary {
  id: string;
  projectId: string;
  quantity?: number | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    status: string;
  };
}

export interface EventSummary {
  id: string;
  type: string;
  delta?: number | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  projectId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface LotFilters {
  partId?: string;
  locationId?: string;
  status?: string;
  seller?: string;
  sourceType?: string;
}

export interface CreateLotBody {
  partId: string;
  quantity?: number;
  quantityMode?: QuantityMode;
  qualitativeStatus?: QualitativeLevel;
  unit?: string;
  status?: StockStatus;
  locationId?: string;
  source?: Partial<SourceData>;
  receivedAt?: string;
  notes?: string;
}

export interface UpdateLotBody {
  quantity?: number;
  quantityMode?: QuantityMode;
  qualitativeStatus?: QualitativeLevel;
  unit?: string;
  status?: StockStatus;
  locationId?: string | null;
  source?: Partial<SourceData>;
  receivedAt?: string | null;
  notes?: string | null;
}
