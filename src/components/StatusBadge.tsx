import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

type StockStatus = 'in_stock' | 'low' | 'out' | 'reserved' | 'installed' | 'lost' | 'scrapped';
type ProjectStatus = 'idea' | 'planned' | 'active' | 'deployed' | 'retired';
type AllocationStatus = 'reserved' | 'in_use' | 'deployed' | 'recovered';
type Status = StockStatus | ProjectStatus | AllocationStatus;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  in_stock: { label: 'In Stock', className: 'bg-green-500/10 !text-green-700 border border-green-500/20' },
  low: { label: 'Low', className: 'bg-amber-500/10 !text-amber-700 border border-amber-500/20' },
  out: { label: 'Out', className: 'bg-red-500/10 !text-red-700 border border-red-500/20' },
  reserved: { label: 'Reserved', className: 'bg-blue-500/10 !text-blue-700 border border-blue-500/20' },
  installed: { label: 'Installed', className: 'bg-purple-500/10 !text-purple-700 border border-purple-500/20' },
  lost: { label: 'Lost', className: 'bg-orange-500/10 !text-orange-700 border border-orange-500/20' },
  scrapped: { label: 'Scrapped', className: 'bg-gray-500/10 !text-gray-500 border border-gray-500/20' },
  idea: { label: 'Idea', className: 'bg-slate-500/10 !text-slate-500 border border-slate-500/20' },
  planned: { label: 'Planned', className: 'bg-blue-500/10 !text-blue-700 border border-blue-500/20' },
  active: { label: 'Active', className: 'bg-green-500/10 !text-green-700 border border-green-500/20' },
  deployed: { label: 'Deployed', className: 'bg-purple-500/10 !text-purple-700 border border-purple-500/20' },
  retired: { label: 'Retired', className: 'bg-gray-500/10 !text-gray-500 border border-gray-500/20' },
  in_use: { label: 'In Use', className: 'bg-amber-500/10 !text-amber-700 border border-amber-500/20' },
  recovered: { label: 'Recovered', className: 'bg-gray-500/10 !text-gray-500 border border-gray-500/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) {
    return <Badge className={className}>{status}</Badge>;
  }
  return (
    <Badge className={cn(config.className, 'font-mono text-xs', className)}>
      {config.label}
    </Badge>
  );
}
