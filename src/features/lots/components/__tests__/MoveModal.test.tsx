/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MoveModal } from '../MoveModal';

const mockClose = jest.fn();
const mockSuccess = jest.fn();

const LOCATIONS = [
  { id: 'loc-1', name: 'Shelf A', path: 'Office/Shelf A' },
  { id: 'loc-2', name: 'Drawer 1', path: 'Office/Shelf A/Drawer 1' },
];

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('MoveModal', () => {
  describe('loading state', () => {
    it('shows loading indicator while fetching locations', () => {
      (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByText(/loading locations/i)).toBeInTheDocument();
    });

    it('shows form after locations are loaded', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });
  });

  describe('error loading locations', () => {
    it('shows error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Failed to load locations')).toBeInTheDocument();
      });
    });

    it('shows error when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Failed to load locations')).toBeInTheDocument();
      });
    });
  });

  describe('location initialization', () => {
    it('initializes select to current location', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('loc-1');
    });

    it('initializes select to empty when no current location', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
    });
  });

  describe('submit button state', () => {
    it('disables submit when location is unchanged', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.getByRole('button', { name: /move lot/i })).toBeDisabled();
    });

    it('disables submit when no location selected and none was set', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.getByRole('button', { name: /move lot/i })).toBeDisabled();
    });

    it('enables submit when a different location is selected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loc-2' } });
      expect(screen.getByRole('button', { name: /move lot/i })).not.toBeDisabled();
    });

    it('enables submit when location is cleared (moved from a set location to none)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
      expect(screen.getByRole('button', { name: /move lot/i })).not.toBeDisabled();
    });
  });

  describe('submit success', () => {
    it('calls move API and invokes onSuccess', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOCATIONS }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loc-2' } });
      fireEvent.click(screen.getByRole('button', { name: /move lot/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenLastCalledWith(
          '/api/lots/lot-1/move',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ locationId: 'loc-2', notes: null }),
          })
        );
        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    it('sends null locationId when location cleared', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOCATIONS }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /move lot/i }));

      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[1][1].body as string
        );
        expect(body.locationId).toBeNull();
        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    it('includes notes when provided', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOCATIONS }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loc-2' } });
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reorganizing shelf' } });
      fireEvent.click(screen.getByRole('button', { name: /move lot/i }));

      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[1][1].body as string
        );
        expect(body.notes).toBe('Reorganizing shelf');
      });
    });
  });

  describe('submit failure', () => {
    it('shows error message when API call fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOCATIONS }) })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Location not found' }),
        });

      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loc-2' } });
      fireEvent.click(screen.getByRole('button', { name: /move lot/i }));

      await waitFor(() => {
        expect(screen.getByText('Location not found')).toBeInTheDocument();
        expect(mockSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows fallback error when no message in response', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOCATIONS }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({}) });

      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loc-2' } });
      fireEvent.click(screen.getByRole('button', { name: /move lot/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to move lot')).toBeInTheDocument();
      });
    });

    it('shows network error when fetch throws', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: LOCATIONS }) })
        .mockRejectedValueOnce(new Error('Network down'));

      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId="loc-1"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loc-2' } });
      fireEvent.click(screen.getByRole('button', { name: /move lot/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('cancel / close', () => {
    it('calls onClose when Cancel is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockClose).toHaveBeenCalled();
    });

    it('calls onClose when ✕ button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: LOCATIONS }),
      });
      render(
        <MoveModal
          lotId="lot-1"
          currentLocationId={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
