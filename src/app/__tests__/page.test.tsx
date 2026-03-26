/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Home from '../page';

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type LotStub = {
  partId: string;
  quantity: number | null;
  part: { id: string; name: string };
};

interface InventoryStatsStub {
  totalValue: number;
  currency: string;
  valueByCategoryTop5: { category: string; value: number }[];
  lotsWithCostData: number;
  lotsWithoutCostData: number;
}

const DEFAULT_STATS: InventoryStatsStub = {
  totalValue: 0,
  currency: 'USD',
  valueByCategoryTop5: [],
  lotsWithCostData: 0,
  lotsWithoutCostData: 0,
};

function makeLot(partId: string, partName: string, quantity: number | null = 3): LotStub {
  return {
    partId,
    quantity,
    part: { id: partId, name: partName },
  };
}

function mockFetch(
  lowLots: LotStub[] = [],
  outLots: LotStub[] = [],
  stats: InventoryStatsStub | null = DEFAULT_STATS,
) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    // The unified Home component also fetches active projects — return empty array for that endpoint
    if ((url as string).includes('/api/projects')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      } as Response);
    }
    if ((url as string).includes('/api/parts/stats')) {
      if (stats === null) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(stats),
      } as Response);
    }
    const lots = url.includes('status=low') ? lowLots : outLots;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: lots }),
    } as Response);
  });
}

function mockFetchError() {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
}

function mockFetchNotOk() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ data: [] }),
  } as unknown as Response);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home page — low stock warnings', () => {
  it('does not render Low Stock Warnings section when no low/out lots exist', async () => {
    mockFetch([], []);
    render(<Home />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    expect(screen.queryByText(/low stock warnings/i)).not.toBeInTheDocument();
  });

  it('renders Low Stock Warnings heading when low lots are returned', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k')], []);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/low stock warnings/i)).toBeInTheDocument();
    });
  });

  it('renders Low Stock Warnings heading when out lots are returned', async () => {
    mockFetch([], [makeLot('part-2', 'LED Red')]);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/low stock warnings/i)).toBeInTheDocument();
    });
  });

  it('displays the part name in each alert', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k')], [makeLot('part-2', 'LED Red')]);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Resistor 10k')).toBeInTheDocument();
      expect(screen.getByText('LED Red')).toBeInTheDocument();
    });
  });

  it('displays the total quantity for each part', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 4)], []);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Qty: 4')).toBeInTheDocument();
    });
  });

  it('sums quantities across multiple lots for the same part', async () => {
    const lot1 = makeLot('part-1', 'Resistor 10k', 3);
    const lot2 = makeLot('part-1', 'Resistor 10k', 7);
    mockFetch([lot1], [lot2]);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Qty: 10')).toBeInTheDocument();
    });
  });

  it('treats null quantity as 0 when summing', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', null)], []);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Qty: 0')).toBeInTheDocument();
    });
  });

  it('renders a "View Part" link pointing to /parts/[id] for each part', async () => {
    mockFetch([makeLot('part-abc', 'Capacitor')], []);
    render(<Home />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view part/i });
      expect(link).toHaveAttribute('href', '/parts/part-abc');
    });
  });

  it('renders one alert per unique part, not per lot', async () => {
    const lot1 = makeLot('part-1', 'Resistor 10k', 2);
    const lot2 = makeLot('part-1', 'Resistor 10k', 3);
    const lot3 = makeLot('part-2', 'LED Red', 1);
    mockFetch([lot1, lot2], [lot3]);
    render(<Home />);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
    });
  });

  it('silently ignores fetch errors — no error message shown', async () => {
    mockFetchError();
    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));

    expect(screen.queryByText(/low stock warnings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('silently ignores non-ok fetch responses — section stays hidden', async () => {
    mockFetchNotOk();
    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));

    expect(screen.queryByText(/low stock warnings/i)).not.toBeInTheDocument();
  });

  it('fetches both low and out status endpoints and the stats endpoint', async () => {
    mockFetch([], []);
    render(<Home />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    const calls = (global.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('status=low'),
        expect.stringContaining('status=out'),
        expect.stringContaining('/api/parts/stats'),
      ]),
    );
  });
});

describe('Home page — threshold management', () => {
  it('shows default threshold of 5 when localStorage is empty', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => {
      const input = screen.getByLabelText(/stock threshold for resistor 10k/i);
      expect((input as HTMLInputElement).value).toBe('5');
    });
  });

  it('loads a persisted threshold from localStorage', async () => {
    localStorage.setItem('stock-thresholds', JSON.stringify({ 'part-1': 10 }));
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => {
      const input = screen.getByLabelText(/stock threshold for resistor 10k/i);
      expect((input as HTMLInputElement).value).toBe('10');
    });
  });

  it('updates threshold display as user types', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => screen.getByLabelText(/stock threshold for resistor 10k/i));

    const input = screen.getByLabelText(/stock threshold for resistor 10k/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15' } });
    expect(input.value).toBe('15');
  });

  it('saves valid threshold to localStorage on blur', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => screen.getByLabelText(/stock threshold for resistor 10k/i));

    const input = screen.getByLabelText(/stock threshold for resistor 10k/i);
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.blur(input);

    const stored = JSON.parse(localStorage.getItem('stock-thresholds') ?? '{}');
    expect(stored['part-1']).toBe(20);
  });

  it('falls back to DEFAULT_THRESHOLD (5) when blur value is not a valid number', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => screen.getByLabelText(/stock threshold for resistor 10k/i));

    const input = screen.getByLabelText(/stock threshold for resistor 10k/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);

    expect(input.value).toBe('5');
    const stored = JSON.parse(localStorage.getItem('stock-thresholds') ?? '{}');
    expect(stored['part-1']).toBe(5);
  });

  it('falls back to DEFAULT_THRESHOLD when blur value is negative', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => screen.getByLabelText(/stock threshold for resistor 10k/i));

    const input = screen.getByLabelText(/stock threshold for resistor 10k/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-3' } });
    fireEvent.blur(input);

    expect(input.value).toBe('5');
  });

  it('accepts 0 as a valid threshold', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => screen.getByLabelText(/stock threshold for resistor 10k/i));

    const input = screen.getByLabelText(/stock threshold for resistor 10k/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);

    expect(input.value).toBe('0');
    const stored = JSON.parse(localStorage.getItem('stock-thresholds') ?? '{}');
    expect(stored['part-1']).toBe(0);
  });

  it('does not save to localStorage if input was not changed before blur', async () => {
    mockFetch([makeLot('part-1', 'Resistor 10k', 2)], []);
    render(<Home />);

    await waitFor(() => screen.getByLabelText(/stock threshold for resistor 10k/i));

    const input = screen.getByLabelText(/stock threshold for resistor 10k/i);
    fireEvent.blur(input);

    // No change event fired, so thresholdInputs['part-1'] is undefined → no save
    expect(localStorage.getItem('stock-thresholds')).toBeNull();
  });
});

describe('Home page — static content', () => {
  it('renders the page heading', async () => {
    mockFetch([], []);
    render(<Home />);

    expect(screen.getByRole('heading', { name: /welcome to hobby inventory/i })).toBeInTheDocument();
  });

  it('renders navigation links for core sections', async () => {
    mockFetch([], []);
    render(<Home />);

    expect(screen.getByRole('link', { name: /add to inventory/i })).toHaveAttribute('href', '/intake');
    expect(screen.getByRole('link', { name: /browse parts/i })).toHaveAttribute('href', '/parts');
    // The nav links contain full text including descriptions; query by heading content within link
    expect(document.querySelector('a[href="/lots"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/locations"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/projects"]')).toBeInTheDocument();
  });
});

describe('Home page — Inventory Value widget', () => {
  it('does not render the widget when stats fetch fails', async () => {
    mockFetch([], [], null);
    render(<Home />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));

    expect(screen.queryByText(/inventory value/i)).not.toBeInTheDocument();
  });

  it('renders the Inventory Value widget heading after successful stats fetch', async () => {
    mockFetch([], [], DEFAULT_STATS);
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/💰 Inventory Value/)).toBeInTheDocument();
    });
  });

  it('shows empty-state message when no lots have cost data', async () => {
    mockFetch([], [], { ...DEFAULT_STATS, lotsWithCostData: 0, lotsWithoutCostData: 2 });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/add purchase prices to lots/i)).toBeInTheDocument();
    });
  });

  it('displays formatted total value when lots have cost data', async () => {
    mockFetch([], [], {
      totalValue: 42.5,
      currency: 'USD',
      valueByCategoryTop5: [],
      lotsWithCostData: 3,
      lotsWithoutCostData: 0,
    });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('$42.50')).toBeInTheDocument();
    });
  });

  it('shows category breakdown when valueByCategoryTop5 is populated', async () => {
    mockFetch([], [], {
      totalValue: 60,
      currency: 'USD',
      valueByCategoryTop5: [
        { category: 'Resistors', value: 40 },
        { category: 'Capacitors', value: 20 },
      ],
      lotsWithCostData: 5,
      lotsWithoutCostData: 0,
    });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Resistors')).toBeInTheDocument();
      expect(screen.getByText('Capacitors')).toBeInTheDocument();
      expect(screen.getByText('Top Categories')).toBeInTheDocument();
    });
  });

  it('shows count of lots without cost data when some are excluded', async () => {
    mockFetch([], [], {
      totalValue: 10,
      currency: 'USD',
      valueByCategoryTop5: [],
      lotsWithCostData: 2,
      lotsWithoutCostData: 5,
    });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/5 lots without cost data excluded/i)).toBeInTheDocument();
    });
  });

  it('uses singular "lot" when lotsWithoutCostData is 1', async () => {
    mockFetch([], [], {
      totalValue: 10,
      currency: 'USD',
      valueByCategoryTop5: [],
      lotsWithCostData: 2,
      lotsWithoutCostData: 1,
    });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/1 lot without cost data excluded/i)).toBeInTheDocument();
    });
  });

  it('persists collapsed state to localStorage when widget is toggled', async () => {
    mockFetch([], [], { ...DEFAULT_STATS, lotsWithCostData: 0 });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/💰 Inventory Value/)).toBeInTheDocument();
    });

    // Click to collapse
    const trigger = screen.getByText(/💰 Inventory Value/).closest('button') as HTMLElement;
    fireEvent.click(trigger);

    expect(localStorage.getItem('inventory-value-collapsed')).toBe('true');
  });

  it('restores collapsed=false (open) state from localStorage', async () => {
    localStorage.setItem('inventory-value-collapsed', 'false');
    mockFetch([], [], { ...DEFAULT_STATS, lotsWithCostData: 1, totalValue: 25 });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('$25.00')).toBeInTheDocument();
    });
  });

  it('shows summary value in header when widget is collapsed', async () => {
    // Pre-set collapsed state so widget starts closed
    localStorage.setItem('inventory-value-collapsed', 'true');
    mockFetch([], [], {
      totalValue: 99.99,
      currency: 'USD',
      valueByCategoryTop5: [],
      lotsWithCostData: 3,
      lotsWithoutCostData: 0,
    });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('$99.99')).toBeInTheDocument();
    });
  });
});
