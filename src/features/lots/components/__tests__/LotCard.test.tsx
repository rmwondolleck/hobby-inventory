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
  quantity: 25,
  quantityMode: 'exact',
  qualitativeStatus: null,
  unit: 'pcs',
  status: 'in_stock',
  notes: null,
  part: {
    id: 'part-1',
    name: 'ESP32-WROOM-32',
    category: 'Microcontrollers',
  },
  location: {
    id: 'loc-1',
    name: 'Shelf A1',
    path: 'Workshop > Shelf A1',
  },
};

describe('LotCard', () => {
  describe('rendering', () => {
    it('renders the part name', () => {
      render(<LotCard lot={baseLot} />);
      expect(screen.getByText('ESP32-WROOM-32')).toBeInTheDocument();
    });

    it('links to the correct lot detail URL', () => {
      render(<LotCard lot={baseLot} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/lots/lot-1');
    });

    it('renders the part category', () => {
      render(<LotCard lot={baseLot} />);
      expect(screen.getByText('Microcontrollers')).toBeInTheDocument();
    });

    it('does not render category when null', () => {
      const lot = { ...baseLot, part: { ...baseLot.part, category: null } };
      render(<LotCard lot={lot} />);
      expect(screen.queryByText('Microcontrollers')).not.toBeInTheDocument();
    });

    it('renders the status badge', () => {
      render(<LotCard lot={baseLot} />);
      expect(screen.getByTestId('lot-status-badge')).toBeInTheDocument();
    });
  });

  describe('quantity display', () => {
    it('shows exact quantity with unit', () => {
      render(<LotCard lot={baseLot} />);
      expect(screen.getByText('25 pcs')).toBeInTheDocument();
    });

    it('shows exact quantity without unit when unit is null', () => {
      render(<LotCard lot={{ ...baseLot, unit: null }} />);
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('shows em-dash when quantity is null in exact mode', () => {
      render(<LotCard lot={{ ...baseLot, quantity: null }} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('shows qualitative status label for qualitative mode', () => {
      const lot = {
        ...baseLot,
        quantityMode: 'qualitative',
        quantity: null,
        qualitativeStatus: 'plenty',
      };
      render(<LotCard lot={lot} />);
      expect(screen.getByText('Plenty')).toBeInTheDocument();
    });

    it('shows Low qualitative label', () => {
      const lot = {
        ...baseLot,
        quantityMode: 'qualitative',
        quantity: null,
        qualitativeStatus: 'low',
      };
      render(<LotCard lot={lot} />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('shows em-dash for qualitative mode with null status', () => {
      const lot = {
        ...baseLot,
        quantityMode: 'qualitative',
        quantity: null,
        qualitativeStatus: null,
      };
      render(<LotCard lot={lot} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('location display', () => {
    it('shows location path when location is provided', () => {
      render(<LotCard lot={baseLot} />);
      expect(screen.getByText('Workshop > Shelf A1')).toBeInTheDocument();
    });

    it('shows location name when path is empty', () => {
      const lot = {
        ...baseLot,
        location: { id: 'loc-1', name: 'Shelf A1', path: '' },
      };
      render(<LotCard lot={lot} />);
      expect(screen.getByText('Shelf A1')).toBeInTheDocument();
    });

    it('does not show location row when location is null', () => {
      render(<LotCard lot={{ ...baseLot, location: null }} />);
      expect(screen.queryByText(/Workshop/)).not.toBeInTheDocument();
    });
  });

  describe('notes', () => {
    it('renders notes when provided', () => {
      render(<LotCard lot={{ ...baseLot, notes: 'Bought in bulk' }} />);
      expect(screen.getByText('Bought in bulk')).toBeInTheDocument();
    });

    it('does not render notes section when notes is null', () => {
      render(<LotCard lot={baseLot} />);
      expect(screen.queryByText('Bought in bulk')).not.toBeInTheDocument();
    });
  });

  describe('theme classes (CSS variable substitution)', () => {
    it('uses bg-card on the card inner div for normal stock state', () => {
      const { container } = render(<LotCard lot={baseLot} />);
      const card = container.querySelector('div') as HTMLElement;
      expect(card.className).toContain('bg-card');
      expect(card.className).not.toContain('bg-white');
    });

    it('uses text-foreground for part name instead of hardcoded gray', () => {
      render(<LotCard lot={baseLot} />);
      const name = screen.getByText('ESP32-WROOM-32');
      expect(name.className).toContain('text-foreground');
      expect(name.className).not.toContain('text-gray-900');
    });

    it('uses text-muted-foreground for category instead of hardcoded gray', () => {
      render(<LotCard lot={baseLot} />);
      const category = screen.getByText('Microcontrollers');
      expect(category.className).toContain('text-muted-foreground');
      expect(category.className).not.toContain('text-gray-500');
      expect(category.className).not.toContain('text-gray-600');
    });

    it('overrides bg-card with bg-red-50 when lot is out of stock', () => {
      const lot = { ...baseLot, status: 'out', qualitativeStatus: null };
      const { container } = render(<LotCard lot={lot} />);
      const card = container.querySelector('div') as HTMLElement;
      expect(card.className).toContain('bg-red-50');
    });

    it('overrides bg-card with bg-yellow-50 when lot is low stock', () => {
      const lot = { ...baseLot, status: 'low', qualitativeStatus: null };
      const { container } = render(<LotCard lot={lot} />);
      const card = container.querySelector('div') as HTMLElement;
      expect(card.className).toContain('bg-yellow-50');
    });
  });
});
