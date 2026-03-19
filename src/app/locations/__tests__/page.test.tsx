/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LocationsPage from '../page';

// Mock Next.js Link to render a plain anchor
jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
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
