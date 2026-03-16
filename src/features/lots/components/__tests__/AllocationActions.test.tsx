/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AllocationActions } from '../AllocationActions';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('AllocationActions', () => {
  describe('terminal state', () => {
    it('returns null for recovered status', () => {
      const { container } = render(
        <AllocationActions
          allocationId="alloc-1"
          status="recovered"
          projectName="My Project"
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('advance status button', () => {
    it('shows Mark In Use button for reserved status', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      expect(screen.getByRole('button', { name: /mark in use/i })).toBeInTheDocument();
    });

    it('shows Mark Deployed button for in_use status', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="in_use"
          projectName="My Project"
        />
      );
      expect(screen.getByRole('button', { name: /mark deployed/i })).toBeInTheDocument();
    });

    it('does not show advance button for deployed status', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="deployed"
          projectName="My Project"
        />
      );
      expect(screen.queryByRole('button', { name: /mark in use/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /mark deployed/i })).not.toBeInTheDocument();
    });

    it('calls PATCH to advance from reserved to in_use', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /mark in use/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/allocations/alloc-1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'in_use' }),
          })
        );
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('calls PATCH to advance from in_use to deployed', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AllocationActions
          allocationId="alloc-2"
          status="in_use"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /mark deployed/i }));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/allocations/alloc-2',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'deployed' }),
          })
        );
      });
    });

    it('shows error message when advance fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid transition' }),
      });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /mark in use/i }));
      await waitFor(() => {
        expect(screen.getByText('Invalid transition')).toBeInTheDocument();
        expect(mockRefresh).not.toHaveBeenCalled();
      });
    });

    it('shows fallback error when no message in advance failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /mark in use/i }));
      await waitFor(() => {
        expect(screen.getByText('Failed to update status')).toBeInTheDocument();
      });
    });

    it('shows network error when advance fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Down'));
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /mark in use/i }));
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Return to Stock', () => {
    it('always renders Return to Stock button', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      expect(screen.getByRole('button', { name: /return to stock/i })).toBeInTheDocument();
    });

    it('opens confirmation dialog when Return to Stock is clicked', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /return to stock/i }));
      expect(screen.getByText(/return this allocation from "My Project"/i)).toBeInTheDocument();
    });

    it('closes dialog when Cancel is clicked', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /return to stock/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(
        screen.queryByText(/return this allocation from "My Project"/i)
      ).not.toBeInTheDocument();
    });

    it('calls POST return endpoint on confirm and refreshes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /return to stock/i }));
      // click the confirm button in the dialog
      const confirmBtns = screen.getAllByRole('button', { name: /return to stock/i });
      // second button is inside the dialog
      fireEvent.click(confirmBtns[confirmBtns.length - 1]);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/allocations/alloc-1/return',
          expect.objectContaining({ method: 'POST' })
        );
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows error in dialog when return fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Cannot return' }),
      });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /return to stock/i }));
      const confirmBtns = screen.getAllByRole('button', { name: /return to stock/i });
      fireEvent.click(confirmBtns[confirmBtns.length - 1]);
      await waitFor(() => {
        expect(screen.getByText('Cannot return')).toBeInTheDocument();
      });
    });
  });

  describe('Scrap allocation', () => {
    it('always renders Scrap button', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      expect(screen.getByRole('button', { name: /scrap/i })).toBeInTheDocument();
    });

    it('opens scrap confirmation dialog when Scrap is clicked', () => {
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap/i }));
      expect(screen.getByText('Scrap Allocation')).toBeInTheDocument();
      expect(
        screen.getByText(/permanently remove these parts from the allocation to "My Project"/i)
      ).toBeInTheDocument();
    });

    it('calls POST scrap endpoint on confirm and refreshes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap/i }));
      // Dialog is now open; click the confirm button inside the dialog (last Scrap button)
      const scrapBtns = screen.getAllByRole('button', { name: /^scrap$/i });
      fireEvent.click(scrapBtns[scrapBtns.length - 1]);
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/allocations/alloc-1/scrap',
          expect.objectContaining({ method: 'POST' })
        );
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('shows error in dialog when scrap fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Cannot scrap' }),
      });
      render(
        <AllocationActions
          allocationId="alloc-1"
          status="reserved"
          projectName="My Project"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /scrap/i }));
      const scrapBtns = screen.getAllByRole('button', { name: /^scrap$/i });
      fireEvent.click(scrapBtns[scrapBtns.length - 1]);
      await waitFor(() => {
        expect(screen.getByText('Cannot scrap')).toBeInTheDocument();
      });
    });
  });
});
