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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

const basePart: PartListItem = {
  id: 'part-1',
  name: 'Resistor 10k',
  mpn: 'RES-10K',
  manufacturer: 'Yageo',
  category: 'Resistors',
  description: null,
  tags: [],
  parameters: '{}',
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  totalQuantity: 100,
  availableQuantity: 85,
  reservedQuantity: 10,
  inUseQuantity: 5,
  scrappedQuantity: 0,
  qualitativeStatuses: [],
  lotCount: 2,
};

describe('PartCard', () => {
  it('renders part name', () => {
    render(<PartCard part={basePart} />);
    expect(screen.getByText('Resistor 10k')).toBeInTheDocument();
  });

  it('links to the correct part detail URL', () => {
    render(<PartCard part={basePart} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/parts/part-1');
  });

  it('shows availableQuantity with "available" label when exact stock exists', () => {
    render(<PartCard part={basePart} />);
    expect(screen.getByText('85 available')).toBeInTheDocument();
  });

  it('shows "No stock" when totalQuantity is 0 and no qualitative stock', () => {
    render(
      <PartCard
        part={{
          ...basePart,
          totalQuantity: 0,
          availableQuantity: 0,
          qualitativeStatuses: [],
        }}
      />,
    );
    expect(screen.getByText('No stock')).toBeInTheDocument();
  });

  it('shows qualitative status when qualitativeStatuses is non-empty', () => {
    render(
      <PartCard
        part={{
          ...basePart,
          totalQuantity: 0,
          availableQuantity: 0,
          qualitativeStatuses: ['plenty'],
        }}
      />,
    );
    expect(screen.getByText('plenty')).toBeInTheDocument();
    expect(screen.queryByText('No stock')).not.toBeInTheDocument();
  });

  it('shows availableQuantity of 0 as "No stock" when no qualitative stock', () => {
    render(
      <PartCard
        part={{
          ...basePart,
          totalQuantity: 10,
          availableQuantity: 0,
          reservedQuantity: 5,
          inUseQuantity: 5,
          qualitativeStatuses: [],
        }}
      />,
    );
    // totalQuantity > 0 so hasExactStock is true — shows 0 available
    expect(screen.getByText('0 available')).toBeInTheDocument();
  });

  it('renders MPN when provided', () => {
    render(<PartCard part={basePart} />);
    expect(screen.getByText('MPN: RES-10K')).toBeInTheDocument();
  });

  it('does not render MPN section when mpn is null', () => {
    render(<PartCard part={{ ...basePart, mpn: null }} />);
    expect(screen.queryByText(/MPN:/)).not.toBeInTheDocument();
  });

  it('renders manufacturer when provided', () => {
    render(<PartCard part={basePart} />);
    expect(screen.getByText('Yageo')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<PartCard part={{ ...basePart, tags: ['smd', 'passive'] }} />);
    expect(screen.getByText('smd')).toBeInTheDocument();
    expect(screen.getByText('passive')).toBeInTheDocument();
  });

  it('shows overflow badge when more than 4 tags', () => {
    render(
      <PartCard
        part={{ ...basePart, tags: ['t1', 't2', 't3', 't4', 't5', 't6'] }}
      />,
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('t5')).not.toBeInTheDocument();
  });

  it('shows Archived badge for archived parts', () => {
    render(
      <PartCard
        part={{ ...basePart, archivedAt: '2024-06-01T00:00:00Z' }}
      />,
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('does not show Archived badge for non-archived parts', () => {
    render(<PartCard part={basePart} />);
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });

  it('applies opacity class for archived parts', () => {
    const { container } = render(
      <PartCard part={{ ...basePart, archivedAt: '2024-06-01T00:00:00Z' }} />,
    );
    const link = container.firstChild as HTMLElement;
    expect(link.className).toContain('opacity-60');
  });

  it('does not apply opacity class for non-archived parts', () => {
    const { container } = render(<PartCard part={basePart} />);
    const link = container.firstChild as HTMLElement;
    expect(link.className).not.toContain('opacity-60');
  });
});
