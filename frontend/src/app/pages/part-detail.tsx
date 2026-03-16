import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { StatusBadge } from "../components/status-badge";
import { EditPartDialog } from "../components/edit-part-dialog";
import { Skeleton } from "../components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Package,
  Edit,
  Archive,
  ArrowLeft,
  MapPin,
  Calendar,
  Plus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Part {
  id: string;
  name: string;
  category: string | null;
  manufacturer: string | null;
  mpn: string | null;
  tags: string[];
  notes: string | null;
  parameters: Record<string, any>;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lots: Lot[];
}

interface Lot {
  id: string;
  quantity: number;
  quantityMode: string;
  qualitativeStatus: string | null;
  unit: string | null;
  status: string;
  source: {
    seller?: string;
    url?: string;
    unitCost?: number;
    currency?: string;
  };
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    name: string;
    path: string;
  } | null;
  allocations: any[];
}

export function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadPart();
    }
  }, [id]);

  async function loadPart() {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.getPart(id);
      setPart(response.data);
    } catch (error: any) {
      console.error("Failed to load part:", error);
      toast.error("Failed to load part");
      navigate("/parts");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: Partial<Part>) {
    if (!id) return;
    
    try {
      await api.updatePart(id, data);
      toast.success("Part updated successfully");
      loadPart();
    } catch (error) {
      toast.error("Failed to update part");
      throw error;
    }
  }

  async function handleArchive() {
    if (!id) return;
    
    try {
      await api.deletePart(id);
      toast.success("Part archived successfully");
      navigate("/parts");
    } catch (error: any) {
      toast.error(error.message || "Failed to archive part");
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-96 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 mb-6" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Part not found</p>
      </div>
    );
  }

  const totalStock = part.lots
    .filter((lot) => lot.quantityMode === "exact" && lot.status !== "scrapped")
    .reduce((sum, lot) => sum + lot.quantity, 0);

  const availableStock = part.lots
    .filter((lot) => lot.quantityMode === "exact" && ["in_stock", "low"].includes(lot.status))
    .reduce((sum, lot) => sum + lot.quantity, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/parts")}
        className="mb-6"
      >
        <ArrowLeft className="size-4 mr-2" />
        Back to Parts
      </Button>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Package className="size-8 text-blue-500" />
            <h1 className="text-3xl font-semibold text-foreground">{part.name}</h1>
            {part.archivedAt && (
              <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                <Archive className="size-3 mr-1" />
                Archived
              </Badge>
            )}
          </div>
          {(part.category || part.manufacturer || part.mpn) && (
            <p className="text-muted-foreground">
              {[part.category, part.manufacturer, part.mpn].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="size-4 mr-2" />
            Edit
          </Button>
          {!part.archivedAt && (
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Archive className="size-4 mr-2" />
              Archive
            </Button>
          )}
          <Button onClick={() => navigate(`/intake?partId=${part.id}`)}>
            <Plus className="size-4 mr-2" />
            Add Stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Part Information */}
          <Card>
            <CardHeader>
              <CardTitle>Part Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">Category</h4>
                  <p className="text-foreground">{part.category || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">Manufacturer</h4>
                  <p className="text-foreground">{part.manufacturer || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">MPN</h4>
                  <p className="text-foreground font-mono text-sm">{part.mpn || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {part.tags.length > 0 ? (
                      part.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {part.notes && (
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">Notes</h4>
                  <p className="text-foreground whitespace-pre-wrap">{part.notes}</p>
                </div>
              )}

              {Object.keys(part.parameters).length > 0 && (
                <div>
                  <h4 className="text-sm text-muted-foreground mb-2">Parameters</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(part.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between p-2 bg-secondary/50 rounded">
                        <span className="text-sm text-muted-foreground">{key}:</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">Created</h4>
                  <p className="text-sm text-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(part.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">Last Updated</h4>
                  <p className="text-sm text-foreground flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(part.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lots */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Lots ({part.lots.length})</CardTitle>
              <Button size="sm" onClick={() => navigate(`/intake?partId=${part.id}`)}>
                <Plus className="size-4 mr-2" />
                Add Lot
              </Button>
            </CardHeader>
            <CardContent>
              {part.lots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No lots for this part
                </p>
              ) : (
                <div className="space-y-3">
                  {part.lots.map((lot) => (
                    <Link
                      key={lot.id}
                      to={`/lots/${lot.id}`}
                      className="block p-4 bg-card hover:bg-accent rounded-lg border border-border transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-lg font-medium">
                              {lot.quantityMode === "exact"
                                ? `${lot.quantity} ${lot.unit || "pcs"}`
                                : lot.qualitativeStatus}
                            </span>
                            <StatusBadge status={lot.status as any} />
                          </div>
                          {lot.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3" />
                              {lot.location.path}
                            </p>
                          )}
                        </div>
                        {lot.source?.seller && (
                          <div className="text-xs text-muted-foreground">
                            {lot.source.seller}
                            {lot.source.unitCost && (
                              <span className="ml-1">
                                · {lot.source.currency} {lot.source.unitCost.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {lot.allocations.length > 0 && (
                        <div className="text-xs text-amber-500">
                          {lot.allocations.length} allocation{lot.allocations.length !== 1 ? "s" : ""}
                        </div>
                      )}

                      {lot.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {lot.notes}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Lots</div>
                <div className="text-2xl font-semibold">{part.lots.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Stock</div>
                <div className="text-2xl font-semibold font-mono">{totalStock}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Available</div>
                <div className="text-2xl font-semibold font-mono text-green-500">
                  {availableStock}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/intake?partId=${part.id}`)}
              >
                <Plus className="size-4 mr-2" />
                Add Stock
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/lots?partId=${part.id}`)}
              >
                <ExternalLink className="size-4 mr-2" />
                View All Lots
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPartDialog
        part={part}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSave}
      />

      {/* Archive Confirmation */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Part?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{part.name}" in the catalog. Existing lots will not be affected.
              You can restore the part later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive Part
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
