/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CategoryCombobox, type CategoryOptionWithSchema } from '../CategoryCombobox';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  CheckIcon: ({ className }: { className?: string }) => (
    <span data-testid="check-icon" className={className} />
  ),
  ChevronsUpDownIcon: () => <span data-testid="chevrons-icon" />,
  XIcon: ({
    onClick,
    'aria-label': ariaLabel,
  }: {
    onClick?: (e: React.MouseEvent) => void;
    'aria-label'?: string;
  }) => (
    <button
      data-testid="x-icon"
      aria-label={ariaLabel}
      onClick={onClick}
      type="button"
    />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    role,
    'aria-expanded': ariaExpanded,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    'aria-expanded'?: boolean;
    children?: React.ReactNode;
  }) => (
    <button
      type={type ?? 'button'}
      role={role}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  ),
}));

// Popover: context-based mock so PopoverContent only renders when open
const PopoverContext = React.createContext<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

jest.mock('@/components/ui/popover', () => {
  const React = require('react');

  const PopoverCtx = React.createContext({ open: false, onOpenChange: (_v: boolean) => {} });

  const Popover = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <PopoverCtx.Provider value={{ open, onOpenChange }}>
      <div data-testid="popover">{children}</div>
    </PopoverCtx.Provider>
  );

  const PopoverTrigger = ({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
  }) => {
    const { open, onOpenChange } = React.useContext(PopoverCtx);
    const child = React.Children.only(children) as React.ReactElement;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        onOpenChange(!open);
        if (child.props.onClick) child.props.onClick(e);
      },
    });
  };

  const PopoverContent = ({ children }: { children: React.ReactNode }) => {
    const { open } = React.useContext(PopoverCtx);
    return open ? <div data-testid="popover-content">{children}</div> : null;
  };

  return { Popover, PopoverTrigger, PopoverContent };
});

jest.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command">{children}</div>
  ),
  CommandInput: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="command-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading?: string;
  }) => (
    <div data-testid="command-group" data-heading={heading}>
      {children}
    </div>
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    value?: string;
  }) => (
    <div
      data-testid="command-item"
      data-value={value}
      role="option"
      onClick={onSelect}
    >
      {children}
    </div>
  ),
}));

// ── Test data ─────────────────────────────────────────────────────────────────

const CATEGORIES: CategoryOptionWithSchema[] = [
  {
    id: 'cat-1',
    name: 'Resistors',
    parameterSchema: { resistance: 'string', tolerance: 'string' },
  },
  {
    id: 'cat-2',
    name: 'Capacitors',
    parameterSchema: { capacitance: 'string', voltage: 'string' },
  },
  {
    id: 'cat-3',
    name: 'Microcontrollers',
    parameterSchema: { core: 'string', pins: 'number' },
  },
];

function renderCombobox(
  props: Partial<React.ComponentProps<typeof CategoryCombobox>> = {}
) {
  const onValueChange = jest.fn();
  const onCategorySelect = jest.fn();
  const { rerender } = render(
    <CategoryCombobox
      value=""
      onValueChange={onValueChange}
      onCategorySelect={onCategorySelect}
      categories={CATEGORIES}
      {...props}
    />
  );
  return { onValueChange, onCategorySelect, rerender };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CategoryCombobox', () => {
  describe('rendering', () => {
    it('renders the trigger button with placeholder when no value', () => {
      renderCombobox({ value: '' });
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Select or type a category…')).toBeInTheDocument();
    });

    it('renders a custom placeholder', () => {
      renderCombobox({ value: '', placeholder: 'Pick one…' });
      expect(screen.getByText('Pick one…')).toBeInTheDocument();
    });

    it('renders the current value in the trigger button', () => {
      renderCombobox({ value: 'Resistors' });
      expect(screen.getByRole('combobox')).toHaveTextContent('Resistors');
    });

    it('shows the X clear button only when value is set', () => {
      const { rerender, onValueChange, onCategorySelect } = renderCombobox({ value: '' });
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();

      rerender(
        <CategoryCombobox
          value="Resistors"
          onValueChange={onValueChange}
          onCategorySelect={onCategorySelect}
          categories={CATEGORIES}
        />
      );
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('applies the id prop to the trigger button', () => {
      renderCombobox({ id: 'my-combobox' });
      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'my-combobox');
    });
  });

  describe('opening and closing', () => {
    it('opens the popover when trigger is clicked', () => {
      renderCombobox();
      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });

    it('closes the popover when trigger is clicked again', () => {
      renderCombobox();
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('shows all categories when popover is open with empty input', () => {
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      const items = screen.getAllByTestId('command-item');
      expect(items).toHaveLength(CATEGORIES.length);
    });

    it('filters categories by typed input (case-insensitive)', () => {
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'res' },
      });
      const items = screen.getAllByTestId('command-item');
      // "Resistors" matches "res", "Microcontrollers" matches "res" too
      expect(items.length).toBeGreaterThanOrEqual(1);
      const texts = items.map((el) => el.textContent ?? '');
      expect(texts.some((t) => t.toLowerCase().includes('resistors'))).toBe(true);
    });

    it('shows "Use …" create option when input has no exact match', () => {
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'NewCategory' },
      });
      // "Use" text and the new name should appear (quotes are HTML entities → curly quotes)
      expect(screen.getByText('Use')).toBeInTheDocument();
      // The create item has data-value="__create__NewCategory"
      expect(
        screen.getByRole('option', { name: /NewCategory/i })
      ).toBeInTheDocument();
    });

    it('does NOT show "Use …" option when input exactly matches a category', () => {
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'Resistors' },
      });
      expect(screen.queryByText('Use')).not.toBeInTheDocument();
    });

    it('does NOT show "Use …" option when input is empty', () => {
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.queryByText('Use')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onValueChange and onCategorySelect when an item is selected', () => {
      const { onValueChange, onCategorySelect } = renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      const items = screen.getAllByTestId('command-item');
      const resistorItem = items.find((el) => el.textContent?.includes('Resistors'));
      expect(resistorItem).toBeDefined();
      fireEvent.click(resistorItem!);
      expect(onValueChange).toHaveBeenCalledWith('Resistors');
      expect(onCategorySelect).toHaveBeenCalledWith(CATEGORIES[0]);
    });

    it('passes schema-less category when "Use new name" is selected', () => {
      const { onValueChange, onCategorySelect } = renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'BrandNew' },
      });
      const createItem = screen
        .getAllByTestId('command-item')
        .find((el) => el.dataset.value === '__create__BrandNew');
      expect(createItem).toBeDefined();
      fireEvent.click(createItem!);
      expect(onValueChange).toHaveBeenCalledWith('BrandNew');
      expect(onCategorySelect).toHaveBeenCalledWith({
        id: null,
        name: 'BrandNew',
        parameterSchema: {},
      });
    });

    it('closes popover after selection', () => {
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      const items = screen.getAllByTestId('command-item');
      fireEvent.click(items[0]);
      expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
    });
  });

  describe('typing in CommandInput', () => {
    it('calls onValueChange as user types', () => {
      const { onValueChange } = renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'Cap' },
      });
      expect(onValueChange).toHaveBeenCalledWith('Cap');
    });

    it('calls onCategorySelect with matched category when typed text exactly matches', () => {
      const { onCategorySelect } = renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'Capacitors' },
      });
      expect(onCategorySelect).toHaveBeenCalledWith(CATEGORIES[1]);
    });

    it('calls onCategorySelect with null when input is cleared via typing', () => {
      const { onCategorySelect } = renderCombobox({ value: 'Resistors' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: '' },
      });
      expect(onCategorySelect).toHaveBeenCalledWith(null);
    });

    it('does NOT call onCategorySelect for partial non-matching input', () => {
      const { onCategorySelect } = renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.change(screen.getByTestId('command-input'), {
        target: { value: 'Res' },
      });
      // Not an exact match and not empty → no callback
      expect(onCategorySelect).not.toHaveBeenCalled();
    });
  });

  describe('clear button', () => {
    it('calls onValueChange("") and onCategorySelect(null) when X is clicked', () => {
      const { onValueChange, onCategorySelect } = renderCombobox({
        value: 'Resistors',
      });
      fireEvent.click(screen.getByTestId('x-icon'));
      expect(onValueChange).toHaveBeenCalledWith('');
      expect(onCategorySelect).toHaveBeenCalledWith(null);
    });
  });

  describe('external value sync', () => {
    it('syncs inputValue when external value prop changes after mount', () => {
      const { rerender, onValueChange, onCategorySelect } = renderCombobox({
        value: 'Resistors',
      });
      // Trigger is showing Resistors initially
      expect(screen.getByRole('combobox')).toHaveTextContent('Resistors');

      // Simulate parent resetting value to ''
      rerender(
        <CategoryCombobox
          value=""
          onValueChange={onValueChange}
          onCategorySelect={onCategorySelect}
          categories={CATEGORIES}
        />
      );
      expect(screen.getByRole('combobox')).toHaveTextContent(
        'Select or type a category…'
      );
    });
  });

  describe('check icon visibility', () => {
    it('renders a visible check icon next to the currently selected category', () => {
      renderCombobox({ value: 'Resistors' });
      fireEvent.click(screen.getByRole('combobox'));
      const items = screen.getAllByTestId('command-item');
      const resistorItem = items.find((el) => el.textContent?.includes('Resistors'));
      expect(resistorItem).toBeDefined();
      const checkIcon = resistorItem!.querySelector('[data-testid="check-icon"]');
      expect(checkIcon).not.toBeNull();
      expect(checkIcon).toHaveClass('opacity-100');
    });

    it('renders a hidden check icon for non-selected categories', () => {
      // When no value is set, all categories show with opacity-0 check icons
      renderCombobox({ value: '' });
      fireEvent.click(screen.getByRole('combobox'));
      const items = screen.getAllByTestId('command-item');
      items.forEach((item) => {
        const checkIcon = item.querySelector('[data-testid="check-icon"]');
        expect(checkIcon).not.toBeNull();
        expect(checkIcon).toHaveClass('opacity-0');
      });
    });
  });
});
