import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DataTable } from "../components/data-table";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { api } from "../lib/api";
import { Search, Plus, FolderKanban, Circle, CheckCircle2, Rocket, Archive } from "lucide-react";
import { toast } from "sonner";

const PROJECT_STATUSES = [
  { value: 'idea', label: 'Idea', icon: Circle, color: 'text-gray-400' },
  { value: 'planned', label: 'Planned', icon: Circle, color: 'text-blue-500' },
  { value: 'active', label: 'Active', icon: Rocket, color: 'text-green-500' },
  { value: 'deployed', label: 'Deployed', icon: CheckCircle2, color: 'text-purple-500' },
  { value: 'retired', label: 'Retired', icon: Archive, color: 'text-gray-500' },
];

function getStatusBadge(status: string) {
  const statusConfig = PROJECT_STATUSES.find(s => s.value === status);
  if (!statusConfig) return <Badge variant="outline">{status}</Badge>;

  const Icon = statusConfig.icon;
  return (
    <Badge variant="outline" className="gap-1.5">
      <Icon className={`size-3 ${statusConfig.color}`} />
      {statusConfig.label}
    </Badge>
  );
}

export function ProjectsList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    status: "idea",
    tags: "",
    notes: "",
    wishlistNotes: "",
  });

  async function loadProjects() {
    try {
      setLoading(true);
      const response = await api.getProjects({
        limit: pageSize,
        offset: page * pageSize,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        includeArchived,
      });

      setProjects(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error("Failed to load projects:", error);
      toast.error(error.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, [page, search, statusFilter, includeArchived]);

  async function handleCreateProject() {
    if (!newProject.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      setCreating(true);
      const tags = newProject.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      await api.createProject({
        name: newProject.name,
        status: newProject.status,
        tags,
        notes: newProject.notes || null,
        wishlistNotes: newProject.wishlistNotes || null,
      });

      toast.success(`Created project "${newProject.name}"`);
      setCreateDialogOpen(false);
      setNewProject({
        name: "",
        status: "idea",
        tags: "",
        notes: "",
        wishlistNotes: "",
      });
      loadProjects();
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast.error(error.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Project',
      render: (project: any) => (
        <Link
          to={`/projects/${project.id}`}
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {project.name}
        </Link>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (project: any) => getStatusBadge(project.status),
    },
    {
      key: 'allocations',
      label: 'Parts Allocated',
      render: (project: any) => {
        const counts = project.allocationsByStatus || {};
        const total = (counts.reserved || 0) + (counts.in_use || 0) + (counts.deployed || 0);
        
        if (total === 0) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{total}</span>
            <div className="flex gap-1 text-xs">
              {counts.reserved > 0 && (
                <span className="text-blue-500" title="Reserved">
                  {counts.reserved}R
                </span>
              )}
              {counts.in_use > 0 && (
                <span className="text-yellow-500" title="In Use">
                  {counts.in_use}U
                </span>
              )}
              {counts.deployed > 0 && (
                <span className="text-green-500" title="Deployed">
                  {counts.deployed}D
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (project: any) => {
        if (!project.tags || project.tags.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      render: (project: any) => {
        if (!project.wishlistNotes) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="text-sm text-muted-foreground truncate max-w-xs block">
            {project.wishlistNotes}
          </span>
        );
      },
    },
    {
      key: 'created',
      label: 'Created',
      render: (project: any) => (
        <span className="text-sm text-muted-foreground">
          {new Date(project.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
            <FolderKanban className="size-8 text-purple-500" />
            Projects
          </h1>
          <p className="text-muted-foreground">
            Track build projects and part allocations
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Start a new build or repair project
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  placeholder="e.g., Home Automation Hub"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={newProject.status}
                  onValueChange={(value) => setNewProject({ ...newProject, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.filter(s => s.value !== 'retired').map((status) => {
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
                  placeholder="e.g., home-automation, esp32"
                  value={newProject.tags}
                  onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  placeholder="Project description and goals"
                  value={newProject.notes}
                  onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Parts Wishlist</label>
                <Textarea
                  placeholder="Parts you still need to acquire"
                  value={newProject.wishlistNotes}
                  onChange={(e) => setNewProject({ ...newProject, wishlistNotes: e.target.value })}
                  rows={2}
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
              <Button onClick={handleCreateProject} disabled={creating}>
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
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
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={includeArchived ? "default" : "outline"}
              onClick={() => {
                setIncludeArchived(!includeArchived);
                setPage(0);
              }}
            >
              <Archive className="size-4 mr-2" />
              {includeArchived ? "Hiding" : "Show"} Archived
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Loading..." : `${total} Project${total !== 1 ? 's' : ''}`}
          </CardTitle>
          <CardDescription>
            {statusFilter !== "all" && `Filtered by status: ${statusFilter}`}
            {search && ` • Searching for: "${search}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={projects}
            loading={loading}
            keyExtractor={(project) => project.id}
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
