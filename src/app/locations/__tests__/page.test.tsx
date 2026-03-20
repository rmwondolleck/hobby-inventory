/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import LocationsPage from '../page';

// Mock Next.js Link to render a plain anchor
jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Radix UI Select so SelectItem elements render inline (avoids portal issues in jsdom)
jest.mock('@/components/ui/select', () => {
  const MockSelect = ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="mock-select" data-value={value ?? ''}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, { onValueChange })
          : child
      )}
    </div>
  );
  const MockSelectTrigger = ({ children }: { children?: React.ReactNode; id?: string }) => (
    <div data-testid="select-trigger">{children}</div>
  );
  const MockSelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;
  const MockSelectContent = ({ children, onValueChange }: { children?: React.ReactNode; onValueChange?: (v: string) => void }) => (
    <div data-testid="select-content">
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, { onValueChange })
          : child
      )}
    </div>
  );
  const MockSelectItem = ({ children, value, onValueChange }: {
    children?: React.ReactNode;
    value: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div
      data-testid={`select-item-${value}`}
      data-value={value}
      onClick={() => onValueChange?.(value)}
      role="option"
    >
      {children}
    </div>
  );
  return {
    Select: MockSelect,
    SelectTrigger: MockSelectTrigger,
    SelectValue: MockSelectValue,
    SelectContent: MockSelectContent,
    SelectItem: MockSelectItem,
  };
});

interface LocationFixture {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  notes: string | null;
  children?: { id: string; name: string; path: string }[];
}

const mockLocations: LocationFixture[] = [
  { id: 'loc-1', name: 'Shelf A', path: 'Shelf A', parentId: null, notes: null },
  { id: 'loc-2', name: 'Bin B', path: 'Shelf A > Bin B', parentId: 'loc-1', notes: 'Top shelf' },
];

function mockFetchSuccess(locations: LocationFixture[] = mockLocations) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    json: async () => ({ data: locations }),
  } as Response);
}

function mockFetchEmpty() {
  global.fetch = jest.fn().mockResolvedValueOnce({
    json: async () => ({ data: [] }),
  } as Response);
}

function mockFetchError() {
  global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));
}

const mockLocationsWithChildren = [
  {
    id: 'loc-1',
    name: 'Shelf A',
    path: 'Shelf A',
    parentId: null,
    notes: null,
    children: [
      { id: 'loc-2', name: 'Bin B', path: 'Shelf A > Bin B' },
    ],
  },
  {
    id: 'loc-2',
    name: 'Bin B',
    path: 'Shelf A > Bin B',
    parentId: 'loc-1',
    notes: 'Top shelf',
    children: [],
  },
];

afterEach(() => {
  jest.resetAllMocks();
});

describe('LocationsPage', () => {
  it('shows loading state initially', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves
    render(<LocationsPage />);
    expect(screen.getByText(/loading locations/i)).toBeInTheDocument();
  });

  it('renders location names as links to detail pages', async () => {
    mockFetchSuccess();
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const shelfLink = screen.getByRole('link', { name: 'Shelf A' });
    expect(shelfLink).toBeInTheDocument();
    expect(shelfLink).toHaveAttribute('href', '/locations/loc-1');

    const binLink = screen.getByRole('link', { name: 'Bin B' });
    expect(binLink).toBeInTheDocument();
    expect(binLink).toHaveAttribute('href', '/locations/loc-2');
  });

  it('location links use the correct location id in the href', async () => {
    mockFetchSuccess([{ id: 'abc-123', name: 'Test Location', path: 'Test Location', parentId: null, notes: null }]);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const link = screen.getByRole('link', { name: 'Test Location' });
    expect(link).toHaveAttribute('href', '/locations/abc-123');
  });

  it('renders the path column alongside the linked name', async () => {
    mockFetchSuccess();
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('Shelf A > Bin B')).toBeInTheDocument();
  });

  it('shows empty state when no locations exist', async () => {
    mockFetchEmpty();
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/no locations found/i)).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    mockFetchError();
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/failed to load locations/i)).toBeInTheDocument();
  });

  it('renders the page heading', async () => {
    mockFetchSuccess();
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /locations/i })).toBeInTheDocument();
  });
});


describe('LocationsPage — notes column', () => {
  it('displays notes text when a location has notes', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: mockLocations }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('Top shelf')).toBeInTheDocument();
  });

  it('displays an em-dash placeholder for null notes', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: [{ id: 'loc-1', name: 'Shelf A', path: 'Shelf A', parentId: null, notes: null }] }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// New dialog tests for the Add / Edit Location feature (PR #167 / issue #148)
// ---------------------------------------------------------------------------

async function renderWithLocations(locations = mockLocations) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    json: async () => ({ data: locations }),
  } as Response);
  render(<LocationsPage />);
  await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
}

describe('LocationsPage — Add Location dialog', () => {
  it('renders an "Add Location" button in the header', async () => {
    await renderWithLocations();
    expect(screen.getByRole('button', { name: /\+ add location/i })).toBeInTheDocument();
  });

  it('opens the dialog with title "Add Location" when button is clicked', async () => {
    await renderWithLocations();
    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    // Use heading role to disambiguate from the submit button that also says "Add Location"
    expect(screen.getByRole('heading', { name: /add location/i })).toBeInTheDocument();
  });

  it('opens dialog with empty name and notes fields', async () => {
    await renderWithLocations();
    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('');
  });

  it('closes the dialog when Cancel is clicked', async () => {
    await renderWithLocations();
    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a validation error when the name is whitespace-only', async () => {
    await renderWithLocations();
    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // Whitespace-only name passes the HTML `required` constraint but fails JS trim validation
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add location$/i }));
    });
    await waitFor(() =>
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    );
    // fetch should not have been called for POST
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/locations'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('calls POST /api/locations and appends the new location to the list', async () => {
    const newLocation = {
      id: 'loc-new',
      name: 'New Room',
      path: 'New Room',
      parentId: null,
      notes: null,
    };
    // First fetch: load locations list; second fetch: POST new location
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: mockLocations }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newLocation }),
      } as Response);

    render(<LocationsPage />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Room' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add location$/i }));
    });

    // Dialog should close and new location should appear
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'New Room' })).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/locations',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"New Room"'),
      })
    );
  });

  it('displays an API error message when POST fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: mockLocations }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to save' }),
      } as Response);

    render(<LocationsPage />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Room' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add location$/i }));
    });

    await waitFor(() => expect(screen.getByText('Failed to save')).toBeInTheDocument());
    // Dialog should remain open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('LocationsPage — Edit Location dialog', () => {
  it('renders an Edit button for each location row', async () => {
    await renderWithLocations();
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    expect(editBtns).toHaveLength(mockLocations.length);
  });

  it('opens the dialog with title "Edit Location" when Edit is clicked', async () => {
    await renderWithLocations();
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('Edit Location')).toBeInTheDocument();
  });

  it('pre-fills the name field with the location name when editing', async () => {
    await renderWithLocations();
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    expect(screen.getByLabelText(/name/i)).toHaveValue('Shelf A');
  });

  it('pre-fills the notes field with the location notes when editing', async () => {
    await renderWithLocations();
    // loc-2 has notes 'Top shelf'
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    expect(screen.getByLabelText(/notes/i)).toHaveValue('Top shelf');
  });

  it('calls PATCH /api/locations/[id] and updates the row on success', async () => {
    const updatedLocation = {
      id: 'loc-1',
      name: 'Shelf A Updated',
      path: 'Shelf A Updated',
      parentId: null,
      notes: null,
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: mockLocations }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedLocation }),
      } as Response);

    render(<LocationsPage />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Shelf A Updated' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Shelf A Updated' })).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/locations/loc-1',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"name":"Shelf A Updated"'),
      })
    );
  });

  it('displays an API error message when PATCH fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: mockLocations }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      } as Response);

    render(<LocationsPage />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    await waitFor(() => expect(screen.getByText('Update failed')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('LocationsPage — parent dropdown cycle prevention (getDescendantIds)', () => {
  const deepLocations = [
    { id: 'root', name: 'Root', path: 'Root', parentId: null, notes: null },
    { id: 'child', name: 'Child', path: 'Root/Child', parentId: 'root', notes: null },
    { id: 'grandchild', name: 'Grandchild', path: 'Root/Child/Grandchild', parentId: 'child', notes: null },
    { id: 'other', name: 'Other Root', path: 'Other Root', parentId: null, notes: null },
  ];

  it('excludes the location being edited from parent dropdown options', async () => {
    await renderWithLocations(deepLocations);

    // Open edit dialog for "Root"
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // "Root" itself should not be in the parent options
    expect(screen.queryByTestId('select-item-root')).not.toBeInTheDocument();
  });

  it('excludes descendants from parent dropdown options when editing', async () => {
    await renderWithLocations(deepLocations);

    // Edit "Root" — its descendants (child, grandchild) should be excluded
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    expect(screen.queryByTestId('select-item-child')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-item-grandchild')).not.toBeInTheDocument();

    // Non-descendant "other" should be present
    expect(screen.getByTestId('select-item-other')).toBeInTheDocument();
  });

  it('includes all locations as parent options when adding a new location', async () => {
    await renderWithLocations(deepLocations);

    fireEvent.click(screen.getByRole('button', { name: /\+ add location/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // All locations should be available as parent options
    expect(screen.getByTestId('select-item-root')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-child')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-grandchild')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-other')).toBeInTheDocument();
  });
});
