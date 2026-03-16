import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DataTable } from "../components/data-table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api } from "../lib/api";
import { Search, Package2, MapPin, DollarSign, CheckCircle2, AlertTriangle, XCircle, Archive } from "lucide-react";
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

export function LotsList() {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // Locations for filter
  const [locations, setLocations] = useState<any[]>([]);

  async function loadLots() {
    try {
      setLoading(true);
      const response = await api.getLots({
        limit: pageSize,
        offset: page * pageSize,
        q: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        locationId: locationFilter !== "all" ? locationFilter : undefined,
      });

      setLots(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error("Failed to load lots:", error);
      toast.error(error.message || "Failed to load lots");
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
    loadLots();
  }, [page, search, statusFilter, locationFilter]);

  useEffect(() => {
    loadLocations();
  }, []);

  const columns = [
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
      render: (lot: any) => getStatusBadge(lot.status),
    },
    {
      key: 'location',
      label: 'Location',
      render: (lot: any) => {
        if (!lot.location) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-3 text-muted-foreground" />
            <Link
              to={`/locations/${lot.location.id}`}
              className="text-foreground hover:text-primary transition-colors"
            >
              {lot.location.path}
            </Link>
          </div>
        );
      },
    },
    {
      key: 'source',
      label: 'Source',
      render: (lot: any) => {
        if (!lot.source?.seller) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="text-sm">
            <p className="font-medium">{lot.source.seller}</p>
            {lot.source.unitCost && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="size-3" />
                {lot.source.currency} {lot.source.unitCost.toFixed(2)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'received',
      label: 'Received',
      render: (lot: any) => (
        <span className="text-sm text-muted-foreground">
          {lot.receivedAt
            ? new Date(lot.receivedAt).toLocaleDateString()
            : new Date(lot.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (lot: any) => {
        if (!lot.notes) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm text-muted-foreground truncate max-w-xs block" title={lot.notes}>
            {lot.notes}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
          <Package2 className="size-8 text-blue-500" />
          Stock Lots
        </h1>
        <p className="text-muted-foreground">
          Physical inventory batches and quantities
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search lots by part, location, seller..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {LOT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={locationFilter}
              onValueChange={(value) => {
                setLocationFilter(value);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Loading..." : `${total} Lot${total !== 1 ? 's' : ''}`}
          </CardTitle>
          <CardDescription>
            {statusFilter !== "all" && `Filtered by status: ${statusFilter}`}
            {locationFilter !== "all" && ` • Filtered by location`}
            {search && ` • Searching for: "${search}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={lots}
            loading={loading}
            keyExtractor={(lot) => lot.id}
          />

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * pageSize >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
