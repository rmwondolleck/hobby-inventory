/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PartCard } from '../PartCard';
import type { PartListItem } from '../../types';

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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

const basePart: PartListItem = {
  id: 'part-1',
  name: 'ESP32-WROOM-32',
  category: 'Microcontrollers',
  manufacturer: 'Espressif',
  mpn: 'ESP32-WROOM-32D',
  tags: ['wifi', 'ble'],
  notes: null,
  parameters: {},
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  totalQuantity: 10,
  qualitativeStatuses: [],
  lotCount: 2,
};

describe('PartCard', () => {
  describe('rendering', () => {
    it('renders the part name', () => {
      render(<PartCard part={basePart} />);
      expect(screen.getByText('ESP32-WROOM-32')).toBeInTheDocument();
    });

    it('links to the correct part detail URL', () => {
      render(<PartCard part={basePart} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/parts/part-1');
    });

    it('shows the MPN when provided', () => {
      render(<PartCard part={basePart} />);
      expect(screen.getByText('MPN: ESP32-WROOM-32D')).toBeInTheDocument();
    });

    it('does not show MPN row when mpn is null', () => {
      render(<PartCard part={{ ...basePart, mpn: null }} />);
      expect(screen.queryByText(/MPN:/)).not.toBeInTheDocument();
    });

    it('shows the manufacturer when provided', () => {
      render(<PartCard part={basePart} />);
      expect(screen.getByText('Espressif')).toBeInTheDocument();
    });

    it('does not show manufacturer when null', () => {
      render(<PartCard part={{ ...basePart, manufacturer: null }} />);
      expect(screen.queryByText('Espressif')).not.toBeInTheDocument();
    });

    it('renders a category badge when category is provided', () => {
      render(<PartCard part={basePart} />);
      expect(screen.getByText('Microcontrollers')).toBeInTheDocument();
    });

    it('does not render a category badge when category is null', () => {
      render(<PartCard part={{ ...basePart, category: null }} />);
      expect(screen.queryByText('Microcontrollers')).not.toBeInTheDocument();
    });
  });

  describe('tags', () => {
    it('renders all tags when 4 or fewer', () => {
      render(<PartCard part={basePart} />);
      expect(screen.getByText('wifi')).toBeInTheDocument();
      expect(screen.getByText('ble')).toBeInTheDocument();
    });

    it('shows up to 4 tags and adds overflow badge for extras', () => {
      const part = { ...basePart, tags: ['a', 'b', 'c', 'd', 'e'] };
      render(<PartCard part={part} />);
      expect(screen.getByText('a')).toBeInTheDocument();
      expect(screen.getByText('d')).toBeInTheDocument();
      expect(screen.queryByText('e')).not.toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('stock display', () => {
    it('shows exact stock quantity when totalQuantity > 0', () => {
      render(<PartCard part={basePart} />);
      expect(screen.getByText('10 in stock')).toBeInTheDocument();
    });

    it('shows "No stock" when totalQuantity is 0', () => {
      render(<PartCard part={{ ...basePart, totalQuantity: 0 }} />);
      expect(screen.getByText('No stock')).toBeInTheDocument();
    });

    it('shows qualitative status when present', () => {
      const part = { ...basePart, totalQuantity: 0, qualitativeStatuses: ['plenty'] };
      render(<PartCard part={part} />);
      expect(screen.getByText('plenty')).toBeInTheDocument();
    });
  });

  describe('archived state', () => {
    it('shows Archived badge for archived parts', () => {
      render(<PartCard part={{ ...basePart, archivedAt: '2024-06-01T00:00:00Z' }} />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('does not show Archived badge for non-archived parts', () => {
      render(<PartCard part={basePart} />);
      expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    });

    it('applies opacity-60 class for archived parts', () => {
      const { container } = render(
        <PartCard part={{ ...basePart, archivedAt: '2024-06-01T00:00:00Z' }} />
      );
      expect(container.firstChild).toHaveClass('opacity-60');
    });

    it('does not apply opacity-60 class for non-archived parts', () => {
      const { container } = render(<PartCard part={basePart} />);
      expect(container.firstChild).not.toHaveClass('opacity-60');
    });
  });

  describe('theme classes (CSS variable substitution)', () => {
    it('uses bg-card on the card container instead of bg-white', () => {
      const { container } = render(<PartCard part={basePart} />);
      const link = container.firstChild as HTMLElement;
      expect(link.className).toContain('bg-card');
      expect(link.className).not.toContain('bg-white');
    });

    it('uses text-foreground for part name instead of text-gray-900', () => {
      render(<PartCard part={basePart} />);
      const heading = screen.getByText('ESP32-WROOM-32');
      expect(heading.className).toContain('text-foreground');
      expect(heading.className).not.toContain('text-gray-900');
    });

    it('uses text-muted-foreground for MPN instead of text-gray-600', () => {
      render(<PartCard part={basePart} />);
      const mpnEl = screen.getByText('MPN: ESP32-WROOM-32D');
      expect(mpnEl.className).toContain('text-muted-foreground');
      expect(mpnEl.className).not.toContain('text-gray-600');
    });

    it('uses text-muted-foreground for "No stock" instead of hardcoded gray', () => {
      render(<PartCard part={{ ...basePart, totalQuantity: 0 }} />);
      const noStockEl = screen.getByText('No stock');
      expect(noStockEl.className).toContain('text-muted-foreground');
    });
  });
});
