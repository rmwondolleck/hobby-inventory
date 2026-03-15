import type { AllocationStatus, ProjectStatus } from '@/lib/types';

// Project status transitions (sequential lifecycle)
const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  idea: ['planned', 'active'],
  planned: ['active', 'retired'],
  active: ['deployed', 'retired'],
  deployed: ['retired'],
  retired: [],
};

// Allocation status transitions
const ALLOCATION_TRANSITIONS: Record<AllocationStatus, AllocationStatus[]> = {
  reserved: ['in_use', 'deployed', 'recovered'],
  in_use: ['deployed', 'recovered'],
  deployed: ['recovered'],
  recovered: [],
};

export function isValidProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidAllocationTransition(from: AllocationStatus, to: AllocationStatus): boolean {
  return ALLOCATION_TRANSITIONS[from]?.includes(to) ?? false;
}
