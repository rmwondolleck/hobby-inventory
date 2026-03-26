/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventTimeline } from '../EventTimeline';
import type { TimelineEvent } from '../EventTimeline';

// Mock next/link
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  PackagePlus: ({ className }: { className?: string }) => (
    <svg data-testid="icon-package-plus" className={className} />
  ),
  PackageCheck: ({ className }: { className?: string }) => (
    <svg data-testid="icon-package-check" className={className} />
  ),
  MoveRight: ({ className }: { className?: string }) => (
    <svg data-testid="icon-move-right" className={className} />
  ),
  Bookmark: ({ className }: { className?: string }) => (
    <svg data-testid="icon-bookmark" className={className} />
  ),
  Wrench: ({ className }: { className?: string }) => (
    <svg data-testid="icon-wrench" className={className} />
  ),
  Undo2: ({ className }: { className?: string }) => (
    <svg data-testid="icon-undo2" className={className} />
  ),
  HelpCircle: ({ className }: { className?: string }) => (
    <svg data-testid="icon-help-circle" className={className} />
  ),
  Trash2: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trash2" className={className} />
  ),
  Pencil: ({ className }: { className?: string }) => (
    <svg data-testid="icon-pencil" className={className} />
  ),
  Circle: ({ className }: { className?: string }) => (
    <svg data-testid="icon-circle" className={className} />
  ),
}));

// Mock @/lib/utils cn
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'evt-1',
    type: 'received',
    delta: null,
    notes: null,
    createdAt: '2024-06-01T10:00:00.000Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EventTimeline — empty state', () => {
  it('renders "No history yet." when events is empty', () => {
    render(<EventTimeline events={[]} />);
    expect(screen.getByText('No history yet.')).toBeInTheDocument();
  });
});

describe('EventTimeline — single event rendering', () => {
  it('renders the event type label', () => {
    render(<EventTimeline events={[makeEvent({ type: 'received' })]} />);
    expect(screen.getByText('Received')).toBeInTheDocument();
  });

  it('renders "—" for null delta', () => {
    render(<EventTimeline events={[makeEvent({ delta: null })]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders a green "+N" for positive delta', () => {
    render(<EventTimeline events={[makeEvent({ delta: 5 })]} />);
    const badge = screen.getByText('+5');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/green/);
  });

  it('renders a red "-N" for negative delta', () => {
    render(<EventTimeline events={[makeEvent({ delta: -3 })]} />);
    const badge = screen.getByText('-3');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/red/);
  });

  it('renders event notes when present', () => {
    render(<EventTimeline events={[makeEvent({ notes: 'Restocked from supplier' })]} />);
    expect(screen.getByText('Restocked from supplier')).toBeInTheDocument();
  });

  it('does not render a notes element when notes is null', () => {
    render(<EventTimeline events={[makeEvent({ notes: null })]} />);
    expect(screen.queryByText('Restocked from supplier')).not.toBeInTheDocument();
  });
});

describe('EventTimeline — moved event', () => {
  it('shows "from → to" breadcrumb when both locations are present', () => {
    render(
      <EventTimeline
        events={[
          makeEvent({
            type: 'moved',
            fromLocation: { name: 'Shelf A', path: 'Office/Shelf A' },
            toLocation: { name: 'Drawer 2', path: 'Office/Shelf A/Drawer 2' },
          }),
        ]}
      />,
    );
    expect(screen.getByText(/Office\/Shelf A/)).toBeInTheDocument();
    expect(screen.getByText(/Office\/Shelf A → Office\/Shelf A\/Drawer 2/)).toBeInTheDocument();
  });

  it('does not render location breadcrumb when locations are absent', () => {
    render(
      <EventTimeline
        events={[
          makeEvent({
            type: 'moved',
            fromLocation: null,
            toLocation: null,
          }),
        ]}
      />,
    );
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });
});

describe('EventTimeline — allocated event', () => {
  it('renders a project link when projectId is set', () => {
    render(
      <EventTimeline
        events={[makeEvent({ type: 'allocated', projectId: 'proj-abc' })]}
      />,
    );
    const link = screen.getByRole('link', { name: /project/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/projects/proj-abc');
  });

  it('does not render a project link when projectId is null', () => {
    render(
      <EventTimeline
        events={[makeEvent({ type: 'allocated', projectId: null })]}
      />,
    );
    expect(screen.queryByRole('link', { name: /project/i })).not.toBeInTheDocument();
  });
});

describe('EventTimeline — multiple events', () => {
  it('renders one row per event', () => {
    const events: TimelineEvent[] = [
      makeEvent({ id: 'e1', type: 'created', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeEvent({ id: 'e2', type: 'received', createdAt: '2024-01-02T00:00:00.000Z' }),
      makeEvent({ id: 'e3', type: 'scrapped', createdAt: '2024-01-03T00:00:00.000Z' }),
    ];
    render(<EventTimeline events={events} />);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Received')).toBeInTheDocument();
    expect(screen.getByText('Scrapped')).toBeInTheDocument();
  });
});

describe('EventTimeline — unknown event type', () => {
  it('renders an unknown type using the raw type string', () => {
    render(<EventTimeline events={[makeEvent({ type: 'custom_type' })]} />);
    expect(screen.getByText('custom type')).toBeInTheDocument();
  });
});
