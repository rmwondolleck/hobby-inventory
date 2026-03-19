/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PartDetailClient } from '../PartDetailClient';
import type { PartDetail } from '../../types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'part-1' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('../DuplicatePartDialog', () => ({
  DuplicatePartDialog: ({
    open,
    onOpenChange,
    part,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    part: PartDetail;
  }) =>
    open ? (
      <div data-testid="duplicate-dialog">
        <span>Dialog for {part.name}</span>
        <button onClick={() => onOpenChange(false)}>Close Dialog</button>
      </div>
    ) : null,
}));

const PART: PartDetail = {
  id: 'part-1',
  name: 'Arduino Uno',
  category: 'Microcontrollers',
  manufacturer: 'Arduino',
  mpn: 'A000066',
  tags: ['arduino'],
  notes: 'Classic board',
  parameters: { voltage: '5V' },
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  lots: [],
};

function mockFetchSuccess(data: PartDetail = PART) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data }),
  });
}

function mockFetchError(status: number) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PartDetailClient', () => {
  describe('loading state', () => {
    it('renders loading skeleton initially', () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      const { container } = render(<PartDetailClient />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows "Part not found" for 404 response', async () => {
      mockFetchError(404);
      render(<PartDetailClient />);
      await waitFor(() =>
        expect(screen.getByText('Part not found')).toBeInTheDocument(),
      );
    });

    it('shows "Failed to load" for non-404 error response', async () => {
      mockFetchError(500);
      render(<PartDetailClient />);
      await waitFor(() =>
        expect(screen.getByText('Failed to load')).toBeInTheDocument(),
      );
    });
  });

  describe('loaded state', () => {
    it('renders part name after loading', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() =>
        expect(screen.getByText('Arduino Uno')).toBeInTheDocument(),
      );
    });

    it('renders the Duplicate button', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument(),
      );
    });

    it('renders stock quantity', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() =>
        expect(screen.getByText('in stock')).toBeInTheDocument(),
      );
    });

    it('renders Back to Parts link', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() =>
        expect(screen.getByText(/back to parts/i)).toBeInTheDocument(),
      );
    });
  });

  describe('Duplicate button integration', () => {
    it('does not render dialog before Duplicate is clicked', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));
      expect(screen.queryByTestId('duplicate-dialog')).not.toBeInTheDocument();
    });

    it('opens DuplicatePartDialog when Duplicate button is clicked', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));

      fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));

      expect(screen.getByTestId('duplicate-dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog for Arduino Uno')).toBeInTheDocument();
    });

    it('passes the current part to DuplicatePartDialog', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));

      fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));

      expect(screen.getByText('Dialog for Arduino Uno')).toBeInTheDocument();
    });

    it('closes dialog when onOpenChange(false) is called', async () => {
      mockFetchSuccess();
      render(<PartDetailClient />);
      await waitFor(() => screen.getByRole('button', { name: /duplicate/i }));

      fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
      expect(screen.getByTestId('duplicate-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
      expect(screen.queryByTestId('duplicate-dialog')).not.toBeInTheDocument();
    });
  });
});
