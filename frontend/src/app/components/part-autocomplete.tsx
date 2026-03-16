import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./ui/utils";

interface Part {
  id: string;
  name: string;
  category: string | null;
  manufacturer: string | null;
  mpn: string | null;
}

interface PartAutocompleteProps {
  value: string | null;
  onSelect: (part: Part | null) => void;
  placeholder?: string;
}

export function PartAutocomplete({
  value,
  onSelect,
  placeholder = "Search parts...",
}: PartAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (search.length < 2) {
      setParts([]);
      return;
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.getParts({
          search,
          limit: 20,
        });
        setParts(response.data || []);
      } catch (error) {
        console.error("Failed to search parts:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  const selectedPart = parts.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedPart ? (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedPart.name}</span>
              {selectedPart.category && (
                <span className="text-xs text-muted-foreground">
                  {selectedPart.category}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Searching...
              </div>
            ) : search.length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
            ) : parts.length === 0 ? (
              <CommandEmpty>No parts found</CommandEmpty>
            ) : (
              <CommandGroup>
                {parts.map((part) => (
                  <CommandItem
                    key={part.id}
                    value={part.id}
                    onSelect={() => {
                      onSelect(part);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === part.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{part.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[part.category, part.manufacturer, part.mpn]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
