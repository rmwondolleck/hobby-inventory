'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CategoryOptionWithSchema {
  id: string | null;
  name: string;
  parameterSchema: Record<string, unknown>;
}

interface CategoryComboboxProps {
  id?: string;
  value: string;
  onValueChange: (name: string) => void;
  onCategorySelect?: (category: CategoryOptionWithSchema | null) => void;
  categories: CategoryOptionWithSchema[];
  placeholder?: string;
}

export function CategoryCombobox({
  id,
  value,
  onValueChange,
  onCategorySelect,
  categories,
  placeholder = 'Select or type a category…',
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const didMount = useRef(false);

  // Sync inputValue when external value changes (e.g. dialog reset)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setInputValue(value);
  }, [value]);

  function handleSelect(name: string) {
    const match = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    onValueChange(name);
    setInputValue(name);
    onCategorySelect?.(match ?? { id: null, name, parameterSchema: {} });
    setOpen(false);
  }

  function handleInputChange(typed: string) {
    setInputValue(typed);
    onValueChange(typed);
    // If typed exactly matches an existing category, seed its schema
    const exact = categories.find((c) => c.name.toLowerCase() === typed.toLowerCase());
    if (exact) {
      onCategorySelect?.(exact);
    } else if (typed === '') {
      onCategorySelect?.(null);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setInputValue('');
    onValueChange('');
    onCategorySelect?.(null);
  }

  const trimmedInput = inputValue.trim();
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(trimmedInput.toLowerCase())
  );
  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === trimmedInput.toLowerCase()
  );
  const showCreateOption = trimmedInput.length > 0 && !exactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          type="button"
        >
          <span className={cn('truncate', !inputValue && 'text-muted-foreground')}>
            {inputValue || placeholder}
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {inputValue && (
              <XIcon
                className="size-3.5 opacity-50 hover:opacity-100"
                onClick={handleClear}
                aria-label="Clear category"
              />
            )}
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a new category…"
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>No categories found.</CommandEmpty>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((cat) => (
                  <CommandItem
                    key={cat.name}
                    value={cat.name}
                    onSelect={() => handleSelect(cat.name)}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 size-4',
                        value === cat.name ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateOption && (
              <CommandGroup heading="New">
                <CommandItem
                  value={`__create__${trimmedInput}`}
                  onSelect={() => handleSelect(trimmedInput)}
                >
                  <span className="text-muted-foreground mr-1">Use</span>
                  &ldquo;{trimmedInput}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
