import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";

type StockStatus =
  | "in_stock"
  | "low"
  | "out"
  | "reserved"
  | "installed"
  | "lost"
  | "scrapped";

type ProjectStatus = "idea" | "planned" | "active" | "deployed" | "retired";

type AllocationStatus = "reserved" | "in_use" | "deployed" | "recovered";

type Status = StockStatus | ProjectStatus | AllocationStatus;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<
  Status,
  { label: string; className: string }
> = {
  // Stock statuses
  in_stock: {
    label: "In Stock",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  low: {
    label: "Low",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  out: {
    label: "Out",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  reserved: {
    label: "Reserved",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  installed: {
    label: "Installed",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  lost: {
    label: "Lost",
    className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  scrapped: {
    label: "Scrapped",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  // Project statuses
  idea: {
    label: "Idea",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  planned: {
    label: "Planned",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  active: {
    label: "Active",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  deployed: {
    label: "Deployed",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  retired: {
    label: "Retired",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  // Allocation statuses (reusing some colors)
  in_use: {
    label: "In Use",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  recovered: {
    label: "Recovered",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-mono text-xs", className)}
    >
      {config.label}
    </Badge>
  );
}
