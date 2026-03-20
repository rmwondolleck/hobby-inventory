/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DuplicatePartDialog } from '../DuplicatePartDialog';
import type { PartDetail } from '../../types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const PART: PartDetail = {
  id: 'part-1',
  name: 'Arduino Uno',
  category: 'Microcontrollers',
  manufacturer: 'Arduino',
  mpn: 'A000066',
  tags: ['arduino', 'microcontroller'],
  notes: 'Classic board',
  parameters: { voltage: '5V', pins: '14' },
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  totalQuantity: 0,
  availableQuantity: 0,
  reservedQuantity: 0,
  inUseQuantity: 0,
  scrappedQuantity: 0,
  qualitativeStatuses: [],
  lotCount: 0,
  lots: [],
};

const MINIMAL_PART: PartDetail = {
  id: 'part-2',
  name: 'Resistor',
  category: null,
  manufacturer: null,
  mpn: null,
  tags: [],
  notes: null,
  parameters: {},
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  totalQuantity: 0,
  availableQuantity: 0,
  reservedQuantity: 0,
  inUseQuantity: 0,
  scrappedQuantity: 0,
  qualitativeStatuses: [],
  lotCount: 0,
  lots: [],
};

const mockOnOpenChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

function renderDialog(part: PartDetail = PART, open = true) {
  return render(
    <DuplicatePartDialog part={part} open={open} onOpenChange={mockOnOpenChange} />,
  );
}

describe('DuplicatePartDialog', () => {
  describe('rendering', () => {
    it('renders the dialog title', () => {
      renderDialog();
      expect(screen.getByText('Duplicate Part')).toBeInTheDocument();
    });

    it('pre-fills name with "(copy)" suffix', () => {
      renderDialog();
      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Arduino Uno (copy)');
    });

    it('pre-fills category', () => {
      renderDialog();
      expect(screen.getByLabelText(/category/i)).toHaveValue('Microcontrollers');
    });

    it('pre-fills manufacturer', () => {
      renderDialog();
      expect(screen.getByLabelText(/manufacturer/i)).toHaveValue('Arduino');
    });

    it('pre-fills MPN', () => {
      renderDialog();
      expect(screen.getByLabelText(/mpn/i)).toHaveValue('A000066');
    });

    it('pre-fills notes', () => {
      renderDialog();
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Classic board');
    });

    it('pre-fills tags as comma-separated string', () => {
      renderDialog();
      expect(screen.getByLabelText(/tags/i)).toHaveValue('arduino, microcontroller');
    });

    it('renders parameter rows from part.parameters', () => {
      renderDialog();
      const keyInputs = screen.getAllByPlaceholderText('Key');
      const valueInputs = screen.getAllByPlaceholderText('Value');
      expect(keyInputs).toHaveLength(2);
      expect(keyInputs[0]).toHaveValue('voltage');
      expect(valueInputs[0]).toHaveValue('5V');
      expect(keyInputs[1]).toHaveValue('pins');
      expect(valueInputs[1]).toHaveValue('14');
    });

    it('renders with empty optional fields for minimal part', () => {
      renderDialog(MINIMAL_PART);
      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Resistor (copy)');
      expect(screen.getByLabelText(/category/i)).toHaveValue('');
      expect(screen.getByLabelText(/tags/i)).toHaveValue('');
      expect(screen.queryAllByPlaceholderText('Key')).toHaveLength(0);
    });

    it('renders Cancel and Save buttons', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save as new part/i })).toBeInTheDocument();
    });

    it('does not render when open=false', () => {
      renderDialog(PART, false);
      expect(screen.queryByText('Duplicate Part')).not.toBeInTheDocument();
    });
  });

  describe('parameter row management', () => {
    it('adds a new empty parameter row when "+ Add parameter" is clicked', () => {
      renderDialog();
      const addBtn = screen.getByRole('button', { name: /add parameter/i });
      fireEvent.click(addBtn);
      expect(screen.getAllByPlaceholderText('Key')).toHaveLength(3);
    });

    it('removes a parameter row when remove button is clicked', () => {
      renderDialog();
      const removeButtons = screen.getAllByRole('button', { name: /remove parameter/i });
      fireEvent.click(removeButtons[0]);
      expect(screen.getAllByPlaceholderText('Key')).toHaveLength(1);
    });

    it('updates parameter key when edited', () => {
      renderDialog();
      const keyInputs = screen.getAllByPlaceholderText('Key');
      fireEvent.change(keyInputs[0], { target: { value: 'frequency' } });
      expect(keyInputs[0]).toHaveValue('frequency');
    });

    it('updates parameter value when edited', () => {
      renderDialog();
      const valueInputs = screen.getAllByPlaceholderText('Value');
      fireEvent.change(valueInputs[0], { target: { value: '3.3V' } });
      expect(valueInputs[0]).toHaveValue('3.3V');
    });
  });

  describe('cancel button', () => {
    it('calls onOpenChange(false) when Cancel is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('form submission — success', () => {
    it('calls POST /api/parts with correct payload and navigates to new part', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-part-99' }),
      });

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/parts/new-part-99'));

      const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('/api/parts');
      expect(opts.method).toBe('POST');

      const body = JSON.parse(opts.body);
      expect(body.name).toBe('Arduino Uno (copy)');
      expect(body.category).toBe('Microcontrollers');
      expect(body.manufacturer).toBe('Arduino');
      expect(body.mpn).toBe('A000066');
      expect(body.tags).toEqual(['arduino', 'microcontroller']);
      expect(body.parameters).toEqual({ voltage: '5V', pins: '14' });
    });

    it('calls onOpenChange(false) on successful submission', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-part-99' }),
      });

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() => expect(mockOnOpenChange).toHaveBeenCalledWith(false));
    });

    it('strips empty optional fields from payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-part-100' }),
      });

      renderDialog(MINIMAL_PART);
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.category).toBeUndefined();
      expect(body.manufacturer).toBeUndefined();
      expect(body.mpn).toBeUndefined();
      expect(body.notes).toBeUndefined();
    });

    it('omits parameter rows with empty keys', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-part-101' }),
      });

      renderDialog();
      // Add a row with empty key
      fireEvent.click(screen.getByRole('button', { name: /add parameter/i }));
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      // Only the two original keyed params should be present
      expect(Object.keys(body.parameters)).toEqual(['voltage', 'pins']);
    });
  });

  describe('form submission — error handling', () => {
    it('shows error message when API returns non-ok response with message field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Name is required' }),
      });

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() =>
        expect(screen.getByText('Name is required')).toBeInTheDocument(),
      );
    });

    it('shows error message when API returns non-ok response with error field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Internal server error' }),
      });

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() =>
        expect(screen.getByText('Internal server error')).toBeInTheDocument(),
      );
    });

    it('shows fallback error when API returns no message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() =>
        expect(screen.getByText('Failed to create part')).toBeInTheDocument(),
      );
    });

    it('shows error when fetch throws a network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() =>
        expect(screen.getByText('Network failure')).toBeInTheDocument(),
      );
    });

    it('shows generic error for non-Error throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('oops');

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() =>
        expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument(),
      );
    });

    it('does not navigate on error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Bad request' }),
      });

      renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /save as new part/i }));

      await waitFor(() => expect(screen.getByText('Bad request')).toBeInTheDocument());
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('submit button state', () => {
    it('is disabled when name is empty', () => {
      renderDialog();
      const nameInput = screen.getByLabelText(/name \*/i);
      fireEvent.change(nameInput, { target: { value: '' } });
      expect(screen.getByRole('button', { name: /save as new part/i })).toBeDisabled();
    });

    it('is disabled when name is only whitespace', () => {
      renderDialog();
      const nameInput = screen.getByLabelText(/name \*/i);
      fireEvent.change(nameInput, { target: { value: '   ' } });
      expect(screen.getByRole('button', { name: /save as new part/i })).toBeDisabled();
    });

    it('is enabled when name has content', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /save as new part/i })).not.toBeDisabled();
    });
  });
});
