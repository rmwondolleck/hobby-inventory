/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdjustQuantityModal } from '../AdjustQuantityModal';

const mockClose = jest.fn();
const mockSuccess = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('AdjustQuantityModal', () => {
  describe('exact quantity mode', () => {
    it('renders Adjust Quantity title', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByText('Adjust Quantity')).toBeInTheDocument();
    });

    it('renders number input with current quantity', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('5');
    });

    it('shows unit label when unit is provided', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByText(/new quantity.*\(pcs\)/i)).toBeInTheDocument();
    });

    it('submits valid quantity to API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/lots/lot-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ quantity: 10 }),
          })
        );
        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    it('allows submitting zero quantity', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[0][1].body as string
        );
        expect(body.quantity).toBe(0);
      });
    });

    it('shows validation error for negative quantity', async () => {
      // Pass a negative initial value via props so the React state starts as '-1',
      // bypassing jsdom's type=number DOM constraint that would reject fireEvent.change('-1').
      const { container } = render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={-1}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(
          screen.getByText('Quantity must be a non-negative integer')
        ).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('shows validation error for non-numeric quantity', async () => {
      // Empty quantity (null prop → '' state) causes parseInt('', 10) → NaN.
      // Use fireEvent.submit to bypass HTML5 required-field browser validation.
      const { container } = render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={null}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(
          screen.getByText('Quantity must be a non-negative integer')
        ).toBeInTheDocument();
      });
    });

    it('shows error message when API call fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Server error' }),
      });
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
        expect(mockSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows fallback error when no message in failure response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });

    it('shows network error when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('qualitative mode', () => {
    it('renders Update Stock Level title', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="qualitative"
          currentQuantity={null}
          currentQualitativeStatus="low"
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByText('Update Stock Level')).toBeInTheDocument();
    });

    it('renders radio buttons for Plenty, Low, Out', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="qualitative"
          currentQuantity={null}
          currentQualitativeStatus="low"
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByLabelText('Plenty')).toBeInTheDocument();
      expect(screen.getByLabelText('Low')).toBeInTheDocument();
      expect(screen.getByLabelText('Out')).toBeInTheDocument();
    });

    it('pre-selects the current qualitative status', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="qualitative"
          currentQuantity={null}
          currentQualitativeStatus="low"
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      const lowRadio = screen.getByLabelText('Low') as HTMLInputElement;
      expect(lowRadio.checked).toBe(true);
    });

    it('defaults to plenty when currentQualitativeStatus is null', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="qualitative"
          currentQuantity={null}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      const plentyRadio = screen.getByLabelText('Plenty') as HTMLInputElement;
      expect(plentyRadio.checked).toBe(true);
    });

    it('submits qualitativeStatus to API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="qualitative"
          currentQuantity={null}
          currentQualitativeStatus="low"
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByLabelText('Out'));
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/lots/lot-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ qualitativeStatus: 'out' }),
          })
        );
        expect(mockSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('cancel / close', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockClose).toHaveBeenCalled();
    });

    it('calls onClose when ✕ button is clicked', () => {
      render(
        <AdjustQuantityModal
          lotId="lot-1"
          quantityMode="exact"
          currentQuantity={5}
          currentQualitativeStatus={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
