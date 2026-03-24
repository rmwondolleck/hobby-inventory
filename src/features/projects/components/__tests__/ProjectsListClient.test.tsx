/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProjectsListClient } from '../ProjectsListClient';
import type { ProjectListItem } from '../../types';

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

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="status-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

jest.mock('../ProjectCard', () => ({
  ProjectCard: ({ project }: { project: ProjectListItem }) => (
    <div data-testid="project-card">{project.name}</div>
  ),
}));

const makeProject = (overrides?: Partial<ProjectListItem>): ProjectListItem => ({
  id: 'proj-1',
  name: 'Robot Arm',
  status: 'active',
  tags: ['robot'],
  notes: null,
  wishlistNotes: null,
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  allocationCount: 0,
  allocationsByStatus: {},
  ...overrides,
});

describe('ProjectsListClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project cards from API response', async () => {
    const projects = [
      makeProject({ id: 'p1', name: 'Robot Arm' }),
      makeProject({ id: 'p2', name: 'LED Matrix' }),
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: projects, total: 2 }),
    });

    await act(async () => {
      render(<ProjectsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('Robot Arm')).toBeInTheDocument();
      expect(screen.getByText('LED Matrix')).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects returned', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(<ProjectsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText('No projects yet.')).toBeInTheDocument();
    });
  });

  it('shows filter empty state when filters are active', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(<ProjectsListClient />);
    });

    // Click the 'Active' status filter button to set a status filter
    const activeButton = screen.getByRole('button', { name: 'Active' });
    await act(async () => {
      fireEvent.click(activeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('No projects match your filters.')).toBeInTheDocument();
    });
  });

  it('filters by status by calling API with status param', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    });

    await act(async () => {
      render(<ProjectsListClient />);
    });

    const activeButton = screen.getByRole('button', { name: 'Active' });
    await act(async () => {
      fireEvent.click(activeButton);
    });

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls as [string][];
      const filteredCall = calls.find(([url]) => url.includes('status=active'));
      expect(filteredCall).toBeDefined();
    });
  });

  it('shows project count in results summary', async () => {
    const projects = [makeProject({ id: 'p1', name: 'Project One' })];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: projects, total: 1 }),
    });

    await act(async () => {
      render(<ProjectsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/1 project/)).toBeInTheDocument();
    });
  });

  it('shows error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await act(async () => {
      render(<ProjectsListClient />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch projects/)).toBeInTheDocument();
    });
  });
});
