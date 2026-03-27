/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationModal from '../LocationModal';
import type { LocationWithCount } from '../LocationTree';

const mockClose = jest.fn();
const mockSuccess = jest.fn();

const makeLocation = (overrides: Partial<LocationWithCount> = {}): LocationWithCount => ({
  id: 'loc-1',
  name: 'Shelf A',
  parentId: null,
  path: 'Shelf A',
  notes: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  _count: { children: 0, lots: 0 },
  ...overrides,
});

const LOCATIONS: LocationWithCount[] = [
  makeLocation({ id: 'loc-1', name: 'Shelf A', path: 'Shelf A' }),
  makeLocation({ id: 'loc-2', name: 'Drawer 1', parentId: 'loc-1', path: 'Shelf A/Drawer 1' }),
];

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

// ── Semantic token CSS class checks ────────────────────────────────────────
describe('LocationModal — semantic token classes (dark-mode theming)', () => {
  it('modal container uses bg-popover instead of bg-white', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    // The inner dialog container should carry bg-popover
    const dialog = screen.getByRole('heading', { name: /add location/i }).closest('div');
    // Walk up to the container div that has the background class
    const container = dialog?.parentElement;
    expect(container?.className).toContain('bg-popover');
    expect(container?.className).not.toContain('bg-white');
  });

  it('title uses text-popover-foreground instead of text-gray-900', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    const heading = screen.getByRole('heading', { name: /add location/i });
    expect(heading.className).toContain('text-popover-foreground');
    expect(heading.className).not.toContain('text-gray-900');
  });

  it('close button uses text-muted-foreground hover:text-foreground instead of gray classes', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn.className).toContain('text-muted-foreground');
    expect(closeBtn.className).toContain('hover:text-foreground');
    expect(closeBtn.className).not.toContain('text-gray-400');
    expect(closeBtn.className).not.toContain('hover:text-gray-600');
  });

  it('name input uses border-border and bg-background instead of gray classes', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    const input = screen.getByPlaceholderText(/shelf a/i);
    expect(input.className).toContain('border-border');
    expect(input.className).toContain('bg-background');
    expect(input.className).not.toContain('border-gray-300');
    expect(input.className).not.toContain('bg-white');
  });

  it('parent location select uses border-border and bg-background instead of gray classes', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    const select = screen.getByRole('combobox');
    expect(select.className).toContain('border-border');
    expect(select.className).toContain('bg-background');
    expect(select.className).not.toContain('border-gray-300');
    expect(select.className).not.toContain('bg-white');
  });

  it('notes textarea uses border-border and bg-background instead of gray classes', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    const textarea = screen.getByPlaceholderText(/optional description/i);
    expect(textarea.className).toContain('border-border');
    expect(textarea.className).toContain('bg-background');
    expect(textarea.className).not.toContain('border-gray-300');
  });

  it('cancel button uses text-foreground, border-border, hover:bg-accent instead of gray classes', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn.className).toContain('text-foreground');
    expect(cancelBtn.className).toContain('border-border');
    expect(cancelBtn.className).toContain('hover:bg-accent');
    expect(cancelBtn.className).not.toContain('text-gray-700');
    expect(cancelBtn.className).not.toContain('border-gray-300');
    expect(cancelBtn.className).not.toContain('hover:bg-gray-50');
  });

  it('backdrop retains bg-black/50 unchanged', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    // The outermost fixed overlay div carries the backdrop class
    const backdrop = screen.getByRole('heading', { name: /add location/i })
      .closest('.fixed');
    expect(backdrop?.className).toContain('bg-black/50');
  });
});

// ── Rendering ───────────────────────────────────────────────────────────────
describe('LocationModal — rendering', () => {
  it('renders "Add Location" title in create mode', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    expect(screen.getByRole('heading', { name: /add location/i })).toBeInTheDocument();
  });

  it('renders "Edit Location" title in edit mode', () => {
    render(
      <LocationModal
        mode="edit"
        location={LOCATIONS[0]}
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    expect(screen.getByRole('heading', { name: /edit location/i })).toBeInTheDocument();
  });

  it('pre-fills fields from existing location in edit mode', () => {
    const loc = makeLocation({ name: 'My Drawer', notes: 'Keep resistors here' });
    render(
      <LocationModal
        mode="edit"
        location={loc}
        locations={[loc]}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    expect(screen.getByDisplayValue('My Drawer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Keep resistors here')).toBeInTheDocument();
  });

  it('populates parent location options from locations prop', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    expect(screen.getByRole('option', { name: 'Shelf A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Shelf A/Drawer 1' })).toBeInTheDocument();
  });

  it('excludes the location being edited and its descendants from parent options', () => {
    render(
      <LocationModal
        mode="edit"
        location={LOCATIONS[0]} // Shelf A
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    // Shelf A itself should not appear
    expect(screen.queryByRole('option', { name: 'Shelf A' })).not.toBeInTheDocument();
    // Shelf A/Drawer 1 is a descendant; should also be excluded
    expect(screen.queryByRole('option', { name: 'Shelf A/Drawer 1' })).not.toBeInTheDocument();
  });
});

// ── Validation ──────────────────────────────────────────────────────────────
describe('LocationModal — validation', () => {
  it('shows error and does not call fetch when name is empty', async () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ── Interactions ────────────────────────────────────────────────────────────
describe('LocationModal — interactions', () => {
  it('calls onClose when close button is clicked', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess after successful create submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/shelf a/i), {
      target: { value: 'New Bin' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('POSTs to /api/locations in create mode', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/shelf a/i), {
      target: { value: 'New Bin' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/locations');
    expect(opts.method).toBe('POST');
  });

  it('PATCHes to /api/locations/[id] in edit mode', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    render(
      <LocationModal
        mode="edit"
        location={LOCATIONS[0]}
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/locations/loc-1');
    expect(opts.method).toBe('PATCH');
  });

  it('shows API error message on failed submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Location name already exists' }),
    });
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/shelf a/i), {
      target: { value: 'Shelf A' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(screen.getByText('Location name already exists')).toBeInTheDocument();
    });
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('shows network error message on fetch exception', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/shelf a/i), {
      target: { value: 'New Bin' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows Saving… and disables submit button while loading', async () => {
    let resolvePromise!: (v: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((res) => { resolvePromise = res; })
    );
    render(
      <LocationModal
        mode="create"
        locations={LOCATIONS}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/shelf a/i), {
      target: { value: 'New Bin' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });
    resolvePromise({ ok: true });
  });
});
