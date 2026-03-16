import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { StatusBadge } from "../components/status-badge";
import { Package, Archive, MapPin, Wrench, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router";
import { Skeleton } from "../components/ui/skeleton";

interface DashboardStats {
  totalParts: number;
  totalLots: number;
  totalLocations: number;
  activeProjects: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface RecentActivity {
  id: string;
  type: string;
  lotId: string;
  createdAt: string;
  delta?: number;
  lot?: {
    part: {
      name: string;
      category: string;
    };
  };
}

interface LotSummary {
  id: string;
  quantity: number;
  quantityMode: string;
  qualitativeStatus: string | null;
  status: string;
  part: {
    id: string;
    name: string;
    category: string;
  };
  location: {
    id: string;
    name: string;
    path: string;
  } | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  allocationCount: number;
  tags: string[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentActivity[]>([]);
  const [lowStockLots, setLowStockLots] = useState<LotSummary[]>([]);
  const [activeProjects, setActiveProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        partsRes,
        lotsRes,
        locationsRes,
        projectsRes,
        lowStockRes,
        outOfStockRes,
        eventsRes,
        activeProjectsRes,
      ] = await Promise.all([
        api.getParts({ limit: 1 }),
        api.getLots({ limit: 1 }),
        api.getLocations({ limit: 1 }),
        api.getProjects({ status: 'active', limit: 1 }),
        api.getLots({ status: 'low', limit: 5 }),
        api.getLots({ status: 'out', limit: 1 }),
        api.getEvents({ limit: 10 }),
        api.getProjects({ status: 'active', limit: 5 }),
      ]);

      setStats({
        totalParts: partsRes.total || 0,
        totalLots: lotsRes.total || 0,
        totalLocations: locationsRes.total || 0,
        activeProjects: projectsRes.total || 0,
        lowStockCount: lowStockRes.total || 0,
        outOfStockCount: outOfStockRes.total || 0,
      });

      setRecentEvents(eventsRes.data || []);
      setLowStockLots(lowStockRes.data || []);
      setActiveProjects(activeProjectsRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your inventory and projects
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Parts"
          value={stats?.totalParts || 0}
          icon={Package}
          href="/parts"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Lots"
          value={stats?.totalLots || 0}
          icon={Archive}
          href="/lots"
          iconColor="text-green-500"
        />
        <StatCard
          title="Locations"
          value={stats?.totalLocations || 0}
          icon={MapPin}
          href="/locations"
          iconColor="text-purple-500"
        />
        <StatCard
          title="Active Projects"
          value={stats?.activeProjects || 0}
          icon={Wrench}
          href="/projects?status=active"
          iconColor="text-amber-500"
        />
      </div>

      {/* Alerts Section */}
      {(stats && (stats.lowStockCount > 0 || stats.outOfStockCount > 0)) && (
        <div className="mb-8">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" />
                <CardTitle className="text-lg">Stock Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.outOfStockCount > 0 && (
                  <Link
                    to="/lots?status=out"
                    className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors"
                  >
                    <span className="text-sm text-red-400">
                      {stats.outOfStockCount} lot{stats.outOfStockCount !== 1 ? 's' : ''} out of stock
                    </span>
                    <StatusBadge status="out" />
                  </Link>
                )}
                {stats.lowStockCount > 0 && (
                  <Link
                    to="/lots?status=low"
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
                  >
                    <span className="text-sm text-amber-400">
                      {stats.lowStockCount} lot{stats.lowStockCount !== 1 ? 's' : ''} running low
                    </span>
                    <StatusBadge status="low" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Lots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="size-5 text-amber-500" />
              Low Stock Lots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockLots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No low stock items
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockLots.map((lot) => (
                  <Link
                    key={lot.id}
                    to={`/lots/${lot.id}`}
                    className="block p-3 rounded-lg bg-card hover:bg-accent transition-colors border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground">
                          {lot.part.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {lot.part.category}
                        </p>
                      </div>
                      <StatusBadge status={lot.status as any} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {lot.location?.path || 'No location'}
                      </span>
                      <span className="font-mono text-amber-500">
                        {lot.quantityMode === 'exact'
                          ? `${lot.quantity} pcs`
                          : lot.qualitativeStatus}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="size-5 text-green-500" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active projects
              </p>
            ) : (
              <div className="space-y-3">
                {activeProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 rounded-lg bg-card hover:bg-accent transition-colors border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground">
                          {project.name}
                        </h4>
                        {project.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {project.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={project.status as any} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.allocationCount} allocation
                      {project.allocationCount !== 1 ? 's' : ''}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-2 rounded-full ${getEventColor(
                        event.type
                      )}`}
                    />
                    <div>
                      <p className="text-sm text-foreground">
                        {formatEventType(event.type)}
                        {event.lot && (
                          <span className="text-muted-foreground">
                            {' '}
                            — {event.lot.part.name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(event.createdAt)}
                      </p>
                    </div>
                  </div>
                  {event.delta !== null && event.delta !== undefined && (
                    <span
                      className={`text-xs font-mono ${
                        event.delta > 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {event.delta > 0 ? '+' : ''}
                      {event.delta}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  iconColor,
}: {
  title: string;
  value: number;
  icon: any;
  href: string;
  iconColor: string;
}) {
  return (
    <Link to={href}>
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-semibold text-foreground">{value}</p>
            </div>
            <Icon className={`size-10 ${iconColor}`} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    created: 'bg-green-500',
    received: 'bg-green-500',
    moved: 'bg-blue-500',
    allocated: 'bg-purple-500',
    installed: 'bg-purple-500',
    returned: 'bg-blue-500',
    lost: 'bg-orange-500',
    scrapped: 'bg-red-500',
    edited: 'bg-gray-500',
  };
  return colors[type] || 'bg-gray-500';
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    created: 'Lot Created',
    received: 'Stock Received',
    moved: 'Lot Moved',
    allocated: 'Allocated to Project',
    installed: 'Installed',
    returned: 'Returned to Stock',
    lost: 'Marked as Lost',
    scrapped: 'Scrapped',
    edited: 'Edited',
  };
  return labels[type] || type;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else {
    return 'Just now';
  }
}
