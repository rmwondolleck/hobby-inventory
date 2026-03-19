/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LotWithDetails, PartDetail } from '../../types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'part-123' }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/features/lots/components/AllocateModal', () => ({
  AllocateModal: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => (
    <div data-testid="allocate-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={onSuccess}>Submit</button>
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

jest.mock('@/lib/utils', () => ({
  formatDate: (d: string) => d,
  cn: (...c: string[]) => c.filter(Boolean).join(' '),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseLot: LotWithDetails = {
  id: 'lot-1',
  partId: 'part-123',
  quantity: 10,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  locationId: null,
  notes: null,
  receivedAt: null,
  source: {},
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  location: null,
  allocations: [],
};

function makePart(lots: LotWithDetails[]): PartDetail {
  return {
    id: 'part-123',
    name: 'Test Part',
    category: 'Resistors',
    manufacturer: null,
    mpn: null,
    tags: [],
    notes: null,
    parameters: {},
    archivedAt: null,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    lots,
  };
}

function setupFetch(part: PartDetail) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: part }),
  } as Response);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

import { PartDetailClient } from '../PartDetailClient';

describe('PartDetailClient — Allocate button visibility', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows Allocate button for an in_stock exact lot with available quantity', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });

  it('shows Allocate button for a low exact lot with available quantity', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'low', quantity: 3, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });

  it('shows Allocate button for a qualitative lot regardless of quantity', async () => {
    setupFetch(
      makePart([
        {
          ...baseLot,
          status: 'in_stock',
          quantityMode: 'qualitative',
          quantity: null,
          allocations: [],
        },
      ])
    );
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });

  it('hides Allocate button for lot with zero available quantity (all allocated)', async () => {
    const fullyAllocatedLot: LotWithDetails = {
      ...baseLot,
      quantity: 5,
      allocations: [
        {
          id: 'alloc-1',
          lotId: 'lot-1',
          projectId: 'proj-1',
          quantity: 5,
          status: 'reserved',
          notes: null,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          project: { id: 'proj-1', name: 'Project A', status: 'active' },
        },
      ],
    };
    setupFetch(makePart([fullyAllocatedLot]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /allocate/i })).not.toBeInTheDocument();
  });

  it('hides Allocate button for a reserved lot', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'reserved' }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /allocate/i })).not.toBeInTheDocument();
  });

  it('hides Allocate button for an installed lot', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'installed' }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /allocate/i })).not.toBeInTheDocument();
  });

  it('hides Allocate button for a scrapped lot', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'scrapped' }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /allocate/i })).not.toBeInTheDocument();
  });

  it('counts only active allocations (reserved/in_use/deployed) when computing available qty', async () => {
    // recovered (terminal) allocation should NOT reduce available quantity
    const lotWithRecoveredAlloc: LotWithDetails = {
      ...baseLot,
      quantity: 5,
      allocations: [
        {
          id: 'alloc-2',
          lotId: 'lot-1',
          projectId: 'proj-1',
          quantity: 5,
          status: 'recovered',
          notes: null,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          project: { id: 'proj-1', name: 'Project A', status: 'active' },
        },
      ],
    };
    setupFetch(makePart([lotWithRecoveredAlloc]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    // recovered allocation doesn't count → still 5 available → Allocate shown
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });

  it('shows partial availability: lot qty=10, 7 reserved → still allocatable (3 left)', async () => {
    const partialLot: LotWithDetails = {
      ...baseLot,
      quantity: 10,
      allocations: [
        {
          id: 'alloc-3',
          lotId: 'lot-1',
          projectId: 'proj-1',
          quantity: 7,
          status: 'in_use',
          notes: null,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          project: { id: 'proj-1', name: 'Project A', status: 'active' },
        },
      ],
    };
    setupFetch(makePart([partialLot]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });
});

describe('PartDetailClient — AllocateModal integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens AllocateModal when Allocate button is clicked', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument());

    expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /allocate/i }));
    expect(screen.getByTestId('allocate-modal')).toBeInTheDocument();
  });

  it('closes AllocateModal when onClose is called', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /allocate/i }));
    expect(screen.getByTestId('allocate-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
  });

  it('closes modal and shows success toast when onSuccess is called', async () => {
    const { toast } = require('sonner');
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]) }),
    } as Response);

    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /allocate/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Lot allocated successfully'));
    expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
  });
});

describe('PartDetailClient — loading and error states', () => {
  it('renders loading skeletons initially', () => {
    // fetch never resolves during this test
    global.fetch = jest.fn(() => new Promise(() => {}));
    const { container } = render(<PartDetailClient />);
    // Loading state renders .animate-pulse elements
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    } as Response);
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument());
  });
});
