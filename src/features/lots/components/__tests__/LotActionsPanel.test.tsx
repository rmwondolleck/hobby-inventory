/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LotActionsPanel, LotActionsPanelProps } from '../LotActionsPanel';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

// Stub child modals to avoid recursive fetch mocking
jest.mock('../MoveModal', () => ({
  MoveModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="move-modal">
      <button onClick={onClose}>close-move</button>
    </div>
  ),
}));
jest.mock('../AllocateModal', () => ({
  AllocateModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="allocate-modal">
      <button onClick={onClose}>close-allocate</button>
    </div>
  ),
}));
jest.mock('../ScrapLostModal', () => ({
  ScrapLostModal: ({
    action,
    onClose,
  }: {
    action: string;
    onClose: () => void;
  }) => (
    <div data-testid={`${action}-modal`}>
      <button onClick={onClose}>close-{action}</button>
    </div>
  ),
}));
jest.mock('../AdjustQuantityModal', () => ({
  AdjustQuantityModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="adjust-modal">
      <button onClick={onClose}>close-adjust</button>
    </div>
  ),
}));

const baseProps: LotActionsPanelProps = {
  lotId: 'lot-1',
  status: 'in_stock',
  quantityMode: 'exact',
  quantity: 10,
  qualitativeStatus: null,
  unit: 'pcs',
  locationId: 'loc-1',
  notes: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('LotActionsPanel', () => {
  describe('terminal state', () => {
    it('returns null for scrapped status', () => {
      const { container } = render(<LotActionsPanel {...baseProps} status="scrapped" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('in_stock status', () => {
    it('renders Move button', () => {
      render(<LotActionsPanel {...baseProps} />);
      expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
    });

    it('renders Allocate to Project button', () => {
      render(<LotActionsPanel {...baseProps} />);
      expect(screen.getByRole('button', { name: /allocate to project/i })).toBeInTheDocument();
    });

    it('renders Adjust Quantity button for exact mode', () => {
      render(<LotActionsPanel {...baseProps} quantityMode="exact" />);
      expect(screen.getByRole('button', { name: /adjust quantity/i })).toBeInTheDocument();
    });

    it('renders Update Stock Level button for qualitative mode', () => {
      render(<LotActionsPanel {...baseProps} quantityMode="qualitative" />);
      expect(screen.getByRole('button', { name: /update stock level/i })).toBeInTheDocument();
    });

    it('renders Mark Lost button', () => {
      render(<LotActionsPanel {...baseProps} />);
      expect(screen.getByRole('button', { name: /mark lost/i })).toBeInTheDocument();
    });

    it('renders Scrap button', () => {
      render(<LotActionsPanel {...baseProps} />);
      expect(screen.getByRole('button', { name: /scrap/i })).toBeInTheDocument();
    });

    it('does not render Restore to Stock button', () => {
      render(<LotActionsPanel {...baseProps} />);
      expect(screen.queryByRole('button', { name: /restore to stock/i })).not.toBeInTheDocument();
    });
  });

  describe('installed status', () => {
    it('renders Move button', () => {
      render(<LotActionsPanel {...baseProps} status="installed" />);
      expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
    });

    it('does not render Allocate button', () => {
      render(<LotActionsPanel {...baseProps} status="installed" />);
      expect(screen.queryByRole('button', { name: /allocate to project/i })).not.toBeInTheDocument();
    });

    it('does not render Adjust button', () => {
      render(<LotActionsPanel {...baseProps} status="installed" />);
      expect(screen.queryByRole('button', { name: /adjust/i })).not.toBeInTheDocument();
    });

    it('renders Mark Lost button', () => {
      render(<LotActionsPanel {...baseProps} status="installed" />);
      expect(screen.getByRole('button', { name: /mark lost/i })).toBeInTheDocument();
    });

    it('renders Scrap button', () => {
      render(<LotActionsPanel {...baseProps} status="installed" />);
      expect(screen.getByRole('button', { name: /scrap/i })).toBeInTheDocument();
    });
  });

  describe('lost status', () => {
    it('renders Restore to Stock button', () => {
      render(<LotActionsPanel {...baseProps} status="lost" />);
      expect(screen.getByRole('button', { name: /restore to stock/i })).toBeInTheDocument();
    });

    it('renders Scrap button', () => {
      render(<LotActionsPanel {...baseProps} status="lost" />);
      expect(screen.getByRole('button', { name: /scrap/i })).toBeInTheDocument();
    });

    it('does not render Allocate button', () => {
      render(<LotActionsPanel {...baseProps} status="lost" />);
      expect(screen.queryByRole('button', { name: /allocate to project/i })).not.toBeInTheDocument();
    });

    it('does not render Move button', () => {
      render(<LotActionsPanel {...baseProps} status="lost" />);
      expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument();
    });
  });

  describe('out status', () => {
    it('renders Move button', () => {
      render(<LotActionsPanel {...baseProps} status="out" />);
      expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
    });

    it('does not render Allocate button', () => {
      render(<LotActionsPanel {...baseProps} status="out" />);
      expect(screen.queryByRole('button', { name: /allocate to project/i })).not.toBeInTheDocument();
    });

    it('does not render Mark Lost button', () => {
      render(<LotActionsPanel {...baseProps} status="out" />);
      expect(screen.queryByRole('button', { name: /mark lost/i })).not.toBeInTheDocument();
    });
  });

  describe('modal interactions', () => {
    it('opens MoveModal when Move button is clicked', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /move/i }));
      expect(screen.getByTestId('move-modal')).toBeInTheDocument();
    });

    it('opens AllocateModal when Allocate button is clicked', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /allocate to project/i }));
      expect(screen.getByTestId('allocate-modal')).toBeInTheDocument();
    });

    it('opens scrap modal when Scrap button is clicked', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /scrap/i }));
      expect(screen.getByTestId('scrap-modal')).toBeInTheDocument();
    });

    it('opens lost modal when Mark Lost button is clicked', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /mark lost/i }));
      expect(screen.getByTestId('lost-modal')).toBeInTheDocument();
    });

    it('opens adjust modal when Adjust Quantity button is clicked', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /adjust quantity/i }));
      expect(screen.getByTestId('adjust-modal')).toBeInTheDocument();
    });

    it('closes modal when close callback is triggered', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /move/i }));
      expect(screen.getByTestId('move-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /close-move/i }));
      expect(screen.queryByTestId('move-modal')).not.toBeInTheDocument();
    });

    it('only one modal is open at a time', () => {
      render(<LotActionsPanel {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /move/i }));
      expect(screen.getByTestId('move-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('allocate-modal')).not.toBeInTheDocument();
    });
  });

  describe('Restore to Stock', () => {
    it('calls fetch PATCH with in_stock status and refreshes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      render(<LotActionsPanel {...baseProps} status="lost" />);
      fireEvent.click(screen.getByRole('button', { name: /restore to stock/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/lots/lot-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'in_stock' }),
          })
        );
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows error message when restore fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Cannot restore' }),
      });
      render(<LotActionsPanel {...baseProps} status="lost" />);
      fireEvent.click(screen.getByRole('button', { name: /restore to stock/i }));
      await waitFor(() => {
        expect(screen.getByText('Cannot restore')).toBeInTheDocument();
      });
    });

    it('shows fallback error when no message in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      render(<LotActionsPanel {...baseProps} status="lost" />);
      fireEvent.click(screen.getByRole('button', { name: /restore to stock/i }));
      await waitFor(() => {
        expect(screen.getByText('Failed to restore')).toBeInTheDocument();
      });
    });

    it('shows network error when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));
      render(<LotActionsPanel {...baseProps} status="lost" />);
      fireEvent.click(screen.getByRole('button', { name: /restore to stock/i }));
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });
  });
});
