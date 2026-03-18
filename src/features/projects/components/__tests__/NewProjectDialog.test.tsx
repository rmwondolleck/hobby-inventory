/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── UI component mocks ──────────────────────────────────────────────────────

jest.mock('@/components/ui/dialog', () => ({
  // Always render children so the trigger button is visible; mark open state with data-open
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) => (
    <div data-testid="dialog" data-open={open ? 'true' : 'false'}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    (props, ref) => <textarea ref={ref} {...props} data-testid="textarea" />,
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

// ── Import component under test AFTER mocks ─────────────────────────────────
// We test via a thin wrapper that exposes only the sub-component we care about.
// Because NewProjectDialog is not exported we render ProjectsListClient and
// locate the "+ New Project" button it injects.

// Mock the heavy list-fetching so the component renders without a server.
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Suppress noisy console.error from react-hook-form validation.
const originalError = console.error;
beforeAll(() => { console.error = jest.fn(); });
afterAll(() => { console.error = originalError; });

// Minimal mock for next/link used by ProjectCard (pulled in by ProjectsListClient)
jest.mock('next/link', () => {
  const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  Link.displayName = 'MockLink';
  return Link;
});

import { ProjectsListClient } from '../ProjectsListClient';

// Helper: simulate a successful list fetch so the component reaches steady state
function mockListFetchOk(projects: object[] = []) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: projects, total: projects.length, page: 1, pageSize: 20 }),
  } as Response);
}

async function renderAndOpenDialog() {
  mockListFetchOk();
  render(<ProjectsListClient />);
  // The button is always rendered (outside the loading conditional)
  const openBtn = await screen.findByRole('button', { name: /\+ new project/i });
  await act(async () => { fireEvent.click(openBtn); });
  return openBtn;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('NewProjectDialog – button visibility', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('renders the "+ New Project" button', async () => {
    mockListFetchOk();
    render(<ProjectsListClient />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ new project/i })).toBeInTheDocument(),
    );
  });
});

describe('NewProjectDialog – dialog open / close', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('opens dialog when "+ New Project" is clicked', async () => {
    await renderAndOpenDialog();
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('heading', { name: /new project/i })).toBeInTheDocument();
  });

  it('closes dialog when Cancel is clicked', async () => {
    await renderAndOpenDialog();
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await act(async () => { fireEvent.click(cancelBtn); });
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false');
  });
});

describe('NewProjectDialog – form validation', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('shows validation error when name is empty on submit', async () => {
    await renderAndOpenDialog();
    const submitBtn = screen.getByRole('button', { name: /create project/i });
    await act(async () => { fireEvent.click(submitBtn); });
    await waitFor(() =>
      expect(screen.getByText(/name is required/i)).toBeInTheDocument(),
    );
  });

  it('does not call fetch when name is empty', async () => {
    mockFetch.mockReset();
    mockListFetchOk();
    render(<ProjectsListClient />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ new project/i })).toBeInTheDocument(),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /\+ new project/i }));
    });
    mockFetch.mockReset(); // reset so we can detect any unexpected calls
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });
    await waitFor(() => expect(screen.getByText(/name is required/i)).toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('NewProjectDialog – successful submission', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('calls POST /api/projects with correct payload and closes dialog on success', async () => {
    await renderAndOpenDialog();

    const createdProject = {
      id: 'new-proj-1',
      name: 'My New Project',
      status: 'idea',
      tags: ['rc'],
      notes: null,
      wishlistNotes: null,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      allocationCount: 0,
      allocationsByStatus: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: createdProject }),
    } as Response);

    const nameInput = screen.getByPlaceholderText(/rc car build/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'My New Project' } });
    });

    const tagsInput = screen.getByPlaceholderText(/rc, electronics/i);
    await act(async () => {
      fireEvent.change(tagsInput, { target: { value: 'rc' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });

    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false'));

    const postCall = mockFetch.mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/projects' && opts?.method === 'POST',
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1].body as string);
    expect(body.name).toBe('My New Project');
    expect(body.tags).toEqual(['rc']);
    expect(body.status).toBe('idea');
  });

  it('prepends the new project to the list on success', async () => {
    const existingProject = {
      id: 'existing-1',
      name: 'Existing Project',
      status: 'active',
      tags: [],
      notes: null,
      wishlistNotes: null,
      archivedAt: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      allocationCount: 0,
      allocationsByStatus: {},
    };

    mockFetch.mockReset();
    mockListFetchOk([existingProject]);
    render(<ProjectsListClient />);
    await waitFor(() =>
      expect(screen.getByText('Existing Project')).toBeInTheDocument(),
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /\+ new project/i }));
    });

    const newProject = {
      id: 'new-1',
      name: 'Brand New Project',
      status: 'idea',
      tags: [],
      notes: null,
      wishlistNotes: null,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      allocationCount: 0,
      allocationsByStatus: {},
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newProject }),
    } as Response);

    const nameInput = screen.getByPlaceholderText(/rc car build/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Brand New Project' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });

    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false'));
    expect(screen.getByText('Brand New Project')).toBeInTheDocument();
    expect(screen.getByText('Existing Project')).toBeInTheDocument();
  });
});

describe('NewProjectDialog – API error handling', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('displays inline error message when API returns non-ok response', async () => {
    await renderAndOpenDialog();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Name already taken' }),
    } as Response);

    const nameInput = screen.getByPlaceholderText(/rc car build/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Duplicate Project' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });

    await waitFor(() =>
      expect(screen.getByText('Name already taken')).toBeInTheDocument(),
    );
    // Dialog should remain open
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true');
  });

  it('displays fallback error message when API error body is not parseable', async () => {
    await renderAndOpenDialog();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => { throw new Error('bad json'); },
    } as unknown as Response);

    const nameInput = screen.getByPlaceholderText(/rc car build/i);
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Some Project' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });

    await waitFor(() =>
      expect(screen.getByText(/failed to create project/i)).toBeInTheDocument(),
    );
  });
});

describe('NewProjectDialog – tag parsing', () => {
  it('splits comma-separated tags and trims whitespace', async () => {
    mockFetch.mockReset();
    await renderAndOpenDialog();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'p1', name: 'Tag Test', status: 'idea', tags: ['rc', 'robot', 'servo'],
          notes: null, wishlistNotes: null, archivedAt: null,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
          allocationCount: 0, allocationsByStatus: {},
        },
      }),
    } as Response);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/rc car build/i), { target: { value: 'Tag Test' } });
      fireEvent.change(screen.getByPlaceholderText(/rc, electronics/i), { target: { value: ' rc , robot , servo ' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });

    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false'));

    const postCall = mockFetch.mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/projects' && opts?.method === 'POST',
    );
    const body = JSON.parse(postCall![1].body as string);
    expect(body.tags).toEqual(['rc', 'robot', 'servo']);
  });

  it('sends empty tags array when tags field is blank', async () => {
    mockFetch.mockReset();
    await renderAndOpenDialog();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'p2', name: 'No Tags', status: 'idea', tags: [],
          notes: null, wishlistNotes: null, archivedAt: null,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
          allocationCount: 0, allocationsByStatus: {},
        },
      }),
    } as Response);

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/rc car build/i), { target: { value: 'No Tags' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    });

    await waitFor(() => expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false'));

    const postCall = mockFetch.mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/projects' && opts?.method === 'POST',
    );
    const body = JSON.parse(postCall![1].body as string);
    expect(body.tags).toEqual([]);
  });
});
