/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AddAllocationDialog } from '../AddAllocationDialog';
import type { AllocationWithDetails } from '../../types';

// Mock Dialog components to render children directly
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock PartSearch to a simple controlled input
jest.mock('@/features/intake/components/PartSearch', () => ({
  PartSearch: ({
    onChange,
    placeholder,
  }: {
    value: unknown;
    onChange: (part: { id: string; name: string } | null) => void;
    placeholder?: string;
  }) => (
    <div>
      <input
        data-testid="part-search-input"
        placeholder={placeholder ?? 'Search parts…'}
        readOnly
      />
      <button
        type="button"
        data-testid="select-part-btn"
        onClick={() => onChange({ id: 'part-1', name: 'Resistor 10k' })}
      >
        Select Part
      </button>
    </div>
  ),
}));

const mockOnOpenChange = jest.fn();
const mockOnAllocationAdded = jest.fn();

const LOTS = [
  {
    id: 'lot-aaa',
    quantity: 50,
    quantityMode: 'exact',
    qualitativeStatus: null,
    unit: 'pcs',
    status: 'in_stock',
    location: { id: 'loc-1', name: 'Shelf A', path: 'Shelf A' },
    part: { id: 'part-1', name: 'Resistor 10k' },
  },
  {
    id: 'lot-bbb',
    quantity: null,
    quantityMode: 'qualitative',
    qualitativeStatus: 'some',
    unit: null,
    status: 'in_stock',
    location: null,
    part: { id: 'part-1', name: 'Resistor 10k' },
  },
];

const MOCK_ALLOCATION: AllocationWithDetails = {
  id: 'alloc-1',
  lotId: 'lot-aaa',
  projectId: 'proj-1',
  quantity: 5,
  status: 'reserved',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lot: {
    id: 'lot-aaa',
    partId: 'part-1',
    quantity: 50,
    quantityMode: 'exact',
    unit: 'pcs',
    status: 'in_stock',
    part: { id: 'part-1', name: 'Resistor 10k' },
  },
};

function renderDialog(open = true) {
  return render(
    <AddAllocationDialog
      projectId="proj-1"
      open={open}
      onOpenChange={mockOnOpenChange}
      onAllocationAdded={mockOnAllocationAdded}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('AddAllocationDialog — step 1 (Part Search)', () => {
  it('renders "Select a Part" title when open', () => {
    renderDialog();
    expect(screen.getByText('Select a Part')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog(false);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('Next button is disabled when no part is selected', () => {
    renderDialog();
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it('Cancel button calls onOpenChange(false)', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('Next button is enabled after selecting a part', async () => {
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it('advances to step 2 after clicking Next with a part selected', async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Select a Lot')).toBeInTheDocument();
  });
});

describe('AddAllocationDialog — step 2 (Lot Picker)', () => {
  async function goToStep2() {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // loading
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Select a Lot');
  }

  it('shows loading state while fetching lots', async () => {
    await goToStep2();
    expect(screen.getByText('Loading lots…')).toBeInTheDocument();
  });

  it('shows error when lots fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByText('Failed to load lots')).toBeInTheDocument(),
    );
  });

  it('shows "No lots found" when lots array is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByText('No lots found for this part.')).toBeInTheDocument(),
    );
  });

  it('renders lot list when lots are returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: LOTS }),
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      // Both lots appear as radio items with their lot IDs truncated
      expect(screen.getAllByRole('radio')).toHaveLength(2);
    });
  });

  it('shows the selected part name in step 2', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: LOTS }),
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    expect(screen.getByText('Resistor 10k')).toBeInTheDocument();
  });

  it('"Change" link returns to step 1', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: LOTS }),
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: /change/i }));
    expect(screen.getByText('Select a Part')).toBeInTheDocument();
  });

  it('shows quantity input when an exact-mode lot is selected', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOTS }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }); // allocations fetch
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    const exactRadio = screen.getAllByRole('radio')[0];
    fireEvent.click(exactRadio);
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Enter quantity')).toBeInTheDocument(),
    );
  });

  it('does not show quantity input for qualitative-mode lot', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: LOTS }),
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    const qualitativeRadio = screen.getAllByRole('radio')[1];
    fireEvent.click(qualitativeRadio);
    await waitFor(() => screen.getByPlaceholderText('Optional notes'));
    expect(screen.queryByPlaceholderText('Enter quantity')).not.toBeInTheDocument();
  });

  it('shows available quantity for selected exact-mode lot', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOTS }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ quantity: 10 }, { quantity: 5 }] }),
      });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(() =>
      expect(screen.getByText(/available: 35/i)).toBeInTheDocument(),
    );
  });
});

describe('AddAllocationDialog — validation', () => {
  async function setupStep2WithExactLot() {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOTS }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ quantity: 10 }] }),
      });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(() => screen.getByPlaceholderText('Enter quantity'));
  }

  it('shows error when quantity is zero or negative', async () => {
    await setupStep2WithExactLot();
    // Use -1: non-empty string (so button is enabled), but parseInt gives <= 0
    const qtyInput = screen.getByPlaceholderText('Enter quantity');
    fireEvent.change(qtyInput, { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() =>
      expect(screen.getByText('Please enter a valid quantity')).toBeInTheDocument(),
    );
  });

  it('shows error when quantity exceeds available stock', async () => {
    await setupStep2WithExactLot();
    // available = 50 - 10 = 40
    const qtyInput = screen.getByPlaceholderText('Enter quantity');
    fireEvent.change(qtyInput, { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/quantity exceeds available stock \(40\)/i),
      ).toBeInTheDocument(),
    );
  });
});

describe('AddAllocationDialog — submission', () => {
  async function setupStep2WithExactLot() {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOTS }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) }); // allocations
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    fireEvent.click(screen.getAllByRole('radio')[0]);
    await waitFor(() => screen.getByPlaceholderText('Enter quantity'));
  }

  it('submits with correct payload and calls onAllocationAdded on success', async () => {
    await setupStep2WithExactLot();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: MOCK_ALLOCATION }),
    });
    fireEvent.change(screen.getByPlaceholderText('Enter quantity'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const submitCall = calls[calls.length - 1];
      const body = JSON.parse(submitCall[1].body as string);
      expect(body).toMatchObject({ lotId: 'lot-aaa', projectId: 'proj-1', quantity: 5 });
      expect(mockOnAllocationAdded).toHaveBeenCalledWith(MOCK_ALLOCATION);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('includes notes when provided', async () => {
    await setupStep2WithExactLot();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: MOCK_ALLOCATION }),
    });
    fireEvent.change(screen.getByPlaceholderText('Enter quantity'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional notes'), {
      target: { value: 'For motor driver' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const body = JSON.parse(calls[calls.length - 1][1].body as string);
      expect(body.notes).toBe('For motor driver');
    });
  });

  it('submits qualitative lot without quantity field', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: LOTS }),
    });
    renderDialog();
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => screen.getAllByRole('radio'));
    fireEvent.click(screen.getAllByRole('radio')[1]); // qualitative lot
    await waitFor(() => screen.getByPlaceholderText('Optional notes'));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: MOCK_ALLOCATION }),
    });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const body = JSON.parse(calls[calls.length - 1][1].body as string);
      expect(body.quantity).toBeUndefined();
      expect(mockOnAllocationAdded).toHaveBeenCalled();
    });
  });

  it('shows API error message on failed submission', async () => {
    await setupStep2WithExactLot();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Lot is out of stock' }),
    });
    fireEvent.change(screen.getByPlaceholderText('Enter quantity'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() =>
      expect(screen.getByText('Lot is out of stock')).toBeInTheDocument(),
    );
    expect(mockOnAllocationAdded).not.toHaveBeenCalled();
  });

  it('shows fallback error when API returns no message', async () => {
    await setupStep2WithExactLot();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    fireEvent.change(screen.getByPlaceholderText('Enter quantity'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() =>
      expect(screen.getByText('Failed to create allocation')).toBeInTheDocument(),
    );
  });

  it('shows network error when fetch throws during submission', async () => {
    await setupStep2WithExactLot();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));
    fireEvent.change(screen.getByPlaceholderText('Enter quantity'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add to project/i }));
    await waitFor(() =>
      expect(screen.getByText('Network error, please try again')).toBeInTheDocument(),
    );
  });
});

describe('AddAllocationDialog — reset on close', () => {
  it('resets to step 1 when dialog is reopened after closing', async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { rerender } = render(
      <AddAllocationDialog
        projectId="proj-1"
        open={true}
        onOpenChange={mockOnOpenChange}
        onAllocationAdded={mockOnAllocationAdded}
      />,
    );
    // Advance to step 2
    fireEvent.click(screen.getByTestId('select-part-btn'));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Select a Lot')).toBeInTheDocument();

    // Close dialog
    await act(async () => {
      rerender(
        <AddAllocationDialog
          projectId="proj-1"
          open={false}
          onOpenChange={mockOnOpenChange}
          onAllocationAdded={mockOnAllocationAdded}
        />,
      );
    });

    // Reopen — should be back on step 1
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    await act(async () => {
      rerender(
        <AddAllocationDialog
          projectId="proj-1"
          open={true}
          onOpenChange={mockOnOpenChange}
          onAllocationAdded={mockOnAllocationAdded}
        />,
      );
    });
    expect(screen.getByText('Select a Part')).toBeInTheDocument();
  });
});
