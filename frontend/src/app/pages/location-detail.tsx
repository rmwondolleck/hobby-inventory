import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DataTable } from "../components/data-table";
import { api } from "../lib/api";
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Folder,
  Package2,
  Plus,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export function LocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    name: "",
    parentId: "",
    notes: "",
  });

  // Create child dialog
  const [createChildDialogOpen, setCreateChildDialogOpen] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [childNotes, setChildNotes] = useState("");

  async function loadLocation() {
    if (!id) return;

    try {
      setLoading(true);
      const response = await api.getLocation(id);
      setLocation(response.data);
    } catch (error: any) {
      console.error("Failed to load location:", error);
      toast.error(error.message || "Failed to load location");
    } finally {
      setLoading(false);
    }
  }

  async function loadAllLocations() {
    try {
      const response = await api.getLocations({ limit: 500 });
      // Filter out current location and its children to prevent cycles
      const filtered = (response.data || []).filter(
        (loc: any) => loc.id !== id && !loc.path?.startsWith(location?.path + '/')
      );
      setAllLocations(filtered);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  }

  useEffect(() => {
    loadLocation();
  }, [id]);

  useEffect(() => {
    if (editDialogOpen && location) {
      loadAllLocations();
    }
  }, [editDialogOpen, location]);

  function openEditDialog() {
    setEditForm({
      name: location.name,
      parentId: location.parentId || "",
      notes: location.notes || "",
    });
    setEditDialogOpen(true);
  }

  async function handleUpdate() {
    if (!editForm.name.trim()) {
      toast.error("Location name is required");
      return;
    }

    try {
      setUpdating(true);
      await api.updateLocation(id!, {
        name: editForm.name,
        parentId: editForm.parentId || null,
        notes: editForm.notes || null,
      });

      toast.success("Location updated");
      setEditDialogOpen(false);
      loadLocation();
    } catch (error: any) {
      console.error("Failed to update location:", error);
      toast.error(error.message || "Failed to update location");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this location? This will fail if it has children or contains lots.")) {
      return;
    }

    try {
      await api.deleteLocation(id!);
      toast.success("Location deleted");
      navigate("/locations");
    } catch (error: any) {
      console.error("Failed to delete location:", error);
      toast.error(error.message || "Failed to delete location");
    }
  }

  async function handleCreateChild() {
    if (!childName.trim()) {
      toast.error("Location name is required");
      return;
    }

    try {
      setCreatingChild(true);
      await api.createLocation({
        name: childName,
        parentId: id,
        notes: childNotes || null,
      });

      toast.success(`Created sublocation "${childName}"`);
      setCreateChildDialogOpen(false);
      setChildName("");
      setChildNotes("");
      loadLocation();
    } catch (error: any) {
      console.error("Failed to create child location:", error);
      toast.error(error.message || "Failed to create child location");
    } finally {
      setCreatingChild(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Loading location...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-destructive">Location not found</p>
      </div>
    );
  }

  // Parse breadcrumbs from path
  const pathParts = location.path ? location.path.split('/') : [location.name];
  const breadcrumbs = pathParts.map((part: string, index: number) => ({
    name: part,
    isLast: index === pathParts.length - 1,
  }));

  const lotColumns = [
    {
      key: 'part',
      label: 'Part',
      render: (lot: any) => (
        <div>
          <Link
            to={`/parts/${lot.part.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {lot.part.name}
          </Link>
          {lot.part.category && (
            <p className="text-xs text-muted-foreground">{lot.part.category}</p>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (lot: any) => (
        <Link
          to={`/lots/${lot.id}`}
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {lot.quantityMode === 'exact' ? (
            <span>
              {lot.quantity} {lot.unit}
            </span>
          ) : (
            <Badge variant="secondary">{lot.qualitativeStatus}</Badge>
          )}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (lot: any) => <Badge variant="outline">{lot.status}</Badge>,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/locations")}
          className="mb-4"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Locations
        </Button>

        <div className="flex items-start justify-between">
          <div>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="size-3" />}
                  <span className={crumb.isLast ? 'text-foreground font-medium' : ''}>
                    {crumb.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="size-8 text-green-500" />
              <h1 className="text-3xl font-semibold text-foreground">{location.name}</h1>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-destructive">
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Notes */}
      {location.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{location.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Child Locations */}
      {(location.children && location.children.length > 0) || (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sublocations</CardTitle>
                <CardDescription>
                  {location.children?.length || 0} sublocation{location.children?.length !== 1 ? 's' : ''} inside this location
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreateChildDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                Add Sublocation
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {location.children && location.children.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {location.children.map((child: any) => (
                  <Link
                    key={child.id}
                    to={`/locations/${child.id}`}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary/50 transition-colors group"
                  >
                    <Folder className="size-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {child.name}
                      </p>
                      {child.notes && (
                        <p className="text-xs text-muted-foreground truncate">{child.notes}</p>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Folder className="size-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">No sublocations yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lots Stored Here */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            {location.lots?.length || 0} lot{location.lots?.length !== 1 ? 's' : ''} stored at this location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {location.lots && location.lots.length > 0 ? (
            <DataTable
              columns={lotColumns}
              data={location.lots}
              keyExtractor={(lot) => lot.id}
            />
          ) : (
            <div className="text-center py-12">
              <Package2 className="size-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground mb-1">No inventory here</p>
              <p className="text-sm text-muted-foreground">
                Move lots to this location or add new stock
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update location details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Parent Location</label>
              <Select
                value={editForm.parentId}
                onValueChange={(value) => setEditForm({ ...editForm, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (top level)</SelectItem>
                  {allLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Child Dialog */}
      <Dialog open={createChildDialogOpen} onOpenChange={setCreateChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sublocation</DialogTitle>
            <DialogDescription>
              Create a new location inside "{location.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="e.g., Bin A, Drawer 1"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Path will be: {location.path}/{childName || '...'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Description or usage notes..."
                value={childNotes}
                onChange={(e) => setChildNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setCreateChildDialogOpen(false)}
              disabled={creatingChild}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateChild} disabled={creatingChild}>
              {creatingChild ? "Creating..." : "Create Sublocation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
