/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScrapLostModal } from '../ScrapLostModal';

const mockClose = jest.fn();
const mockSuccess = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('ScrapLostModal', () => {
  describe('scrap action', () => {
    it('renders Scrap Lot title', () => {
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByRole('heading', { name: 'Scrap Lot' })).toBeInTheDocument();
    });

    it('shows cannot-be-undone warning', () => {
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(
        screen.getByText(/permanently mark the lot as scrapped/i)
      ).toBeInTheDocument();
    });

    it('renders Scrap Lot confirm button', () => {
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByRole('button', { name: /scrap lot/i })).toBeInTheDocument();
    });

    it('submits PATCH with status scrapped and no reason', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap lot/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/lots/lot-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'scrapped' }),
          })
        );
        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    it('appends reason to existing notes on scrap', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes="Previous notes"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/optional reason/i), {
        target: { value: 'Broken beyond repair' },
      });
      fireEvent.click(screen.getByRole('button', { name: /scrap lot/i }));
      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[0][1].body as string
        );
        expect(body.notes).toBe('Previous notes\n[Scrapped] Broken beyond repair');
        expect(body.status).toBe('scrapped');
      });
    });

    it('creates notes from reason when no existing notes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/optional reason/i), {
        target: { value: 'Worn out' },
      });
      fireEvent.click(screen.getByRole('button', { name: /scrap lot/i }));
      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[0][1].body as string
        );
        expect(body.notes).toBe('[Scrapped] Worn out');
      });
    });

    it('shows error message when API returns failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid transition' }),
      });
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap lot/i }));
      await waitFor(() => {
        expect(screen.getByText('Invalid transition')).toBeInTheDocument();
        expect(mockSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows fallback error when no message in failure response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap lot/i }));
      await waitFor(() => {
        expect(screen.getByText('Action failed')).toBeInTheDocument();
      });
    });

    it('shows network error when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap lot/i }));
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('lost action', () => {
    it('renders Mark as Lost title', () => {
      render(
        <ScrapLostModal
          lotId="lot-2"
          action="lost"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByText('Mark as Lost')).toBeInTheDocument();
    });

    it('renders Mark Lost confirm button', () => {
      render(
        <ScrapLostModal
          lotId="lot-2"
          action="lost"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByRole('button', { name: /mark lost/i })).toBeInTheDocument();
    });

    it('submits PATCH with status lost', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <ScrapLostModal
          lotId="lot-2"
          action="lost"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /mark lost/i }));
      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[0][1].body as string
        );
        expect(body.status).toBe('lost');
      });
    });

    it('appends [Lost] prefix when reason provided for lost action', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <ScrapLostModal
          lotId="lot-2"
          action="lost"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/optional reason/i), {
        target: { value: 'Misplaced during move' },
      });
      fireEvent.click(screen.getByRole('button', { name: /mark lost/i }));
      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[0][1].body as string
        );
        expect(body.notes).toBe('[Lost] Misplaced during move');
      });
    });
  });

  describe('close button', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockClose).toHaveBeenCalled();
    });

    it('calls onClose when ✕ button is clicked', () => {
      render(
        <ScrapLostModal
          lotId="lot-1"
          action="scrap"
          currentNotes={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
