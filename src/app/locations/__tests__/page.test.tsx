/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LocationsPage from '../page';

// Mock Next.js Link to render a plain anchor
jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const mockLocations = [
  { id: 'loc-1', name: 'Shelf A', path: 'Shelf A', parentId: null, notes: null },
  { id: 'loc-2', name: 'Bin B', path: 'Shelf A > Bin B', parentId: 'loc-1', notes: 'Top shelf' },
];

function mockFetchSuccess(locations = mockLocations) {
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

describe('LocationsPage — Print All Labels button', () => {
  beforeEach(() => {
    window.open = jest.fn();
  });

  it('is disabled when there are no locations', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: [] }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const btn = screen.getByRole('button', { name: /print all labels/i });
    expect(btn).toBeDisabled();
  });

  it('is enabled when locations exist', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: mockLocations }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const btn = screen.getByRole('button', { name: /print all labels/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls window.open with all location IDs when clicked', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: mockLocations }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /print all labels/i }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = (window.open as jest.Mock).mock.calls[0];
    const parsed = new URL(url, 'http://localhost');
    const ids = parsed.searchParams.get('ids') ?? '';
    expect(ids).toContain('loc-1');
    expect(ids).toContain('loc-2');
  });
});

describe('LocationsPage — per-row action buttons', () => {
  beforeEach(() => {
    window.open = jest.fn();
  });

  it('renders a Label button for each location row', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: mockLocations }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const labelBtns = screen.getAllByRole('button', { name: /🏷️ label/i });
    expect(labelBtns).toHaveLength(2);
  });

  it('calls window.open with the individual location id when Label button is clicked', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: [{ id: 'xyz-99', name: 'My Shelf', path: 'My Shelf', parentId: null, notes: null }] }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const labelBtn = screen.getByRole('button', { name: /🏷️ label/i });
    fireEvent.click(labelBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('xyz-99'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('shows Children button only for locations that have children', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: mockLocationsWithChildren }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const childrenBtns = screen.getAllByRole('button', { name: /children/i });
    // Only loc-1 has children
    expect(childrenBtns).toHaveLength(1);
  });

  it('calls window.open with child IDs when Children button is clicked', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: mockLocationsWithChildren }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const childrenBtn = screen.getByRole('button', { name: /children/i });
    fireEvent.click(childrenBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('loc-2'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('renders a Lots link per row with the correct href', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: async () => ({ data: [{ id: 'loc-shelf', name: 'Shelf', path: 'Shelf', parentId: null, notes: null }] }),
    } as Response);
    render(<LocationsPage />);

    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const lotsLink = screen.getByRole('link', { name: /lots/i });
    expect(lotsLink).toHaveAttribute(
      'href',
      expect.stringContaining('locationId=loc-shelf')
    );
    expect(lotsLink).toHaveAttribute('target', '_blank');
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
