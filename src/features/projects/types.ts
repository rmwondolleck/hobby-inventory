import type { ProjectStatus, AllocationStatus } from '@/lib/types';

export interface ProjectListItem {
  id: string;
  name: string;
  status: ProjectStatus | string;
  tags: string[];
  notes: string | null;
  wishlistNotes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  allocationCount: number;
  allocationsByStatus: Partial<Record<AllocationStatus | string, number>>;
}
