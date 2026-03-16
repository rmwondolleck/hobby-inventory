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
  MapPin,
  DollarSign,
  Calendar,
  Package2,
  MoveRight,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Archive,
  History,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

const LOT_STATUSES = [
  { value: 'in_stock', label: 'In Stock', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'low', label: 'Low', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'out', label: 'Out', icon: XCircle, color: 'text-red-500' },
  { value: 'reserved', label: 'Reserved', icon: Archive, color: 'text-blue-500' },
  { value: 'installed', label: 'Installed', icon: CheckCircle2, color: 'text-purple-500' },
  { value: 'lost', label: 'Lost', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'scrapped', label: 'Scrapped', icon: XCircle, color: 'text-gray-500' },
];

function getStatusBadge(status: string) {
  const statusConfig = LOT_STATUSES.find(s => s.value === status);
  if (!statusConfig) return <Badge variant="outline">{status}</Badge>;

  const Icon = statusConfig.icon;
  return (
    <Badge variant="outline" className="gap-1.5">
      <Icon className={`size-3 ${statusConfig.color}`} />
      {statusConfig.label}
    </Badge>
  );
}

const EVENT_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  created: { label: 'Created', icon: Plus, color: 'text-blue-500' },
  received: { label: 'Received', icon: Package2, color: 'text-green-500' },
  moved: { label: 'Moved', icon: MoveRight, color: 'text-purple-500' },
  allocated: { label: 'Allocated', icon: Archive, color: 'text-blue-500' },
  installed: { label: 'Installed', icon: CheckCircle2, color: 'text-green-500' },
  returned: { label: 'Returned', icon: ArrowLeft, color: 'text-blue-500' },
  lost: { label: 'Lost', icon: AlertTriangle, color: 'text-orange-500' },
  scrapped: { label: 'Scrapped', icon: Trash2, color: 'text-red-500' },
  edited: { label: 'Edited', icon: Edit, color: 'text-gray-500' },
};

export function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lot, setLot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    quantity: "",
    status: "",
    notes: "",
  });

  // Move dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [targetLocationId, setTargetLocationId] = useState<string>("");
  const [moveNotes, setMoveNotes] = useState("");

  // Adjust quantity dialog
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  async function loadLot() {
    if (!id) return;

    try {
      setLoading(true);
      const response = await api.getLot(id);
      setLot(response.data);
    } catch (error: any) {
      console.error("Failed to load lot:", error);
      toast.error(error.message || "Failed to load lot");
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    try {
      const response = await api.getLocations({ limit: 200 });
      setLocations(response.data || []);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  }

  useEffect(() => {
    loadLot();
  }, [id]);

  useEffect(() => {
    if (moveDialogOpen) {
      loadLocations();
    }
  }, [moveDialogOpen]);

  function openEditDialog() {
    setEditForm({
      quantity: lot.quantityMode === 'exact' ? lot.quantity.toString() : '',
      status: lot.status,
      notes: lot.notes || "",
    });
    setEditDialogOpen(true);
  }

  async function handleUpdate() {
    try {
      setUpdating(true);
      const updates: any = {
        status: editForm.status,
        notes: editForm.notes || null,
      };

      if (lot.quantityMode === 'exact' && editForm.quantity) {
        updates.quantity = parseFloat(editForm.quantity);
      }

      await api.updateLot(id!, updates);
      toast.success("Lot updated");
      setEditDialogOpen(false);
      loadLot();
    } catch (error: any) {
      console.error("Failed to update lot:", error);
      toast.error(error.message || "Failed to update lot");
    } finally {
      setUpdating(false);
    }
  }

  async function handleMove() {
    if (!targetLocationId) {
      toast.error("Please select a location");
      return;
    }

    try {
      setMoving(true);
      await api.moveLot(id!, targetLocationId, moveNotes || undefined);
      toast.success("Lot moved");
      setMoveDialogOpen(false);
      setTargetLocationId("");
      setMoveNotes("");
      loadLot();
    } catch (error: any) {
      console.error("Failed to move lot:", error);
      toast.error(error.message || "Failed to move lot");
    } finally {
      setMoving(false);
    }
  }

  async function handleAdjustQuantity() {
    if (!adjustAmount || parseFloat(adjustAmount) === 0) {
      toast.error("Please enter an adjustment amount");
      return;
    }

    const adjustment = parseFloat(adjustAmount);
    const newQuantity = lot.quantity + adjustment;

    if (newQuantity < 0) {
      toast.error("Cannot reduce quantity below 0");
      return;
    }

    try {
      setAdjusting(true);
      await api.updateLot(id!, {
        quantity: newQuantity,
        notes: adjustNotes || lot.notes,
      });

      toast.success(`Quantity ${adjustment > 0 ? 'increased' : 'decreased'}`);
      setAdjustDialogOpen(false);
      setAdjustAmount("");
      setAdjustNotes("");
      loadLot();
    } catch (error: any) {
      console.error("Failed to adjust quantity:", error);
      toast.error(error.message || "Failed to adjust quantity");
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Loading lot...</p>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <p className="text-destructive">Lot not found</p>
      </div>
    );
  }

  const statusConfig = LOT_STATUSES.find(s => s.value === lot.status);
  const StatusIcon = statusConfig?.icon || Package2;

  // Calculate available quantity (for exact lots)
  const allocatedQuantity =
    lot.allocations
      ?.filter((a: any) => ['reserved', 'in_use', 'deployed'].includes(a.status))
      .reduce((sum: number, a: any) => sum + a.quantity, 0) || 0;
  const availableQuantity = lot.quantityMode === 'exact' ? lot.quantity - allocatedQuantity : null;

  const eventColumns = [
    {
      key: 'type',
      label: 'Event',
      render: (event: any) => {
        const eventType = EVENT_TYPES[event.type] || { label: event.type, icon: History, color: 'text-gray-500' };
        const Icon = eventType.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`size-4 ${eventType.color}`} />
            <span className="font-medium">{eventType.label}</span>
          </div>
        );
      },
    },
    {
      key: 'delta',
      label: 'Change',
      render: (event: any) => {
        if (event.delta === null || event.delta === undefined) {
          return <span className="text-muted-foreground">—</span>;
        }
        const isPositive = event.delta > 0;
        return (
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{event.delta} {lot.unit}
          </span>
        );
      },
    },
    {
      key: 'details',
      label: 'Details',
      render: (event: any) => {
        const parts = [];
        if (event.fromLocationId || event.toLocationId) {
          parts.push(
            <span key="location" className="text-sm">
              {event.fromLocationId ? `From: ${event.fromLocationId}` : ''}
              {event.fromLocationId && event.toLocationId ? ' → ' : ''}
              {event.toLocationId ? `To: ${event.toLocationId}` : ''}
            </span>
          );
        }
        if (event.projectId) {
          parts.push(
            <span key="project" className="text-sm text-muted-foreground">
              Project: {event.projectId}
            </span>
          );
        }
        if (event.notes) {
          parts.push(
            <span key="notes" className="text-sm text-muted-foreground">
              {event.notes}
            </span>
          );
        }
        return parts.length > 0 ? <div className="space-y-0.5">{parts}</div> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: 'timestamp',
      label: 'When',
      render: (event: any) => (
        <span className="text-sm text-muted-foreground">
          {new Date(event.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/lots")}
          className="mb-4"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Lots
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon className={`size-8 ${statusConfig?.color}`} />
              <div>
                <h1 className="text-3xl font-semibold text-foreground">
                  <Link to={`/parts/${lot.part.id}`} className="hover:text-primary transition-colors">
                    {lot.part.name}
                  </Link>
                </h1>
                {lot.part.category && (
                  <p className="text-muted-foreground">{lot.part.category}</p>
                )}
              </div>
              {getStatusBadge(lot.status)}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => setMoveDialogOpen(true)}>
              <MoveRight className="size-4 mr-2" />
              Move
            </Button>
            {lot.quantityMode === 'exact' && (
              <Button variant="outline" onClick={() => setAdjustDialogOpen(true)}>
                <Plus className="size-4 mr-2" />
                Adjust Qty
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Quantity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {lot.quantityMode === 'exact' ? (
                <>
                  {lot.quantity} <span className="text-lg text-muted-foreground">{lot.unit}</span>
                </>
              ) : (
                <Badge variant="secondary" className="text-base">
                  {lot.qualitativeStatus}
                </Badge>
              )}
            </p>
            {availableQuantity !== null && allocatedQuantity > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {availableQuantity} available • {allocatedQuantity} allocated
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Location</CardDescription>
          </CardHeader>
          <CardContent>
            {lot.location ? (
              <Link
                to={`/locations/${lot.location.id}`}
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
              >
                <MapPin className="size-4" />
                <span className="font-medium">{lot.location.path}</span>
              </Link>
            ) : (
              <span className="text-muted-foreground">Not assigned</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Source</CardDescription>
          </CardHeader>
          <CardContent>
            {lot.source?.seller ? (
              <div>
                <p className="font-medium">{lot.source.seller}</p>
                {lot.source.unitCost && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <DollarSign className="size-3" />
                    {lot.source.currency} {lot.source.unitCost.toFixed(2)}
                    {lot.quantityMode === 'exact' && (
                      <span className="ml-2">
                        Total: {lot.source.currency} {(lot.source.unitCost * lot.quantity).toFixed(2)}
                      </span>
                    )}
                  </p>
                )}
                {lot.source.url && (
                  <a
                    href={lot.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                  >
                    <Link2 className="size-3" />
                    View source
                  </a>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Unknown</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="size-4" />
              <span className="font-medium">
                {lot.receivedAt
                  ? new Date(lot.receivedAt).toLocaleDateString()
                  : new Date(lot.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {lot.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{lot.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Allocations */}
      {lot.allocations && lot.allocations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Project Allocations ({lot.allocations.length})</CardTitle>
            <CardDescription>Parts allocated from this lot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lot.allocations.map((allocation: any) => (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex-1">
                    <Link
                      to={`/projects/${allocation.projectId}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {allocation.project?.name || allocation.projectId}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {allocation.quantity} {lot.unit} • {allocation.status}
                    </p>
                  </div>
                  <Badge variant="outline">{allocation.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event History */}
      <Card>
        <CardHeader>
          <CardTitle>Event History</CardTitle>
          <CardDescription>
            {lot.events?.length || 0} event{lot.events?.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lot.events && lot.events.length > 0 ? (
            <DataTable
              columns={eventColumns}
              data={lot.events}
              keyExtractor={(event) => event.id}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">No events recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lot</DialogTitle>
            <DialogDescription>Update lot details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {lot.quantityMode === 'exact' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>
            )}

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
                  {LOT_STATUSES.map((status) => {
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

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Lot</DialogTitle>
            <DialogDescription>Relocate this lot to a different storage location</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Location</label>
              <Select value={targetLocationId} onValueChange={setTargetLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Reason for move..."
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setMoveDialogOpen(false)}
              disabled={moving}
            >
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={moving || !targetLocationId}>
              {moving ? "Moving..." : "Move Lot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Quantity</DialogTitle>
            <DialogDescription>
              Increase or decrease the quantity in this lot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Quantity</p>
              <p className="text-2xl font-bold">
                {lot.quantity} {lot.unit}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Adjustment Amount</label>
              <Input
                type="number"
                placeholder="e.g., +10 or -5"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use negative numbers to decrease (e.g., -5)
              </p>
              {adjustAmount && (
                <p className="text-sm font-medium">
                  New quantity: {lot.quantity + parseFloat(adjustAmount || '0')} {lot.unit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Reason for adjustment..."
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              disabled={adjusting}
            >
              Cancel
            </Button>
            <Button onClick={handleAdjustQuantity} disabled={adjusting || !adjustAmount}>
              {adjusting ? "Adjusting..." : "Adjust Quantity"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
