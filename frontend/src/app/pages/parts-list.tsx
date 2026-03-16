import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { DataTable } from "../components/data-table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Package, Plus, Search, Filter, Archive } from "lucide-react";
import { toast } from "sonner";

interface Part {
  id: string;
  name: string;
  category: string | null;
  manufacturer: string | null;
  mpn: string | null;
  tags: string[];
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function PartsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Filters from URL
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const archived = searchParams.get("archived") || "false";
  const offset = parseInt(searchParams.get("offset") || "0");
  const limit = 50;

  const [searchInput, setSearchInput] = useState(search);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadParts();
    loadCategories();
  }, [search, category, archived, offset]);

  async function loadParts() {
    try {
      setLoading(true);
      const response = await api.getParts({
        search: search || undefined,
        category: category || undefined,
        archived: archived === "true" ? true : archived === "false" ? false : undefined,
        limit,
        offset,
      });
      setParts(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error("Failed to load parts:", error);
      toast.error("Failed to load parts");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.getCategories({ limit: 500 });
      const uniqueCategories = Array.from(
        new Set(
          (response.data || [])
            .map((c: any) => c.name)
            .filter(Boolean)
        )
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }

  function updateFilter(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset to first page when filters change
    if (key !== "offset") {
      newParams.delete("offset");
    }
    setSearchParams(newParams);
  }

  function handleSearch() {
    updateFilter("search", searchInput);
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (part: Part) => (
        <div>
          <div className="font-medium text-foreground">{part.name}</div>
          {part.mpn && (
            <div className="text-xs text-muted-foreground mt-0.5">
              MPN: {part.mpn}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (part: Part) => (
        <span className="text-sm text-foreground">
          {part.category || (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: "manufacturer",
      label: "Manufacturer",
      render: (part: Part) => (
        <span className="text-sm text-foreground">
          {part.manufacturer || (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: "tags",
      label: "Tags",
      render: (part: Part) => (
        <div className="flex flex-wrap gap-1">
          {part.tags.length > 0 ? (
            part.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          )}
          {part.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{part.tags.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (part: Part) => (
        part.archivedAt ? (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            <Archive className="size-3 mr-1" />
            Archived
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Active
          </Badge>
        )
      ),
      className: "w-[100px]",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
            <Package className="size-8 text-blue-500" />
            Parts Catalog
          </h1>
          <p className="text-muted-foreground">
            Browse and manage your component library
          </p>
        </div>
        <Button onClick={() => navigate("/intake?mode=new")}>
          <Plus className="size-4 mr-2" />
          New Part
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="size-5 text-muted-foreground" />
          <h3 className="font-medium">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search parts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {/* Category Filter */}
          <Select value={category || "__all__"} onValueChange={(value) => updateFilter("category", value === "__all__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Archived Filter */}
          <Select value={archived || "__all__"} onValueChange={(value) => updateFilter("archived", value === "__all__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Active Only</SelectItem>
              <SelectItem value="true">Archived Only</SelectItem>
              <SelectItem value="__all__">All Parts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filters indicator */}
        {(search || category || archived !== "false") && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {search && (
              <Badge variant="secondary" className="gap-1">
                Search: {search}
                <button
                  onClick={() => {
                    setSearchInput("");
                    updateFilter("search", "");
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="gap-1">
                Category: {category}
                <button
                  onClick={() => updateFilter("category", "")}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            {archived !== "false" && (
              <Badge variant="secondary" className="gap-1">
                {archived === "true" ? "Archived" : "All"}
                <button
                  onClick={() => updateFilter("archived", "false")}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSearchParams({});
              }}
              className="ml-auto text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </Card>

      {/* Results count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {total} part{total !== 1 ? "s" : ""} found
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={parts}
        keyExtractor={(part) => part.id}
        onRowClick={(part) => navigate(`/parts/${part.id}`)}
        loading={loading}
        pagination={{
          total,
          limit,
          offset,
          onPageChange: (newOffset) => updateFilter("offset", newOffset.toString()),
        }}
      />
    </div>
  );
}