/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPartDialog } from '../EditPartDialog';
import type { PartDetail } from '../../types';

// ── UI component mocks ────────────────────────────────────────────────────────

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div>
      <select
        data-testid="category-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

jest.mock('lucide-react', () => ({
  PlusIcon: () => <span data-testid="plus-icon" />,
  TrashIcon: () => <span data-testid="trash-icon" />,
  BookOpenIcon: () => <span data-testid="book-open-icon" />,
}));

jest.mock('../CategoryCombobox', () => ({
  CategoryCombobox: ({
    id,
    value,
    onValueChange,
  }: {
    id?: string;
    value: string;
    onValueChange: (v: string) => void;
    onCategorySelect?: (cat: unknown) => void;
    categories?: unknown[];
    placeholder?: string;
  }) => (
    <input
      id={id}
      data-testid="category-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const basePart: PartDetail = {
  id: 'part-1',
  name: 'ESP32-WROOM-32',
  category: 'Microcontrollers',
  manufacturer: 'Espressif',
  mpn: 'ESP32-WROOM-32D',
  notes: 'Wi-Fi + BT module',
  tags: ['smd', 'wifi'],
  parameters: { voltage: '3.3V', frequency: '240MHz' },
  archivedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  totalQuantity: 0,
  availableQuantity: 0,
  reservedQuantity: 0,
  inUseQuantity: 0,
  scrappedQuantity: 0,
  qualitativeStatuses: [],
  lotCount: 0,
  lots: [],
};

/** Shape returned by PATCH /api/parts/[id] — does NOT include lots. */
const { lots: _lots, ...basePatchPart } = basePart;

function renderDialog(overrides?: Partial<typeof basePart>, open = true) {
  const onOpenChange = jest.fn();
  const onSave = jest.fn();
  const part = { ...basePart, ...overrides };
  render(
    <EditPartDialog
      open={open}
      onOpenChange={onOpenChange}
      part={part}
      onSave={onSave}
    />
  );
  return { onOpenChange, onSave, part };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the first fetch call that targets the PATCH parts endpoint.
 */
function getPatchCall(): [string, RequestInit] | undefined {
  const calls = (global.fetch as jest.Mock).mock.calls as [string, RequestInit][];
  return calls.find(([url, opts]) => url.includes('/api/parts/') && opts?.method === 'PATCH');
}

function makeFetchMock(patchResponse: { ok: boolean; body?: object }) {
  return jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/categories')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [], defaults: [] }),
      });
    }
    if (opts?.method === 'PATCH') {
      return Promise.resolve({
        ok: patchResponse.ok,
        json: async () =>
          patchResponse.ok
            // Matches real PATCH response: no `lots` field
            ? { data: { ...basePatchPart, name: 'Updated Name' } }
            : patchResponse.body ?? {},
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditPartDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = makeFetchMock({ ok: true });
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      renderDialog(undefined, false);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('renders the dialog when open', () => {
      renderDialog();
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Part')).toBeInTheDocument();
    });

    it('pre-fills name field with part name', () => {
      renderDialog();
      expect(screen.getByDisplayValue('ESP32-WROOM-32')).toBeInTheDocument();
    });

    it('pre-fills manufacturer field', () => {
      renderDialog();
      expect(screen.getByDisplayValue('Espressif')).toBeInTheDocument();
    });

    it('pre-fills MPN field', () => {
      renderDialog();
      expect(screen.getByDisplayValue('ESP32-WROOM-32D')).toBeInTheDocument();
    });

    it('pre-fills notes field', () => {
      renderDialog();
      expect(screen.getByDisplayValue('Wi-Fi + BT module')).toBeInTheDocument();
    });

    it('renders tags as comma-separated string', () => {
      renderDialog();
      expect(screen.getByDisplayValue('smd, wifi')).toBeInTheDocument();
    });

    it('renders parameter rows for each entry', () => {
      renderDialog();
      expect(screen.getByDisplayValue('voltage')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3.3V')).toBeInTheDocument();
      expect(screen.getByDisplayValue('frequency')).toBeInTheDocument();
      expect(screen.getByDisplayValue('240MHz')).toBeInTheDocument();
    });

    it('shows "No parameters" message when parameters is empty', () => {
      renderDialog({ parameters: {} });
      expect(screen.getByText(/No parameters/i)).toBeInTheDocument();
    });

    it('renders empty fields for nullable part fields', () => {
      renderDialog({ manufacturer: null, mpn: null, notes: null, category: null });
      // All these fields should exist but be empty
      const inputs = screen.getAllByRole('textbox');
      // At least name field should be present
      expect(inputs.some((i) => (i as HTMLInputElement).value === 'ESP32-WROOM-32')).toBe(true);
    });
  });

  // ── Param rows ──────────────────────────────────────────────────────────────

  describe('parameter row management', () => {
    it('adds a new empty row when "Add row" is clicked', () => {
      renderDialog();
      const addBtn = screen.getByText(/Add row/i);
      fireEvent.click(addBtn);
      // Should now have 3 key inputs and 3 value inputs (2 original + 1 new)
      const keyInputs = screen.getAllByPlaceholderText('Key');
      expect(keyInputs).toHaveLength(3);
    });

    it('removes a row when the trash button is clicked', () => {
      renderDialog();
      const removeButtons = screen.getAllByRole('button', { name: /Remove row/i });
      fireEvent.click(removeButtons[0]);
      const keyInputs = screen.getAllByPlaceholderText('Key');
      expect(keyInputs).toHaveLength(1);
    });

    it('shows empty state message after all rows are removed', () => {
      renderDialog({ parameters: { voltage: '3.3V' } });
      const removeBtn = screen.getByRole('button', { name: /Remove row/i });
      fireEvent.click(removeBtn);
      expect(screen.getByText(/No parameters/i)).toBeInTheDocument();
    });

    it('updates key value when user types in key input', () => {
      renderDialog({ parameters: { voltage: '3.3V' } });
      const keyInput = screen.getByDisplayValue('voltage') as HTMLInputElement;
      fireEvent.change(keyInput, { target: { value: 'vcc' } });
      expect(keyInput.value).toBe('vcc');
    });
  });

  // ── Form submit ─────────────────────────────────────────────────────────────

  describe('form submission', () => {
    it('calls PATCH /api/parts/:id with correct body on submit', async () => {
      renderDialog();
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const patchCall = getPatchCall();
      expect(patchCall).toBeDefined();
      expect(patchCall![0]).toBe('/api/parts/part-1');
      expect(patchCall![1]).toMatchObject({ method: 'PATCH', headers: { 'Content-Type': 'application/json' } });

      const body = JSON.parse(patchCall![1].body as string);
      expect(body.name).toBe('ESP32-WROOM-32');
      expect(body.manufacturer).toBe('Espressif');
      expect(body.mpn).toBe('ESP32-WROOM-32D');
      expect(body.tags).toEqual(['smd', 'wifi']);
      expect(body.parameters).toEqual({ voltage: '3.3V', frequency: '240MHz' });
    });

    it('calls onSave with updated part data on success, preserving lots from original part', async () => {
      const { onSave, onOpenChange } = renderDialog();
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;

      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Updated Name',
          // lots is NOT returned by PATCH, so it must be preserved from the original part
          lots: basePart.lots,
        }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('converts empty string category to null in the request body', async () => {
      renderDialog({ category: null });
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const body = JSON.parse(getPatchCall()![1].body as string);
      expect(body.category).toBeNull();
    });

    it('converts empty manufacturer to null in the request body', async () => {
      renderDialog({ manufacturer: null });
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const body = JSON.parse(getPatchCall()![1].body as string);
      expect(body.manufacturer).toBeNull();
    });

    it('parses comma-separated tags correctly', async () => {
      renderDialog({ tags: ['alpha', 'beta', 'gamma'] });
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const body = JSON.parse(getPatchCall()![1].body as string);
      expect(body.tags).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('filters out empty tag strings', async () => {
      renderDialog({ tags: [] });
      const tagsInput = screen.getByPlaceholderText('e.g. smd, passive, 0402');
      fireEvent.change(tagsInput, { target: { value: 'a, , b,  ' } });

      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const body = JSON.parse(getPatchCall()![1].body as string);
      expect(body.tags).toEqual(['a', 'b']);
    });

    it('skips parameter rows with empty keys', async () => {
      renderDialog({ parameters: { voltage: '3.3V' } });
      fireEvent.click(screen.getByText(/Add row/i));
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      const body = JSON.parse(getPatchCall()![1].body as string);
      expect(Object.keys(body.parameters)).toEqual(['voltage']);
    });

    it('does not submit when name is empty', async () => {
      renderDialog({ name: '' });
      // When name is empty the submit button is disabled; try submitting the form directly
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      fireEvent.submit(form);
      // fetch should not have been called
      expect(global.fetch).not.toHaveBeenCalledWith('/api/parts/part-1', expect.anything());
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('shows error message when API returns non-ok response', async () => {
      global.fetch = makeFetchMock({ ok: false, body: { message: 'Name already exists' } });

      renderDialog();
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Name already exists')).toBeInTheDocument();
      });
    });

    it('shows fallback error message when API error has no message', async () => {
      global.fetch = makeFetchMock({ ok: false, body: {} });

      renderDialog();
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to update part')).toBeInTheDocument();
      });
    });

    it('shows fallback error when fetch throws', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/api/categories')) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [], defaults: [] }) });
        }
        return Promise.reject(new Error('Network error'));
      });

      renderDialog();
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('does not call onSave on error', async () => {
      global.fetch = makeFetchMock({ ok: false, body: { message: 'Bad request' } });

      const { onSave } = renderDialog();
      const form = screen.getByRole('button', { name: /Save changes/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      await waitFor(() => screen.getByText('Bad request'));
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  // ── Cancel ──────────────────────────────────────────────────────────────────

  describe('cancel button', () => {
    it('calls onOpenChange(false) when Cancel is clicked', () => {
      const { onOpenChange } = renderDialog();
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ── Categories fetch ─────────────────────────────────────────────────────────

  describe('categories loading', () => {
    it('fetches categories on mount', async () => {
      renderDialog();

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls as [string][];
        expect(calls.some(([url]) => url.includes('/api/categories'))).toBe(true);
      });
    });

    it('does not crash when categories fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      // Should render without throwing
      renderDialog();
      expect(screen.getByText('Edit Part')).toBeInTheDocument();
    });
  });

  // ── Reset on open ────────────────────────────────────────────────────────────

  describe('form reset on open', () => {
    it('resets form fields when dialog reopens', async () => {
      const { rerender } = render(
        <EditPartDialog
          open={false}
          onOpenChange={jest.fn()}
          part={basePart}
          onSave={jest.fn()}
        />
      );

      rerender(
        <EditPartDialog
          open={true}
          onOpenChange={jest.fn()}
          part={{ ...basePart, name: 'New Name' }}
          onSave={jest.fn()}
        />
      );

      expect(screen.getByDisplayValue('New Name')).toBeInTheDocument();
    });
  });
});
