/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);

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
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);
    expect(screen.queryByRole('combobox', { name: /sort direction/i })).not.toBeInTheDocument();
  });

  it('Sort Direction select appears when a sortBy value is selected', () => {
    mockSearchParams = new URLSearchParams('sortBy=quantity');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);
    expect(screen.getByRole('combobox', { name: /sort direction/i })).toBeInTheDocument();
  });

  it('changing Sort By calls router.push with sortBy param', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
      target: { value: 'quantity' },
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=quantity')
    );
  });

  it('changing Sort By removes offset param (resets pagination)', () => {
    mockSearchParams = new URLSearchParams('offset=20');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
      target: { value: 'status' },
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('offset=');
    expect(calledUrl).toContain('sortBy=status');
  });

  it('changing Sort Direction calls router.push with sortDir param', () => {
    mockSearchParams = new URLSearchParams('sortBy=quantity&sortDir=desc');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort direction/i }), {
      target: { value: 'asc' },
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('sortDir=asc')
    );
  });

  it('clearing sortBy via empty value removes sortBy param', () => {
    mockSearchParams = new URLSearchParams('sortBy=quantity');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);

    fireEvent.change(screen.getByRole('combobox', { name: /sort by/i }), {
      target: { value: '' },
    });

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('sortBy');
  });

  it('shows Clear filters button when sortBy is active', () => {
    mockSearchParams = new URLSearchParams('sortBy=createdAt');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('Clear filters button resets to base pathname', () => {
    mockSearchParams = new URLSearchParams('sortBy=createdAt&sortDir=asc');
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(mockPush).toHaveBeenCalledWith('/lots');
  });

  it('does not show Clear filters button when no filters active', () => {
    render(<LotFilterForm partOptions={[]} locationOptions={[]} />);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});
