import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api } from "../lib/api";
import { Search, Plus, MapPin, ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { toast } from "sonner";

interface LocationNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  notes: string | null;
  children?: LocationNode[];
  lotCount?: number;
}

function LocationTreeNode({ node, level = 0 }: { node: LocationNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-secondary/50 rounded-lg transition-colors group"
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <div className="size-5" />
        )}

        <Link
          to={`/locations/${node.id}`}
          className="flex-1 flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          {expanded && hasChildren ? (
            <FolderOpen className="size-4 text-blue-500" />
          ) : (
            <Folder className="size-4 text-blue-500" />
          )}
          <span className="font-medium">{node.name}</span>
          {node.lotCount !== undefined && node.lotCount > 0 && (
            <span className="text-xs text-muted-foreground">({node.lotCount} lots)</span>
          )}
        </Link>

        {node.notes && (
          <span className="text-xs text-muted-foreground max-w-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
            {node.notes}
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <LocationTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LocationsList() {
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [flatLocations, setFlatLocations] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [search, setSearch] = useState("");

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    parentId: "",
    notes: "",
  });

  async function loadLocations() {
    try {
      setLoading(true);

      if (viewMode === 'tree') {
        const response = await api.getLocations({ tree: true });
        setLocations(response.data || []);
      } else {
        const response = await api.getLocations({
          limit: 500,
          q: search || undefined,
        });
        setFlatLocations(response.data || []);
      }
    } catch (error: any) {
      console.error("Failed to load locations:", error);
      toast.error(error.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  async function loadFlatLocationsForSelect() {
    try {
      const response = await api.getLocations({ limit: 500 });
      setFlatLocations(response.data || []);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  }

  useEffect(() => {
    loadLocations();
  }, [viewMode, search]);

  useEffect(() => {
    if (createDialogOpen) {
      loadFlatLocationsForSelect();
    }
  }, [createDialogOpen]);

  async function handleCreateLocation() {
    if (!newLocation.name.trim()) {
      toast.error("Location name is required");
      return;
    }

    try {
      setCreating(true);
      await api.createLocation({
        name: newLocation.name,
        parentId: newLocation.parentId || null,
        notes: newLocation.notes || null,
      });

      toast.success(`Created location "${newLocation.name}"`);
      setCreateDialogOpen(false);
      setNewLocation({ name: "", parentId: "", notes: "" });
      loadLocations();
    } catch (error: any) {
      console.error("Failed to create location:", error);
      toast.error(error.message || "Failed to create location");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
            <MapPin className="size-8 text-green-500" />
            Storage Locations
          </h1>
          <p className="text-muted-foreground">
            Organize your physical storage hierarchy
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              New Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Location</DialogTitle>
              <DialogDescription>
                Add a new storage location to your hierarchy
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  placeholder="e.g., Shelf A, Drawer 2, Bin 5"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Location</label>
                <Select
                  value={newLocation.parentId}
                  onValueChange={(value) => setNewLocation({ ...newLocation, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (top level)</SelectItem>
                    {flatLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Description or usage notes..."
                  value={newLocation.notes}
                  onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateLocation} disabled={creating}>
                {creating ? "Creating..." : "Create Location"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
              >
                Tree View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
            </div>

            {viewMode === 'list' && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Loading..." : `${viewMode === 'tree' ? 'Location' : flatLocations.length} Location${viewMode === 'list' && flatLocations.length !== 1 ? 's' : ''} Hierarchy`}
          </CardTitle>
          <CardDescription>
            {viewMode === 'tree' 
              ? 'Hierarchical tree view of all storage locations'
              : `Flat list of ${flatLocations.length} locations`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading locations...</p>
          ) : viewMode === 'tree' ? (
            <div className="space-y-1">
              {locations.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="size-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">No locations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first location to start organizing your inventory
                  </p>
                </div>
              ) : (
                locations.map((location) => (
                  <LocationTreeNode key={location.id} node={location} />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {flatLocations.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="size-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">No locations found</p>
                  <p className="text-sm text-muted-foreground">
                    Try a different search or create a new location
                  </p>
                </div>
              ) : (
                flatLocations.map((location) => (
                  <Link
                    key={location.id}
                    to={`/locations/${location.id}`}
                    className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="size-4 text-blue-500" />
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {location.path}
                        </p>
                        {location.notes && (
                          <p className="text-sm text-muted-foreground">{location.notes}</p>
                        )}
                      </div>
                    </div>
                    {location.lotCount !== undefined && location.lotCount > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {location.lotCount} lot{location.lotCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
