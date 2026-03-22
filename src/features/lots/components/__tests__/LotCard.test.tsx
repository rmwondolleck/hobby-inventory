/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LotCard } from '../LotCard';
import type { LotCardLot } from '../LotCard';

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
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

jest.mock('../LotStatusBadge', () => ({
  LotStatusBadge: ({ status }: { status: string; className?: string }) => (
    <span data-testid="lot-status-badge">{status}</span>
  ),
}));

const baseLot: LotCardLot = {
  id: 'lot-1',
  quantity: 10,
  quantityMode: 'quantitative',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  notes: null,
  part: {
    id: 'part-1',
    name: 'ESP32 Module',
    category: 'Microcontrollers',
  },
  location: {
    id: 'loc-1',
    name: 'Shelf A',
    path: 'Office/Shelf A',
  },
};

describe('LotCard', () => {
  it('renders part name', () => {
    render(<LotCard lot={baseLot} />);
    expect(screen.getByText('ESP32 Module')).toBeInTheDocument();
  });

  it('renders quantity with unit', () => {
    render(<LotCard lot={baseLot} />);
    expect(screen.getByText('10 pcs')).toBeInTheDocument();
  });

  it('renders the correct status badge', () => {
    render(<LotCard lot={baseLot} />);
    const badge = screen.getByTestId('lot-status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('in_stock');
  });

  it('shows location path when set', () => {
    render(<LotCard lot={baseLot} />);
    expect(screen.getByText('Office/Shelf A')).toBeInTheDocument();
  });

  it('does not render location section when location is null', () => {
    render(<LotCard lot={{ ...baseLot, location: null }} />);
    expect(screen.queryByText('Office/Shelf A')).not.toBeInTheDocument();
    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
  });

  it('links to the correct lot detail URL', () => {
    render(<LotCard lot={baseLot} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/lots/lot-1');
  });

  it('renders part category when provided', () => {
    render(<LotCard lot={baseLot} />);
    expect(screen.getByText('Microcontrollers')).toBeInTheDocument();
  });

  it('does not render category when null', () => {
    render(<LotCard lot={{ ...baseLot, part: { ...baseLot.part, category: null } }} />);
    expect(screen.queryByText('Microcontrollers')).not.toBeInTheDocument();
  });

  it('renders notes when provided', () => {
    render(<LotCard lot={{ ...baseLot, notes: 'Bought in 2024' }} />);
    expect(screen.getByText('Bought in 2024')).toBeInTheDocument();
  });

  it('renders qualitative status label for qualitative mode', () => {
    render(
      <LotCard
        lot={{
          ...baseLot,
          quantityMode: 'qualitative',
          qualitativeStatus: 'plenty',
          quantity: null,
        }}
      />
    );
    expect(screen.getByText('Plenty')).toBeInTheDocument();
  });

  it('renders dash when quantity is null and mode is quantitative', () => {
    render(<LotCard lot={{ ...baseLot, quantity: null, unit: null }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders quantity without unit when unit is null', () => {
    render(<LotCard lot={{ ...baseLot, quantity: 5, unit: null }} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows location name when path is empty', () => {
    render(
      <LotCard
        lot={{
          ...baseLot,
          location: { id: 'loc-2', name: 'Drawer 1', path: '' },
        }}
      />
    );
    expect(screen.getByText('Drawer 1')).toBeInTheDocument();
  });
});
