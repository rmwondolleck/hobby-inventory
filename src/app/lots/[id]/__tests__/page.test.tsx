/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Prisma mock ──────────────────────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    lot: {
      findUnique: jest.fn(),
    },
    location: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// ── Next.js mocks ─────────────────────────────────────────────────────────────
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// ── Feature component mocks ───────────────────────────────────────────────────
jest.mock('@/features/lots/components/LotStatusBadge', () => ({
  LotStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="lot-status-badge">{status}</span>
  ),
}));

jest.mock('@/features/lots/components/LotActionsPanel', () => ({
  LotActionsPanel: () => <div data-testid="lot-actions-panel" />,
}));

jest.mock('@/features/lots/components/AllocationActions', () => ({
  AllocationActions: () => <div data-testid="allocation-actions" />,
}));

jest.mock('@/components/EventTimeline', () => ({
  EventTimeline: ({ events }: { events: unknown[] }) => (
    <div data-testid="event-timeline">{events.length} events</div>
  ),
}));

import LotDetailPage from '../page';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeLot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lot-abc',
    partId: 'part-001',
    quantity: 10,
    quantityMode: 'exact',
    qualitativeStatus: null,
    status: 'in_stock',
    unit: 'pcs',
    locationId: null,
    location: null,
    notes: null,
    source: '{}',
    receivedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    part: { id: 'part-001', name: 'ESP32', category: 'MCU' },
    allocations: [],
    events: [],
    ...overrides,
  };
}

async function renderPage(lot: ReturnType<typeof makeLot>) {
  const prisma = require('@/lib/db').default;
  prisma.lot.findUnique.mockResolvedValueOnce(lot);
  const page = await LotDetailPage({ params: Promise.resolve({ id: lot.id }) });
  return render(page as React.ReactElement);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LotDetailPage', () => {
  describe('semantic CSS token classes (dark-mode tokens, no hardcoded colours)', () => {
    it('renders the page wrapper with bg-background, not bg-gray-50', async () => {
      const { container } = await renderPage(makeLot());
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('bg-background');
      expect(wrapper.className).not.toContain('bg-gray-50');
    });

    it('renders breadcrumb nav with text-muted-foreground, not text-gray-500', async () => {
      const { container } = await renderPage(makeLot());
      const nav = container.querySelector('nav');
      expect(nav?.className).toContain('text-muted-foreground');
      expect(nav?.className).not.toContain('text-gray-500');
    });

    it('renders page heading with text-foreground, not text-gray-900', async () => {
      const { container } = await renderPage(makeLot());
      const h1 = container.querySelector('h1');
      expect(h1?.className).toContain('text-foreground');
      expect(h1?.className).not.toContain('text-gray-900');
    });

    it('renders section cards with bg-card, not bg-white', async () => {
      const { container } = await renderPage(makeLot());
      const sections = container.querySelectorAll('section');
      sections.forEach(section => {
        expect(section.className).toContain('bg-card');
        expect(section.className).not.toContain('bg-white');
      });
    });

    it('renders section headings with text-card-foreground, not text-gray-900', async () => {
      const { container } = await renderPage(makeLot());
      const h2s = container.querySelectorAll('h2');
      h2s.forEach(h2 => {
        expect(h2.className).toContain('text-card-foreground');
        expect(h2.className).not.toContain('text-gray-900');
      });
    });
  });

  describe('rendering content', () => {
    it('renders the part name as the page heading', async () => {
      await renderPage(makeLot({ part: { id: 'part-001', name: 'Capacitor 100µF', category: 'Passive' } }));
      expect(screen.getAllByText('Capacitor 100µF').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the lot status badge', async () => {
      await renderPage(makeLot());
      expect(screen.getByTestId('lot-status-badge')).toBeInTheDocument();
    });

    it('renders the actions panel', async () => {
      await renderPage(makeLot());
      expect(screen.getByTestId('lot-actions-panel')).toBeInTheDocument();
    });

    it('renders the event timeline', async () => {
      await renderPage(makeLot());
      expect(screen.getByTestId('event-timeline')).toBeInTheDocument();
    });

    it('shows category under the heading when present', async () => {
      await renderPage(makeLot({ part: { id: 'part-001', name: 'ESP32', category: 'MCU' } }));
      const catEl = screen.getByText('MCU');
      expect(catEl.className).toContain('text-muted-foreground');
      expect(catEl.className).not.toContain('text-gray-500');
    });

    it('does not render category paragraph when category is null', async () => {
      await renderPage(makeLot({ part: { id: 'part-001', name: 'Unknown', category: null } }));
      // category paragraph would contain 'null' text — it simply shouldn't appear
      expect(screen.queryByText('null')).not.toBeInTheDocument();
    });

    it('renders notes section with semantic tokens when notes are present', async () => {
      const { container } = await renderPage(makeLot({ notes: 'Handle with care' }));
      expect(screen.getByText('Handle with care')).toBeInTheDocument();
      const notesPara = container.querySelector('p.text-foreground');
      expect(notesPara).not.toBeNull();
    });

    it('does not render notes section when notes are absent', async () => {
      await renderPage(makeLot({ notes: null }));
      expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    });
  });

  describe('Source section', () => {
    it('renders source section when source data is present', async () => {
      await renderPage(
        makeLot({ source: JSON.stringify({ type: 'amazon', seller: 'Acme', unitCost: 1.5, currency: '$' }) })
      );
      expect(screen.getByText('Lot Details')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
    });

    it('renders human-readable store label for known source types', async () => {
      await renderPage(makeLot({ source: JSON.stringify({ type: 'digikey' }) }));
      expect(screen.getByText('DigiKey')).toBeInTheDocument();
    });

    it('does not render source section when source is empty', async () => {
      await renderPage(makeLot({ source: '{}' }));
      expect(screen.queryByText('Source')).not.toBeInTheDocument();
    });

    it('renders safe external URL as a re-order link', async () => {
      const { container } = await renderPage(
        makeLot({ source: JSON.stringify({ url: 'https://www.digikey.com/product/123' }) })
      );
      const link = container.querySelector('a[href="https://www.digikey.com/product/123"]');
      expect(link).not.toBeNull();
      expect(link?.textContent).toContain('Re-order');
    });

    it('does not render re-order link for unsafe (javascript:) URLs', async () => {
      // eslint-disable-next-line no-script-url
      await renderPage(makeLot({ source: JSON.stringify({ url: 'javascript:alert(1)' }) }));
      expect(screen.queryByText(/re-order/i)).not.toBeInTheDocument();
    });
  });

  describe('Allocations section', () => {
    it('renders allocations section when allocations are present', async () => {
      const allocations = [
        {
          id: 'alloc-1',
          quantity: 5,
          status: 'reserved',
          notes: null,
          project: { id: 'proj-1', name: 'Robot Arm', status: 'active' },
        },
      ];
      await renderPage(makeLot({ allocations }));
      expect(screen.getByText('Allocations (1)')).toBeInTheDocument();
    });

    it('renders allocation notes with text-muted-foreground, not text-gray-500', async () => {
      const allocations = [
        {
          id: 'alloc-2',
          quantity: 3,
          status: 'in_use',
          notes: 'Allocated for motor driver',
          project: { id: 'proj-1', name: 'Robot Arm', status: 'active' },
        },
      ];
      await renderPage(makeLot({ allocations }));
      const notesPara = screen.getByText('Allocated for motor driver');
      expect(notesPara.className).toContain('text-muted-foreground');
      expect(notesPara.className).not.toContain('text-gray-500');
    });

    it('renders recovered allocation with bg-muted text-muted-foreground, not bg-gray-100 text-gray-800', async () => {
      const allocations = [
        {
          id: 'alloc-3',
          quantity: 2,
          status: 'recovered',
          notes: null,
          project: { id: 'proj-1', name: 'Robot Arm', status: 'active' },
        },
      ];
      const { container } = await renderPage(makeLot({ allocations }));
      const badge = container.querySelector('span.bg-muted.text-muted-foreground');
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toContain('recovered');
    });

    it('does not render allocations section when there are none', async () => {
      await renderPage(makeLot({ allocations: [] }));
      expect(screen.queryByText(/^Allocations/)).not.toBeInTheDocument();
    });
  });

  describe('Event history heading', () => {
    it('renders "History" heading when there are no events', async () => {
      await renderPage(makeLot({ events: [] }));
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('renders "History (N)" when fewer than 50 events exist', async () => {
      const events = Array.from({ length: 3 }, (_, i) => ({
        id: `ev-${i}`,
        type: 'adjust',
        delta: 1,
        notes: null,
        createdAt: new Date(),
        fromLocationId: null,
        toLocationId: null,
        projectId: null,
      }));
      await renderPage(makeLot({ events }));
      expect(screen.getByText('History (3)')).toBeInTheDocument();
    });

    it('renders "History (most recent 50)" heading when exactly 50 events are returned', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        id: `ev-${i}`,
        type: 'adjust',
        delta: 1,
        notes: null,
        createdAt: new Date(),
        fromLocationId: null,
        toLocationId: null,
        projectId: null,
      }));
      await renderPage(makeLot({ events }));
      expect(screen.getByText('History (most recent 50)')).toBeInTheDocument();
    });
  });

  describe('notFound behaviour', () => {
    it('calls notFound() when lot does not exist in the database', async () => {
      const prisma = require('@/lib/db').default;
      prisma.lot.findUnique.mockResolvedValueOnce(null);
      await expect(
        LotDetailPage({ params: Promise.resolve({ id: 'missing-id' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND');
    });
  });
});
