/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AllocateModal } from '../AllocateModal';

const mockClose = jest.fn();
const mockSuccess = jest.fn();

const PROJECTS = [
  { id: 'proj-1', name: 'Robot Arm', status: 'active' },
  { id: 'proj-2', name: 'LED Matrix', status: 'planned' },
  { id: 'proj-3', name: 'Old Project', status: 'retired' },
];

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('AllocateModal', () => {
  describe('loading state', () => {
    it('shows loading indicator while fetching projects', () => {
      (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
    });

    it('shows form after projects are loaded', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });
  });

  describe('error loading projects', () => {
    it('shows error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      });
    });

    it('shows error when fetch throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network'));
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
      });
    });
  });

  describe('project list', () => {
    it('renders active and planned projects', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.getByText(/robot arm/i)).toBeInTheDocument();
      expect(screen.getByText(/led matrix/i)).toBeInTheDocument();
    });

    it('excludes retired projects', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.queryByText(/old project/i)).not.toBeInTheDocument();
    });

    it('shows message when no projects are available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'p-1', name: 'Retired', status: 'retired' }] }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => {
        expect(screen.getByText(/no active or planned projects found/i)).toBeInTheDocument();
      });
    });
  });

  describe('exact mode — quantity field', () => {
    it('renders quantity input with required marker', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.required).toBe(true);
    });

    it('shows available quantity in label', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.getByText(/10 available/i)).toBeInTheDocument();
    });

    it('shows unit in label', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={5}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.getByText(/quantity.*\(pcs\)/i)).toBeInTheDocument();
    });

    it('does not render quantity input for qualitative mode', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="qualitative"
          availableQuantity={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('requires project selection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      const { container } = render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="qualitative"
          availableQuantity={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Please select a project')).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledTimes(1); // only the initial projects fetch
      });
    });

    it('requires quantity in exact mode', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      const { container } = render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Quantity is required')).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledTimes(1); // only the initial projects fetch
      });
    });

    it('validates quantity is a positive integer', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      const { container } = render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0' } });
      // Use fireEvent.submit to bypass jsdom's native min constraint
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Quantity must be a positive integer')).toBeInTheDocument();
      });
    });

    it('validates quantity does not exceed available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      const { container } = render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={5}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });
      // Use fireEvent.submit to bypass jsdom's native max constraint
      fireEvent.submit(container.querySelector('form')!);
      await waitFor(() => {
        expect(
          screen.getByText(/cannot allocate more than available quantity \(5\)/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('submit success', () => {
    it('calls allocations API with quantity in exact mode and invokes onSuccess', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: PROJECTS }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /allocate/i }));

      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[1][1].body as string
        );
        expect(body).toMatchObject({ lotId: 'lot-1', projectId: 'proj-1', quantity: 3 });
        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    it('calls allocations API without quantity in qualitative mode', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: PROJECTS }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="qualitative"
          availableQuantity={null}
          unit={null}
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.click(screen.getByRole('button', { name: /allocate/i }));

      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[1][1].body as string
        );
        expect(body.lotId).toBe('lot-1');
        expect(body.projectId).toBe('proj-1');
        expect(body.quantity).toBeUndefined();
        expect(mockSuccess).toHaveBeenCalled();
      });
    });

    it('includes notes when provided', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: PROJECTS }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'For motor driver' } });
      fireEvent.click(screen.getByRole('button', { name: /allocate/i }));

      await waitFor(() => {
        const body = JSON.parse(
          (global.fetch as jest.Mock).mock.calls[1][1].body as string
        );
        expect(body.notes).toBe('For motor driver');
      });
    });
  });

  describe('submit failure', () => {
    it('shows error message when API call fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: PROJECTS }) })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'Insufficient stock' }),
        });

      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /allocate/i }));

      await waitFor(() => {
        expect(screen.getByText('Insufficient stock')).toBeInTheDocument();
        expect(mockSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows fallback error when no message in response', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: PROJECTS }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({}) });

      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /allocate/i }));

      await waitFor(() => {
        expect(screen.getByText('Failed to allocate')).toBeInTheDocument();
      });
    });

    it('shows network error when fetch throws', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: PROJECTS }) })
        .mockRejectedValueOnce(new Error('Network down'));

      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
          onClose={mockClose}
          onSuccess={mockSuccess}
        />
      );
      await waitFor(() => screen.getByRole('combobox'));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proj-1' } });
      fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
      fireEvent.click(screen.getByRole('button', { name: /allocate/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('cancel / close', () => {
    it('calls onClose when Cancel is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
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
        json: async () => ({ data: PROJECTS }),
      });
      render(
        <AllocateModal
          lotId="lot-1"
          quantityMode="exact"
          availableQuantity={10}
          unit="pcs"
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
