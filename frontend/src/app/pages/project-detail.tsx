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
  Archive,
  Plus,
  Package,
  MapPin,
  Circle,
  Rocket,
  CheckCircle2,
  Box,
  RotateCcw,
  Trash2,
  MoveRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const PROJECT_STATUSES = [
  { value: 'idea', label: 'Idea', icon: Circle, color: 'text-gray-400' },
  { value: 'planned', label: 'Planned', icon: Circle, color: 'text-blue-500' },
  { value: 'active', label: 'Active', icon: Rocket, color: 'text-green-500' },
  { value: 'deployed', label: 'Deployed', icon: CheckCircle2, color: 'text-purple-500' },
  { value: 'retired', label: 'Retired', icon: Archive, color: 'text-gray-500' },
];

const ALLOCATION_STATUSES = [
  { value: 'reserved', label: 'Reserved', color: 'text-blue-500' },
  { value: 'in_use', label: 'In Use', color: 'text-yellow-500' },
  { value: 'deployed', label: 'Deployed', color: 'text-green-500' },
  { value: 'recovered', label: 'Recovered', color: 'text-gray-500' },
];

function getStatusBadge(status: string, isAllocation = false) {
  const statuses = isAllocation ? ALLOCATION_STATUSES : PROJECT_STATUSES;
  const statusConfig = statuses.find(s => s.value === status);
  if (!statusConfig) return <Badge variant="outline">{status}</Badge>;

  const Icon = isAllocation ? Box : (statusConfig as any).icon;
  return (
    <Badge variant="outline" className="gap-1.5">
      <Icon className={`size-3 ${statusConfig.color}`} />
      {statusConfig.label}
    </Badge>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    status: "",
    tags: "",
    notes: "",
    wishlistNotes: "",
  });

  // Allocate dialog
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [availableLots, setAvailableLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>("");
  const [allocateQuantity, setAllocateQuantity] = useState("");
  const [allocateNotes, setAllocateNotes] = useState("");
  const [lotSearch, setLotSearch] = useState("");

  async function loadProject() {
    if (!id) return;

    try {
      setLoading(true);
      const response = await api.getProject(id);
      setProject(response.data);
    } catch (error: any) {
      console.error("Failed to load project:", error);
      toast.error(error.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableLots() {
    try {
      const response = await api.getLots({
        limit: 100,
        q: lotSearch || undefined,
        status: 'available',
      });
      setAvailableLots(response.data || []);
    } catch (error: any) {
      console.error("Failed to load lots:", error);
      toast.error(error.message || "Failed to load lots");
    }
  }

  useEffect(() => {
    loadProject();
  }, [id]);

  useEffect(() => {
    if (allocateDialogOpen) {
      loadAvailableLots();
    }
  }, [allocateDialogOpen, lotSearch]);

  function openEditDialog() {
    setEditForm({
      name: project.name,
      status: project.status,
      tags: (project.tags || []).join(', '),
      notes: project.notes || "",
      wishlistNotes: project.wishlistNotes || "",
    });
    setEditDialogOpen(true);
  }

  async function handleUpdate() {
    if (!editForm.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      setUpdating(true);
      const tags = editForm.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      await api.updateProject(id!, {
        name: editForm.name,
        status: editForm.status,
        tags,
        notes: editForm.notes || null,
        wishlistNotes: editForm.wishlistNotes || null,
      });

      toast.success("Project updated");
      setEditDialogOpen(false);
      loadProject();
    } catch (error: any) {
      console.error("Failed to update project:", error);
      toast.error(error.message || "Failed to update project");
    } finally {
      setUpdating(false);
    }
  }

  async function handleArchive() {
    if (!confirm("Archive this project? It will be marked as retired.")) {
      return;
    }

    try {
      await api.deleteProject(id!);
      toast.success("Project archived");
      navigate("/projects");
    } catch (error: any) {
      console.error("Failed to archive project:", error);
      toast.error(error.message || "Failed to archive project");
    }
  }

  async function handleAllocate() {
    if (!selectedLot) {
      toast.error("Please select a lot");
      return;
    }

    const lot = availableLots.find(l => l.id === selectedLot);
    if (!lot) return;

    // Validate quantity for exact lots
    if (lot.quantityMode === 'exact') {
      const qty = parseFloat(allocateQuantity);
      if (!qty || qty <= 0) {
        toast.error("Please enter a valid quantity");
        return;
      }
      if (qty > lot.quantity) {
        toast.error(`Only ${lot.quantity} ${lot.unit} available`);
        return;
      }
    }

    try {
      setAllocating(true);
      await api.createAllocation({
        lotId: selectedLot,
        projectId: id,
        quantity: lot.quantityMode === 'exact' ? parseFloat(allocateQuantity) : undefined,
        notes: allocateNotes || null,
      });

      toast.success("Parts allocated to project");
      setAllocateDialogOpen(false);
      setSelectedLot("");
      setAllocateQuantity("");
      setAllocateNotes("");
      loadProject();
    } catch (error: any) {
      console.error("Failed to allocate:", error);
      toast.error(error.message || "Failed to allocate parts");
    } finally {
      setAllocating(false);
    }
  }

  async function handleUpdateAllocationStatus(allocationId: string, newStatus: string) {
    try {
      await api.updateAllocation(allocationId, { status: newStatus });
      toast.success(`Allocation ${newStatus}`);
      loadProject();
    } catch (error: any) {
      console.error("Failed to update allocation:", error);
      toast.error(error.message || "Failed to update allocation");
    }
  }

  async function handleReturnAllocation(allocationId: string) {
    try {
      await api.returnAllocation(allocationId);
      toast.success("Parts returned to stock");
      loadProject();
    } catch (error: any) {
      console.error("Failed to return allocation:", error);
      toast.error(error.message || "Failed to return parts");
    }
  }

  async function handleScrapAllocation(allocationId: string) {
    if (!confirm("Scrap these parts? This will permanently reduce stock.")) {
      return;
    }

    try {
      await api.scrapAllocation(allocationId);
      toast.success("Parts scrapped");
      loadProject();
    } catch (error: any) {
      console.error("Failed to scrap allocation:", error);
      toast.error(error.message || "Failed to scrap parts");
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-destructive">Project not found</p>
      </div>
    );
  }

  const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status);
  const StatusIcon = statusConfig?.icon || Circle;

  // Flatten allocations grouped by status
  const allAllocations = [
    ...(project.allocationsByStatus?.reserved || []),
    ...(project.allocationsByStatus?.in_use || []),
    ...(project.allocationsByStatus?.deployed || []),
    ...(project.allocationsByStatus?.recovered || []),
  ];

  const allocationColumns = [
    {
      key: 'part',
      label: 'Part',
      render: (allocation: any) => (
        <div>
          <Link
            to={`/parts/${allocation.lot.part.id}`}
            className="font-medium text-foreground hover:text-primary"
          >
            {allocation.lot.part.name}
          </Link>
          {allocation.lot.part.category && (
            <p className="text-xs text-muted-foreground">{allocation.lot.part.category}</p>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (allocation: any) => (
        <span className="font-medium">
          {allocation.lot.quantityMode === 'exact'
            ? `${allocation.quantity} ${allocation.lot.unit}`
            : 'Entire lot'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (allocation: any) => getStatusBadge(allocation.status, true),
    },
    {
      key: 'location',
      label: 'Location',
      render: (allocation: any) => {
        if (!allocation.lot.location) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-3 text-muted-foreground" />
            {allocation.lot.location.path}
          </div>
        );
      },
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (allocation: any) => (
        <span className="text-sm text-muted-foreground">
          {allocation.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (allocation: any) => {
        if (allocation.status === 'recovered') {
          return <span className="text-muted-foreground text-sm">—</span>;
        }

        return (
          <div className="flex gap-1">
            {allocation.status === 'reserved' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateAllocationStatus(allocation.id, 'in_use')}
                title="Mark as in use"
              >
                <MoveRight className="size-3.5" />
              </Button>
            )}
            {allocation.status === 'in_use' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateAllocationStatus(allocation.id, 'deployed')}
                title="Mark as deployed"
              >
                <CheckCircle2 className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReturnAllocation(allocation.id)}
              title="Return to stock"
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleScrapAllocation(allocation.id)}
              className="text-destructive hover:text-destructive"
              title="Scrap (reduce stock)"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/projects")}
          className="mb-4"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon className={`size-8 ${statusConfig?.color}`} />
              <h1 className="text-3xl font-semibold text-foreground">{project.name}</h1>
              {getStatusBadge(project.status)}
            </div>
            {project.tags && project.tags.length > 0 && (
              <div className="flex gap-2 mt-2">
                {project.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="size-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {project.notes && (
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
            </CardContent>
          </Card>
        )}

        {project.wishlistNotes && (
          <Card className="col-span-3 border-orange-500/20 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-orange-500" />
                Parts Wishlist
              </CardTitle>
              <CardDescription>Parts still needed for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{project.wishlistNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bill of Materials (Allocations) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bill of Materials</CardTitle>
              <CardDescription>
                Parts allocated to this project ({allAllocations.length} total)
              </CardDescription>
            </div>
            <Button onClick={() => setAllocateDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Allocate Parts
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allAllocations.length === 0 ? (
            <div className="text-center py-12">
              <Package className="size-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-1">No parts allocated yet</p>
              <p className="text-sm text-muted-foreground">
                Allocate parts from your inventory to track what this project uses
              </p>
            </div>
          ) : (
            <DataTable
              columns={allocationColumns}
              data={allAllocations}
              keyExtractor={(allocation) => allocation.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
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
              <label className="text-sm font-medium">Status</label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => {
                    const Icon = status.icon;
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={`size-4 ${status.color}`} />
                          {status.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Input
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="comma, separated"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Wishlist Notes</label>
              <Textarea
                value={editForm.wishlistNotes}
                onChange={(e) => setEditForm({ ...editForm, wishlistNotes: e.target.value })}
                rows={2}
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

      {/* Allocate Dialog */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocate Parts</DialogTitle>
            <DialogDescription>
              Reserve parts from inventory for this project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Lots</label>
              <Input
                placeholder="Search by part name..."
                value={lotSearch}
                onChange={(e) => setLotSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Lot</label>
              <Select value={selectedLot} onValueChange={setSelectedLot}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lot..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLots.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available lots found
                    </div>
                  ) : (
                    availableLots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lot.part.name}</span>
                          <span className="text-muted-foreground">
                            — {lot.quantity} {lot.unit}
                          </span>
                          {lot.location && (
                            <span className="text-xs text-muted-foreground">
                              @ {lot.location.path}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedLot && availableLots.find(l => l.id === selectedLot)?.quantityMode === 'exact' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={allocateQuantity}
                  onChange={(e) => setAllocateQuantity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Available: {availableLots.find(l => l.id === selectedLot)?.quantity}{' '}
                  {availableLots.find(l => l.id === selectedLot)?.unit}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="e.g., For main PCB assembly"
                value={allocateNotes}
                onChange={(e) => setAllocateNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setAllocateDialogOpen(false)}
              disabled={allocating}
            >
              Cancel
            </Button>
            <Button onClick={handleAllocate} disabled={allocating || !selectedLot}>
              {allocating ? "Allocating..." : "Allocate to Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
