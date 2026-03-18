/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ProjectDetailClient } from '../ProjectDetailClient';
import type { ProjectDetail } from '../../types';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type ?? 'button'}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (v: string) => void;
  }) => (
    <select
      data-testid="status-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

// ─── Test Data ────────────────────────────────────────────────────────────────

const baseProject: ProjectDetail = {
  id: 'proj-1',
  name: 'Robot Arm',
  status: 'active',
  tags: ['robot', 'servo'],
  notes: 'Building a robotic arm',
  wishlistNotes: null,
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  allocationCount: 0,
  allocationsByStatus: {},
  allocations: [],
  events: [],
};

function mockFetchProject(project: ProjectDetail) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data: project }),
  } as unknown as Response);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function renderAndWait(id = 'proj-1', project = baseProject) {
  mockFetchProject(project);
  render(<ProjectDetailClient id={id} />);
  await waitFor(() => expect(screen.getByText(project.name)).toBeInTheDocument());
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProjectDetailClient — loading and error states', () => {
  it('shows a loading skeleton while fetching', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    const { container } = render(<ProjectDetailClient id="proj-1" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows a not-found message for 404', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() =>
      expect(screen.getByText('Project not found.')).toBeInTheDocument()
    );
  });

  it('shows an error message when fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response);
    render(<ProjectDetailClient id="proj-1" />);
    await waitFor(() =>
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    );
  });
});

describe('ProjectDetailClient — project header buttons', () => {
  it('renders Edit Project and Archive Project buttons for non-archived project', async () => {
    await renderAndWait();
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive Project' })).toBeInTheDocument();
  });

  it('disables Edit and Archive buttons when project is already archived', async () => {
    await renderAndWait('proj-1', {
      ...baseProject,
      archivedAt: '2024-06-01T00:00:00Z',
    });
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Archive Project' })).toBeDisabled();
  });

  it('shows Back to projects link', async () => {
    await renderAndWait();
    expect(screen.getByRole('link', { name: /Back to projects/ })).toHaveAttribute(
      'href',
      '/projects'
    );
  });
});

describe('ProjectDetailClient — archive behaviour', () => {
  it('calls DELETE on /api/projects/:id and redirects on success', async () => {
    await renderAndWait();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as unknown as Response);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Archive Project' }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/proj-1',
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(mockPush).toHaveBeenCalledWith('/projects');
    });
  });

  it('shows archive error message when DELETE fails', async () => {
    await renderAndWait();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Cannot archive' }),
    } as unknown as Response);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Archive Project' }));
    });

    await waitFor(() =>
      expect(screen.getByText('Cannot archive')).toBeInTheDocument()
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows generic archive error when response has no error field', async () => {
    await renderAndWait();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as unknown as Response);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Archive Project' }));
    });

    await waitFor(() =>
      expect(screen.getByText('Failed to archive project')).toBeInTheDocument()
    );
  });
});

describe('ProjectDetailClient — Edit Project dialog', () => {
  it('opens the Edit Project dialog when the Edit button is clicked', async () => {
    await renderAndWait();

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit Project' })).toBeInTheDocument();
  });

  it('pre-fills the name input with the project name', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Robot Arm');
  });

  it('pre-fills tags as comma-separated string', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const tagsInput = screen.getByLabelText('Tags') as HTMLInputElement;
    expect(tagsInput.value).toBe('robot, servo');
  });

  it('pre-fills notes when notes is set', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const notesArea = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    expect(notesArea.value).toBe('Building a robotic arm');
  });

  it('closes the dialog when Cancel is clicked', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('sends only changed fields on PATCH', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    // Change only the name
    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Robot Arm v2' } });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...baseProject, name: 'Robot Arm v2' } }),
    } as unknown as Response);

    await act(async () => {
      fireEvent.submit(nameInput.closest('form')!);
    });

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([_url, opts]) => opts?.method === 'PATCH'
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1].body as string);
      expect(body).toEqual({ name: 'Robot Arm v2' });
      expect(body.tags).toBeUndefined();
      expect(body.notes).toBeUndefined();
    });
  });

  it('parses comma-separated tags to array on submit', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const tagsInput = screen.getByLabelText('Tags') as HTMLInputElement;
    fireEvent.change(tagsInput, { target: { value: 'arduino, led, motor' } });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { ...baseProject, tags: ['arduino', 'led', 'motor'] },
      }),
    } as unknown as Response);

    await act(async () => {
      fireEvent.submit(tagsInput.closest('form')!);
    });

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([_url, opts]) => opts?.method === 'PATCH'
      );
      const body = JSON.parse(patchCall![1].body as string);
      expect(body.tags).toEqual(['arduino', 'led', 'motor']);
    });
  });

  it('shows save error when PATCH fails', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid name' }),
    } as unknown as Response);

    await act(async () => {
      fireEvent.submit(nameInput.closest('form')!);
    });

    await waitFor(() =>
      expect(screen.getByText('Invalid name')).toBeInTheDocument()
    );
  });

  it('closes dialog and updates project name in UI after successful save', async () => {
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Updated Arm' } });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...baseProject, name: 'Updated Arm' } }),
    } as unknown as Response);

    await act(async () => {
      fireEvent.submit(nameInput.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Arm')).toBeInTheDocument();
    });
  });

  it('only shows valid status transitions in the select', async () => {
    // active → can go to: deployed, planned, retired (+ active itself)
    await renderAndWait();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Project' }));

    const select = screen.getByTestId('status-select') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);

    expect(options).toContain('active');
    expect(options).toContain('deployed');
    expect(options).toContain('planned');
    expect(options).toContain('retired');
    // 'idea' is not reachable from 'active'
    expect(options).not.toContain('idea');
  });
});
