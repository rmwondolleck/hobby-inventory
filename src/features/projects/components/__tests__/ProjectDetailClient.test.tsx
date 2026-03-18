/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectDetailClient } from '../ProjectDetailClient';

// ---- mocks ----

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

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// Stub AddAllocationDialog so ProjectDetailClient doesn't need Radix Dialog + PartSearch
jest.mock('../AddAllocationDialog', () => ({
  AddAllocationDialog: ({
    open,
    onOpenChange,
    onAllocationAdded,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onAllocationAdded: (a: unknown) => void;
    projectId: string;
  }) =>
    open ? (
      <div data-testid="add-allocation-dialog">
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
        <button
          data-testid="simulate-allocation-added"
          onClick={() =>
            onAllocationAdded({
              id: 'alloc-new',
              lotId: 'lot-x',
              projectId: 'proj-1',
              quantity: 2,
              status: 'reserved',
              notes: null,
              createdAt: '2024-02-01T00:00:00Z',
              updatedAt: '2024-02-01T00:00:00Z',
              lot: {
                id: 'lot-x',
                partId: 'part-x',
                quantity: 10,
                quantityMode: 'exact',
                unit: 'pcs',
                status: 'in_stock',
                part: { id: 'part-x', name: 'New Part', category: null },
              },
            })
          }
        >
          Simulate Add
        </button>
      </div>
    ) : null,
}));

// ---- fixtures ----

const ALLOCATION_RESERVED = {
  id: 'alloc-1',
  lotId: 'lot-1',
  projectId: 'proj-1',
  quantity: 5,
  status: 'reserved',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lot: {
    id: 'lot-1',
    partId: 'part-1',
    quantity: 50,
    quantityMode: 'exact',
    unit: 'pcs',
    status: 'in_stock',
    location: null,
    part: { id: 'part-1', name: 'Resistor 10k', category: null },
  },
};

const ALLOCATION_RECOVERED = {
  ...ALLOCATION_RESERVED,
  id: 'alloc-2',
  status: 'recovered',
};

const BASE_PROJECT = {
  id: 'proj-1',
  name: 'Test Project',
  status: 'active',
  tags: [],
  notes: null,
  wishlistNotes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  archivedAt: null,
  allocationCount: 1,
  allocationsByStatus: { reserved: 1 },
  allocations: [ALLOCATION_RESERVED],
  events: [],
};

function mockFetchProject(project = BASE_PROJECT) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: project }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

// ---- loading / error states ----

describe('ProjectDetailClient — loading and error states', () => {
  it('renders loading skeleton initially', () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { container } = render(<ProjectDetailClient id="proj-1" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders 404 state when project is not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 });
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() =>
      expect(screen.getByText('Project not found.')).toBeInTheDocument(),
    );
  });

  it('renders error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });

  it('renders the project name on successful fetch', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() =>
      expect(screen.getByText('Test Project')).toBeInTheDocument(),
    );
  });
});

// ---- "Add Part" button ----

describe('ProjectDetailClient — Add Part button', () => {
  it('renders "+ Add Part" button', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    expect(screen.getByRole('button', { name: /\+ add part/i })).toBeInTheDocument();
  });

  it('opens AddAllocationDialog when "+ Add Part" is clicked', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    fireEvent.click(screen.getByRole('button', { name: /\+ add part/i }));
    expect(screen.getByTestId('add-allocation-dialog')).toBeInTheDocument();
  });

  it('appends new allocation to the table when onAllocationAdded fires', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    fireEvent.click(screen.getByRole('button', { name: /\+ add part/i }));
    fireEvent.click(screen.getByTestId('simulate-allocation-added'));
    await waitFor(() =>
      expect(screen.getByText('New Part')).toBeInTheDocument(),
    );
  });
});

// ---- Remove allocation ----

describe('ProjectDetailClient — remove allocation', () => {
  it('shows remove (trash) button for non-recovered allocations', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    expect(
      screen.getByRole('button', { name: /remove allocation/i }),
    ).toBeInTheDocument();
  });

  it('does not show remove button for recovered allocations', async () => {
    mockFetchProject({
      ...BASE_PROJECT,
      allocations: [ALLOCATION_RECOVERED],
      allocationsByStatus: { recovered: 1 },
    });
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    expect(
      screen.queryByRole('button', { name: /remove allocation/i }),
    ).not.toBeInTheDocument();
  });

  it('shows inline confirmation after clicking remove button', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    expect(screen.getByText('Remove?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^yes$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^no$/i })).toBeInTheDocument();
  });

  it('hides confirmation when "No" is clicked', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }));
    expect(screen.queryByText('Remove?')).not.toBeInTheDocument();
  });

  it('calls PATCH /api/allocations/:id with status "recovered" when "Yes" is clicked', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));

    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const patchCall = calls[calls.length - 1];
      expect(patchCall[0]).toBe('/api/allocations/alloc-1');
      expect(patchCall[1].method).toBe('PATCH');
      expect(JSON.parse(patchCall[1].body)).toEqual({ status: 'recovered' });
    });
  });

  it('removes the allocation row from the table on successful PATCH', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Resistor 10k'));

    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(screen.queryByText('Resistor 10k')).not.toBeInTheDocument(),
    );
  });

  it('shows error message when PATCH fails', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Cannot remove active allocation' }),
    });
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Cannot remove active allocation'),
      ).toBeInTheDocument(),
    );
    // Allocation row should still be visible
    expect(screen.getByText('Resistor 10k')).toBeInTheDocument();
  });

  it('shows fallback error when PATCH fails without message', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(screen.getByText('Failed to remove allocation')).toBeInTheDocument(),
    );
  });

  it('shows network error when PATCH throws', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(screen.getByText('Network error, please try again')).toBeInTheDocument(),
    );
  });

  it('clears the remove error when a new remove is requested', async () => {
    mockFetchProject({
      ...BASE_PROJECT,
      allocationCount: 2,
      allocations: [ALLOCATION_RESERVED, { ...ALLOCATION_RESERVED, id: 'alloc-3' }],
      allocationsByStatus: { reserved: 2 },
    });
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText('Test Project'));

    // First remove fails
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Oops' }),
    });
    const removeButtons = screen.getAllByRole('button', { name: /remove allocation/i });
    fireEvent.click(removeButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));
    await waitFor(() => expect(screen.getByText('Oops')).toBeInTheDocument());

    // Second remove request clears error
    const removeButtons2 = screen.getAllByRole('button', { name: /remove allocation/i });
    fireEvent.click(removeButtons2[0]);
    expect(screen.queryByText('Oops')).not.toBeInTheDocument();
  });
});

// ---- allocation count update ----

describe('ProjectDetailClient — allocation count', () => {
  it('decrements allocation count after successful remove', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText(/1 total/));

    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /remove allocation/i }));
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }));

    await waitFor(() =>
      expect(screen.queryByText(/1 total/)).not.toBeInTheDocument(),
    );
  });

  it('increments allocation count when a new allocation is added', async () => {
    mockFetchProject();
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() => screen.getByText(/1 total/));

    fireEvent.click(screen.getByRole('button', { name: /\+ add part/i }));
    fireEvent.click(screen.getByTestId('simulate-allocation-added'));

    await waitFor(() =>
      expect(screen.getByText(/2 total/)).toBeInTheDocument(),
    );
  });
});
