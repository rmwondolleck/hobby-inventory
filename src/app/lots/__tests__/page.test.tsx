/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock prisma before importing the page
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    part: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    location: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('@/features/lots/components/LotCard', () => ({
  LotCard: ({ lot }: { lot: { id: string } }) => (
    <div data-testid={`lot-card-${lot.id}`} />
  ),
}));

jest.mock('@/features/lots/components/LotFilterForm', () => ({
  LotFilterForm: () => <div data-testid="lot-filter-form" />,
}));

jest.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

import LotsPage from '../page';

async function renderLotsPage(searchParams: Record<string, string> = {}) {
  const page = await LotsPage({ searchParams: Promise.resolve(searchParams) });
  return render(page as React.ReactElement);
}

describe('LotsPage', () => {
  it('renders the "Lots" heading', async () => {
    await renderLotsPage();
    expect(screen.getByRole('heading', { name: /lots/i })).toBeInTheDocument();
  });

  it('renders 0 lots found description when no lots exist', async () => {
    await renderLotsPage();
    expect(screen.getByText(/0 lots found/i)).toBeInTheDocument();
  });

  it('renders the LotFilterForm', async () => {
    await renderLotsPage();
    expect(screen.getByTestId('lot-filter-form')).toBeInTheDocument();
  });

  it('renders empty state message when no lots match', async () => {
    await renderLotsPage();
    expect(screen.getByText(/no lots found/i)).toBeInTheDocument();
  });

  it('renders lot cards when lots are returned', async () => {
    const prisma = require('@/lib/db').default;
    const fakeLots = [
      {
        id: 'lot001',
        partId: 'part001',
        locationId: null,
        quantity: 5,
        status: 'in_stock',
        source: '{}',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        part: { id: 'part001', name: 'ESP32', category: 'MCU' },
        location: null,
      },
    ];
    prisma.lot.findMany.mockResolvedValueOnce(fakeLots);
    prisma.lot.count.mockResolvedValueOnce(1);

    await renderLotsPage();
    expect(screen.getByTestId('lot-card-lot001')).toBeInTheDocument();
  });

  it('shows singular "1 lot found" description for exactly one lot', async () => {
    const prisma = require('@/lib/db').default;
    const fakeLots = [
      {
        id: 'lot002',
        partId: 'part001',
        locationId: null,
        quantity: 1,
        status: 'in_stock',
        source: '{}',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        part: { id: 'part001', name: 'Resistor', category: 'Passive' },
        location: null,
      },
    ];
    prisma.lot.findMany.mockResolvedValueOnce(fakeLots);
    prisma.lot.count.mockResolvedValueOnce(1);

    await renderLotsPage();
    expect(screen.getByText('1 lot found')).toBeInTheDocument();
  });

  it('passes staleSince filter to Prisma query when staleSince param is present', async () => {
    const prisma = require('@/lib/db').default;
    const staleSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    prisma.lot.findMany.mockClear();
    prisma.lot.count.mockClear();
    prisma.lot.findMany.mockResolvedValueOnce([]);
    prisma.lot.count.mockResolvedValueOnce(0);

    await renderLotsPage({ staleSince });

    const findManyCall = prisma.lot.findMany.mock.calls[0][0];
    expect(findManyCall.where).toHaveProperty('AND');
    expect(JSON.stringify(findManyCall.where.AND)).toContain('events');
  });

  it('does not include AND filter when staleSince param is absent', async () => {
    const prisma = require('@/lib/db').default;
    prisma.lot.findMany.mockClear();
    prisma.lot.count.mockClear();
    prisma.lot.findMany.mockResolvedValueOnce([]);
    prisma.lot.count.mockResolvedValueOnce(0);

    await renderLotsPage();

    const findManyCall = prisma.lot.findMany.mock.calls[0][0];
    expect(findManyCall.where).not.toHaveProperty('AND');
  });
});
