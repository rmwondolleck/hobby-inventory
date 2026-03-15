export type IntakeMode = 'new-part' | 'add-lot' | 'quick-restock';

export interface PartFormData {
  name: string;
  category: string;
  manufacturer: string;
  mpn: string;
  notes: string;
}

export interface LotFormData {
  quantityMode: 'exact' | 'qualitative';
  quantity: string;
  unit: string;
  qualitativeStatus: 'plenty' | 'low' | 'out';
  sourceUrl: string;
  receivedAt: string;
  notes: string;
}

export interface LocationOption {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: LocationOption[];
}

export interface PartOption {
  id: string;
  name: string;
  category: string | null;
  mpn: string | null;
  manufacturer: string | null;
}

export type IntakeStep = 'mode' | 'part' | 'lot' | 'location' | 'success';
