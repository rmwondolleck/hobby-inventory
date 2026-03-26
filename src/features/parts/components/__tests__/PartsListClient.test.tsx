/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PartsListClient } from '../PartsListClient';
import type { PartListItem } from '../../types';

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

const mockPush = jest.fn();
let mockSearchParamsValue = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/parts',
  useSearchParams: () => mockSearchParamsValue,
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('../FilterSidebar', () => ({
  FilterSidebar: () => <div data-testid="filter-sidebar" />,
}));

jest.mock('../PartCard', () => ({
  PartCard: ({ part }: { part: PartListItem }) => (
    <div data-testid="part-card">{part.name}</div>
  ),
}));

const makePart = (overrides?: Partial<PartListItem>): PartListItem => ({
  id: 'part-1',
  name: 'ESP32 Module',
  category: 'Microcontrollers',
  tags: ['wifi', 'ble'],
  parameters: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  totalQuantity: 5,
  availableQuantity: 5,
  reservedQuantity: 0,
  inUseQuantity: 0,
  scrappedQuantity: 0,
  qualitativeStatuses: [],
  lotCount: 1,
  ...overrides,
});

describe('PartsListClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders parts from API response', async () => {
    const parts = [
      makePart({ id: 'p1', name: 'ESP32 Module' }),
      makePart({ id: 'p2', name: 'Arduino Nano' }),
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: parts, total: 2 }),
    });

    await act(async () => {
      render(<PartsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('ESP32 Module')).toBeInTheDocument();
      expect(screen.getByText('Arduino Nano')).toBeInTheDocument();
    });
  });

  it('shows empty state when no parts returned', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(<PartsListClient />);
    });

    await waitFor(() => {
      expect(
        screen.getByText('No parts yet. Add your first part to get started.')
      ).toBeInTheDocument();
    });
  });

  it('shows filter empty state when search is active', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(<PartsListClient />);
    });

    // Type into the search box to trigger filtered empty state
    const searchInput = screen.getByPlaceholderText('Search by name, MPN, manufacturer…');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    await waitFor(() => {
      expect(screen.getByText('No parts match your filters.')).toBeInTheDocument();
    });
  });

  it('search input calls API with query param', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(<PartsListClient />);
    });

    const searchInput = screen.getByPlaceholderText('Search by name, MPN, manufacturer…');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'resistor' } });
    });

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls as [string][];
      const searchCall = calls.find(([url]) => url.includes('search=resistor'));
      expect(searchCall).toBeDefined();
    });
  });

  it('shows part count in results summary', async () => {
    const parts = [makePart({ id: 'p1', name: 'Part One' })];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: parts, total: 1 }),
    });

    await act(async () => {
      render(<PartsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/1 part/)).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await act(async () => {
      render(<PartsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch parts/)).toBeInTheDocument();
    });
  });
});

describe('PartsListClient — sort controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParamsValue = new URLSearchParams();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });
  });

  it('renders Sort By select with allowed options', async () => {
    await act(async () => {
      render(<PartsListClient />);
    });

    const sortBySelect = screen.getByRole('combobox', { name: /sort by/i });
    expect(sortBySelect).toBeInTheDocument();

    const options = Array.from(sortBySelect.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(options).toContain('updatedAt');
    expect(options).toContain('createdAt');
    expect(options).toContain('name');
    expect(options).toContain('category');
  });

  it('renders Sort Direction select', async () => {
    await act(async () => {
      render(<PartsListClient />);
    });

    const sortDirSelect = document.getElementById('parts-sort-dir') as HTMLSelectElement;
    expect(sortDirSelect).toBeInTheDocument();

    const options = Array.from(sortDirSelect.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value
    );
    expect(options).toContain('asc');
    expect(options).toContain('desc');
  });

  it('changing Sort By calls router.push with sortBy param', async () => {
    await act(async () => {
      render(<PartsListClient />);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
        target: { value: 'name' },
      });
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=name')
    );
  });

  it('changing Sort Direction calls router.push with sortDir param', async () => {
    mockSearchParamsValue = new URLSearchParams('sortBy=name&sortDir=desc');

    await act(async () => {
      render(<PartsListClient />);
    });

    const sortDirSelect = document.getElementById('parts-sort-dir') as HTMLSelectElement;

    await act(async () => {
      fireEvent.change(sortDirSelect, {
        target: { value: 'asc' },
      });
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sortDir=asc')
    );
  });

  it('reads sortBy and sortDir from URL search params on initial render', async () => {
    mockSearchParamsValue = new URLSearchParams('sortBy=category&sortDir=asc');

    await act(async () => {
      render(<PartsListClient />);
    });

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls as [string][];
      const initialCall = calls[0]?.[0] as string;
      expect(initialCall).toContain('sortBy=category');
      expect(initialCall).toContain('sortDir=asc');
    });
  });
});
