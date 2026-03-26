/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartDetailClient } from '../PartDetailClient';
import type { LotWithDetails, PartDetail } from '../../types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'part-123' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

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

jest.mock('../DuplicatePartDialog', () => ({
  DuplicatePartDialog: ({
    open,
    onOpenChange,
    part,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    part: PartDetail;
  }) =>
    open ? (
      <div data-testid="duplicate-dialog">
        <span>Dialog for {part.name}</span>
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    ) : null,
}));

jest.mock('../EditPartDialog', () => ({
  EditPartDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-part-dialog" /> : null,
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

jest.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

jest.mock('@/components/EventTimeline', () => ({
  EventTimeline: ({ events }: { events: unknown[] }) => (
    <div data-testid="event-timeline">
      {events.length === 0 ? 'No history yet.' : `${events.length} events`}
    </div>
  ),
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

function makePart(lots: LotWithDetails[] = [], overrides: Partial<PartDetail> = {}): PartDetail {
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
    totalQuantity: 0,
    availableQuantity: 0,
    reservedQuantity: 0,
    inUseQuantity: 0,
    scrappedQuantity: 0,
    qualitativeStatuses: [],
    lotCount: lots.length,
    lots,
    ...overrides,
  };
}

function setupFetch(part: PartDetail) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.endsWith('/events')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ data: part }),
    } as Response);
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// ── Loading / error states ────────────────────────────────────────────────────

describe('PartDetailClient — loading and error states', () => {
  it('renders loading skeletons initially', () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    const { container } = render(<PartDetailClient />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows "Part not found" for a 404 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response);
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Part not found')).toBeInTheDocument());
  });

  it('shows "Failed to load" for a non-404 error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response);
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Failed to load')).toBeInTheDocument());
  });

  it('renders part name after successful load', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
  });

  it('renders Back to Parts link', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText(/back to parts/i)).toBeInTheDocument());
  });
});

// ── Edit Part button ──────────────────────────────────────────────────────────

describe('PartDetailClient — Edit Part button', () => {
  it('renders an Edit Part button', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByRole('button', { name: /edit part/i })).toBeInTheDocument());
  });

  it('opens EditPartDialog when Edit Part is clicked', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /edit part/i }));
    fireEvent.click(screen.getByRole('button', { name: /edit part/i }));
    expect(screen.getByTestId('edit-part-dialog')).toBeInTheDocument();
  });
});

// ── Duplicate button ──────────────────────────────────────────────────────────

describe('PartDetailClient — Duplicate button', () => {
  it('renders a Duplicate button', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument());
  });

  it('does not render DuplicatePartDialog before Duplicate is clicked', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));
    expect(screen.queryByTestId('duplicate-dialog')).not.toBeInTheDocument();
  });

  it('opens DuplicatePartDialog when Duplicate button is clicked', async () => {
    setupFetch(makePart([], { name: 'Arduino Uno' }));
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(screen.getByTestId('duplicate-dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog for Arduino Uno')).toBeInTheDocument();
  });

  it('closes DuplicatePartDialog when onOpenChange(false) is called', async () => {
    setupFetch(makePart());
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(screen.getByTestId('duplicate-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(screen.queryByTestId('duplicate-dialog')).not.toBeInTheDocument();
  });
});

// ── Allocate button visibility ────────────────────────────────────────────────

describe('PartDetailClient — Allocate button visibility', () => {
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

  it('shows Allocate button for a qualitative in_stock lot', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantityMode: 'qualitative', quantity: null, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });

  it('hides Allocate button when all quantity is allocated', async () => {
    const fullyAllocated: LotWithDetails = {
      ...baseLot, quantity: 5,
      allocations: [{
        id: 'alloc-1', lotId: 'lot-1', projectId: 'proj-1', quantity: 5, status: 'reserved',
        notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        project: { id: 'proj-1', name: 'Project A', status: 'active' },
      }],
    };
    setupFetch(makePart([fullyAllocated]));
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

  it('counts only active allocations when computing available quantity', async () => {
    const lotWithRecovered: LotWithDetails = {
      ...baseLot, quantity: 5,
      allocations: [{
        id: 'alloc-2', lotId: 'lot-1', projectId: 'proj-1', quantity: 5, status: 'recovered',
        notes: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        project: { id: 'proj-1', name: 'Project A', status: 'active' },
      }],
    };
    setupFetch(makePart([lotWithRecovered]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
  });
});

// ── AllocateModal integration ─────────────────────────────────────────────────

describe('PartDetailClient — AllocateModal integration', () => {
  it('opens AllocateModal when Allocate button is clicked', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /allocate/i }));
    expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /allocate/i }));
    expect(screen.getByTestId('allocate-modal')).toBeInTheDocument();
  });

  it('closes AllocateModal when onClose is called', async () => {
    setupFetch(makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]));
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /allocate/i }));
    fireEvent.click(screen.getByRole('button', { name: /allocate/i }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
  });

  it('shows success toast and closes modal on onSuccess', async () => {
    const { toast } = require('sonner');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: makePart([{ ...baseLot, status: 'in_stock', quantity: 5, allocations: [] }]) }),
    } as Response);
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /allocate/i }));
    fireEvent.click(screen.getByRole('button', { name: /allocate/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Lot allocated successfully'));
    expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
  });
});

// ── Adjust button visibility ──────────────────────────────────────────────────

describe('PartDetailClient — Adjust button visibility', () => {
  it('shows Adjust button for an exact-mode lot', async () => {
    setupFetch(makePart([{ ...baseLot, quantityMode: 'exact' }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /adjust/i })).toBeInTheDocument();
  });

  it('does not show Adjust button for a qualitative lot', async () => {
    setupFetch(makePart([{ ...baseLot, quantityMode: 'qualitative', quantity: null }]));
    render(<PartDetailClient />);
    await waitFor(() => expect(screen.getByText('Test Part')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /adjust/i })).not.toBeInTheDocument();
  });
});

// ── AdjustLotDialog behavior ──────────────────────────────────────────────────

describe('PartDetailClient — AdjustLotDialog behavior', () => {
  async function openAdjustDialog() {
    setupFetch(makePart([{ ...baseLot, quantity: 10, quantityMode: 'exact' }]));
    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /adjust/i }));
    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    await waitFor(() => screen.getByRole('dialog'));
  }

  it('opens the dialog when Adjust is clicked', async () => {
    await openAdjustDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/adjust quantity/i)).toBeInTheDocument();
  });

  it('shows a validation error when decimal consume value is entered', async () => {
    await openAdjustDialog();
    fireEvent.change(screen.getByLabelText(/consume/i), { target: { value: '1.5' } });
    fireEvent.submit(screen.getByRole('button', { name: /^save$/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/consume amount must be a non-negative integer/i)).toBeInTheDocument(),
    );
  });

  it('shows a validation error when no change is entered', async () => {
    await openAdjustDialog();
    fireEvent.submit(screen.getByRole('button', { name: /^save$/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/no change/i)).toBeInTheDocument(),
    );
  });

  it('shows a validation error when consume exceeds current quantity', async () => {
    await openAdjustDialog();
    fireEvent.change(screen.getByLabelText(/consume/i), { target: { value: '20' } });
    fireEvent.submit(screen.getByRole('button', { name: /^save$/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/cannot consume more than current quantity/i)).toBeInTheDocument(),
    );
  });

  it('calls POST /api/lots/:id/adjust and triggers a refresh on success', async () => {
    const part = makePart([{ ...baseLot, quantity: 10, quantityMode: 'exact' }]);
    let fetchCallCount = 0;
    global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        // Initial part load
        return Promise.resolve({ ok: true, json: async () => ({ data: part }) } as Response);
      }
      if (typeof url === 'string' && url.includes('/adjust')) {
        // Adjust endpoint
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { ...baseLot, quantity: 7 } }),
        } as Response);
      }
      // Refresh part load
      return Promise.resolve({ ok: true, json: async () => ({ data: part }) } as Response);
    });

    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /adjust/i }));
    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    await waitFor(() => screen.getByRole('dialog'));

    fireEvent.change(screen.getByLabelText(/consume/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const adjustCall = calls.find(
        ([url, opts]: [string, RequestInit]) =>
          typeof url === 'string' && url.includes('/adjust') && opts?.method === 'POST',
      );
      expect(adjustCall).toBeDefined();
      const reqBody = JSON.parse(adjustCall[1].body as string);
      expect(reqBody.delta).toBe(-3);
    });

    // After success, a re-fetch of the part should be triggered
    await waitFor(() => expect(fetchCallCount).toBeGreaterThanOrEqual(3));
  });

  it('shows an error message when the adjust API call fails', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/adjust')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ message: 'Insufficient stock' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: makePart([{ ...baseLot, quantity: 10, quantityMode: 'exact' }]) }),
      } as Response);
    });

    render(<PartDetailClient />);
    await waitFor(() => screen.getByRole('button', { name: /adjust/i }));
    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    await waitFor(() => screen.getByRole('dialog'));

    fireEvent.change(screen.getByLabelText(/consume/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText('Insufficient stock')).toBeInTheDocument(),
    );
  });
});


