/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock before importing the component
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ProjectDetailClient } from '../ProjectDetailClient';
import type { ProjectDetail } from '../../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseLot = {
  id: 'lot-1',
  partId: 'part-1',
  quantity: 10,
  quantityMode: 'exact' as const,
  qualitativeStatus: null,
  unit: null,
  status: 'in_stock' as const,
  locationId: null,
  location: null,
  part: { id: 'part-1', name: 'Resistor 10k', category: 'Resistors' },
};

function makeAllocation(overrides: Partial<{
  id: string;
  status: 'reserved' | 'in_use' | 'deployed' | 'recovered';
}> = {}) {
  return {
    id: overrides.id ?? 'alloc-1',
    lotId: 'lot-1',
    projectId: 'proj-1',
    quantity: 5,
    status: overrides.status ?? ('reserved' as const),
    notes: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lot: baseLot,
  };
}

const baseProject: ProjectDetail = {
  id: 'proj-1',
  name: 'Robot Arm',
  status: 'active',
  tags: [],
  notes: null,
  wishlistNotes: null,
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  allocationCount: 1,
  allocationsByStatus: { reserved: 1 },
  allocations: [makeAllocation({ status: 'reserved' })],
  events: [],
};

// Helper: mock fetch to return next status
function mockFetchSuccess(nextStatus: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { status: nextStatus } }),
  });
}

// Render with a fetch stub so the component loads the project
function renderWithProject(project: ProjectDetail) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: project }),
  });
  render(<ProjectDetailClient id="proj-1" />);
}

// ─── AllocationRow transition button ─────────────────────────────────────────

describe('AllocationRow – transition buttons', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('shows "Mark In-Use" button for reserved allocations', async () => {
    renderWithProject(baseProject);
    await waitFor(() => expect(screen.getByText('Mark In-Use')).toBeInTheDocument());
  });

  it('shows "Mark Deployed" button for in_use allocations', async () => {
    const project = {
      ...baseProject,
      allocations: [makeAllocation({ status: 'in_use' })],
      allocationsByStatus: { in_use: 1 },
    };
    renderWithProject(project);
    await waitFor(() => expect(screen.getByText('Mark Deployed')).toBeInTheDocument());
  });

  it('shows "Recover" button for deployed allocations', async () => {
    const project = {
      ...baseProject,
      allocations: [makeAllocation({ status: 'deployed' })],
      allocationsByStatus: { deployed: 1 },
    };
    renderWithProject(project);
    await waitFor(() => expect(screen.getByText('Recover')).toBeInTheDocument());
  });

  it('shows no transition button for recovered allocations', async () => {
    const project = {
      ...baseProject,
      allocations: [makeAllocation({ status: 'recovered' })],
      allocationsByStatus: { recovered: 1 },
    };
    renderWithProject(project);
    await waitFor(() =>
      expect(screen.getByText('Resistor 10k')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls PATCH /api/allocations/:id when transition button is clicked', async () => {
    renderWithProject(baseProject);
    await waitFor(() => screen.getByText('Mark In-Use'));

    mockFetchSuccess('in_use');
    fireEvent.click(screen.getByText('Mark In-Use'));

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        (c) => c[0] === '/api/allocations/alloc-1' && c[1]?.method === 'PATCH',
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1].body);
      expect(body.status).toBe('in_use');
    });
  });

  it('disables the button while transition is in progress', async () => {
    renderWithProject(baseProject);
    await waitFor(() => screen.getByText('Mark In-Use'));

    // Delay fetch response so we can inspect mid-flight state
    let resolveFetch!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const btn = screen.getByText('Mark In-Use');
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());

    // Resolve to avoid open handles
    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({ data: { status: 'in_use' } }) });
    });
  });

  it('updates the allocation status in the UI after a successful transition', async () => {
    renderWithProject(baseProject);
    await waitFor(() => screen.getByText('Mark In-Use'));

    mockFetchSuccess('in_use');
    fireEvent.click(screen.getByText('Mark In-Use'));

    // After status change to in_use the button should now be "Mark Deployed"
    await waitFor(() => expect(screen.getByText('Mark Deployed')).toBeInTheDocument());
    expect(screen.queryByText('Mark In-Use')).not.toBeInTheDocument();
  });

  it('leaves allocation status unchanged on fetch error', async () => {
    renderWithProject(baseProject);
    await waitFor(() => screen.getByText('Mark In-Use'));

    mockFetch.mockResolvedValueOnce({ ok: false });
    fireEvent.click(screen.getByText('Mark In-Use'));

    // Wait briefly then check button still shows original state
    await waitFor(() =>
      expect(screen.getByText('Mark In-Use')).toBeInTheDocument(),
    );
  });
});
