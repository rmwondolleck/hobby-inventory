/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CommandPalette } from '../CommandPalette';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

jest.mock('@/components/ui/command', () => ({
  CommandDialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div
        data-testid="command-dialog"
        onKeyDown={e => {
          if (e.key === 'Escape') onOpenChange(false);
        }}
      >
        {children}
      </div>
    ) : null,

  CommandInput: ({
    placeholder,
    value,
    onValueChange,
  }: {
    placeholder?: string;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={e => onValueChange?.(e.target.value)}
    />
  ),

  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),

  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),

  CommandGroup: ({
    heading,
    children,
  }: {
    heading?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={`command-group-${heading?.toLowerCase()}`} data-heading={heading}>
      {children}
    </div>
  ),

  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <div data-testid="command-item" role="option" onClick={onSelect}>
      {children}
    </div>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PARTS_RESPONSE = {
  data: [
    { id: 'part-1', name: 'ESP32', category: 'Microcontrollers', totalQuantity: 5 },
    { id: 'part-2', name: 'Resistor 10k', category: 'Resistors', totalQuantity: 100 },
  ],
  total: 2,
};

const LOTS_RESPONSE = {
  data: [
    {
      id: 'lot-1',
      quantity: 5,
      qualitativeStatus: null,
      quantityMode: 'exact',
      status: 'in_stock',
      part: { id: 'part-1', name: 'ESP32' },
      location: { id: 'loc-1', name: 'Shelf A', path: 'Office/Shelf A' },
    },
  ],
  total: 1,
};

const LOCATIONS_RESPONSE = {
  data: [
    { id: 'loc-1', name: 'Shelf A', path: 'Office/Shelf A' },
    { id: 'loc-2', name: 'Drawer 1', path: 'Office/Shelf A/Drawer 1' },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch() {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('/api/parts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(PARTS_RESPONSE) });
    }
    if (url.includes('/api/lots')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(LOTS_RESPONSE) });
    }
    if (url.includes('/api/locations')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(LOCATIONS_RESPONSE) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Default: return empty data so location fetch on mount doesn't throw
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onOpenChange={jest.fn()} />);
    expect(screen.queryByTestId('command-dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when open', () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByTestId('command-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('command-input')).toBeInTheDocument();
  });

  it('renders search placeholder text', () => {
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('fires debounced search requests on input change', async () => {
    mockFetch();
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);

    // Allow the initial locations fetch (on mount) to complete, then reset counts
    await act(async () => { await Promise.resolve(); });
    (global.fetch as jest.Mock).mockClear();

    fireEvent.change(screen.getByTestId('command-input'), { target: { value: 'esp' } });

    // Not called immediately (debounced)
    expect(global.fetch).not.toHaveBeenCalled();

    // After debounce
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/parts?search=esp'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/lots?q=esp'));
  });

  it('renders grouped Part and Lot results', async () => {
    mockFetch();
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);

    fireEvent.change(screen.getByTestId('command-input'), { target: { value: 'esp' } });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('command-group-parts')).toBeInTheDocument();
      expect(screen.getByTestId('command-group-lots')).toBeInTheDocument();
    });

    // ESP32 appears in both the parts group and the lots group
    expect(screen.getAllByText('ESP32').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to part detail page on selection', async () => {
    mockFetch();
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);

    fireEvent.change(screen.getByTestId('command-input'), { target: { value: 'esp' } });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await waitFor(() => screen.getByTestId('command-group-parts'));

    const items = screen.getAllByTestId('command-item');
    const esp32Item = items.find(el => el.textContent?.includes('ESP32'));
    expect(esp32Item).toBeDefined();
    fireEvent.click(esp32Item!);

    expect(mockPush).toHaveBeenCalledWith('/parts/part-1');
  });

  it('calls onOpenChange(false) when Escape is pressed', () => {
    const onOpenChange = jest.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

    fireEvent.keyDown(screen.getByTestId('command-dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows empty state when no results match', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);

    fireEvent.change(screen.getByTestId('command-input'), { target: { value: 'zzznomatch' } });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('command-empty')).toBeInTheDocument();
    });
  });

  it('renders Locations group for matching locations', async () => {
    mockFetch();
    render(<CommandPalette open={true} onOpenChange={jest.fn()} />);

    // Trigger location fetch (happens on open)
    await act(async () => { await Promise.resolve(); });

    fireEvent.change(screen.getByTestId('command-input'), { target: { value: 'Shelf' } });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('command-group-locations')).toBeInTheDocument();
    });
  });
});
