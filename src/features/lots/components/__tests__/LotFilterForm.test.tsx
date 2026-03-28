/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LotFilterForm } from '../LotFilterForm';

const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/lots',
  useSearchParams: () => mockSearchParams,
}));

describe('LotFilterForm — sort controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('renders Sort By select with all allowed options', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    const sortBySelect = screen.getByRole('combobox', { name: /sort by/i });
    expect(sortBySelect).toBeInTheDocument();

    const options = Array.from(sortBySelect.querySelectorAll('option')).map(
      (o) => o.value
    );
    expect(options).toContain('updatedAt');
    expect(options).toContain('createdAt');
    expect(options).toContain('quantity');
    expect(options).toContain('status');
    expect(options).toContain(''); // default
  });

  it('Sort Direction select is hidden when sortBy is empty', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.queryByRole('combobox', { name: /sort direction/i })).not.toBeInTheDocument();
  });

  it('Sort Direction select appears when a sortBy value is selected', () => {
    mockSearchParams = new URLSearchParams('sortBy=quantity');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.getByRole('combobox', { name: /sort direction/i })).toBeInTheDocument();
  });

  it('changing Sort By calls router.push with sortBy param', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
      target: { value: 'quantity' },
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=quantity')
    );
  });

  it('changing Sort By removes offset param (resets pagination)', () => {
    mockSearchParams = new URLSearchParams('offset=20');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
      target: { value: 'status' },
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('offset=');
    expect(calledUrl).toContain('sortBy=status');
  });

  it('changing Sort Direction calls router.push with sortDir param', () => {
    mockSearchParams = new URLSearchParams('sortBy=quantity&sortDir=desc');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort direction/i }), {
      target: { value: 'asc' },
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sortDir=asc')
    );
  });

  it('clearing sortBy via empty value removes sortBy param', () => {
    mockSearchParams = new URLSearchParams('sortBy=quantity');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
      target: { value: '' },
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('sortBy');
  });

  it('shows Clear filters button when sortBy is active', () => {
    mockSearchParams = new URLSearchParams('sortBy=createdAt');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('Clear filters button resets to base pathname', () => {
    mockSearchParams = new URLSearchParams('sortBy=createdAt&sortDir=asc');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(mockPush).toHaveBeenCalledWith('/lots');
  });

  it('does not show Clear filters button when no filters active', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

describe('LotFilterForm — q search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders search input', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument();
  });

  it('search input is initialized from ?q= URL param', () => {
    mockSearchParams = new URLSearchParams('q=resistor');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.getByRole('textbox', { name: /search/i })).toHaveValue('resistor');
  });

  it('typing debounces and calls updateFilter with q value after 300ms', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    const input = screen.getByRole('textbox', { name: /search/i });

    fireEvent.change(input, { target: { value: 'cap' } });
    expect(mockPush).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('q=cap'));
  });

  it('clear search button appears when qInput is non-empty', () => {
    mockSearchParams = new URLSearchParams('q=cap');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('clear search button is not shown when search is empty', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('clicking clear search button removes q param', () => {
    mockSearchParams = new URLSearchParams('q=cap');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('q=');
  });

  it('q is included in hasActiveFilters — shows Clear all button', () => {
    mockSearchParams = new URLSearchParams('q=resistor');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('search input appears before Status section', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    const statusSelect = screen.getByRole('combobox', { name: /status/i });
    expect(
      searchInput.compareDocumentPosition(statusSelect) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('LotFilterForm — category filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('does not render category dropdown when categoryOptions is empty', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} categoryOptions={[]} />);
    expect(screen.queryByRole('combobox', { name: /category/i })).not.toBeInTheDocument();
  });

  it('renders category dropdown when categoryOptions has values', () => {
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors']}
      />
    );
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
  });

  it('renders all category options plus "All Categories" placeholder', () => {
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors', 'ICs']}
      />
    );
    const select = screen.getByRole('combobox', { name: /category/i });
    const options = Array.from(select.querySelectorAll('option')).map(o => o.value);
    expect(options).toEqual(['', 'Resistors', 'Capacitors', 'ICs']);
  });

  it('initialises category select from ?category= URL param', () => {
    mockSearchParams = new URLSearchParams('category=Resistors');
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors']}
      />
    );
    expect(screen.getByRole('combobox', { name: /category/i })).toHaveValue('Resistors');
  });

  it('changing category calls router.push with category param', () => {
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors']}
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: /category/i }), {
      target: { value: 'Capacitors' },
    });
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('category=Capacitors'));
  });

  it('selecting "All Categories" removes category param from URL', () => {
    mockSearchParams = new URLSearchParams('category=Resistors');
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors']}
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: /category/i }), {
      target: { value: '' },
    });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('category=');
  });

  it('active category is included in hasActiveFilters — shows Clear all button', () => {
    mockSearchParams = new URLSearchParams('category=Resistors');
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors']}
      />
    );
    expect(screen.getByRole('button', { name: /clear (all|filters)/i })).toBeInTheDocument();
  });

  it('clearing all filters removes category param', () => {
    mockSearchParams = new URLSearchParams('category=Resistors');
    render(
      <LotFilterForm
        partOptions={[]}
        locationOptions={[]}
        categoryOptions={['Resistors', 'Capacitors']}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /clear (all|filters)/i }));
    expect(mockPush).toHaveBeenCalledWith('/lots');
  });
});

