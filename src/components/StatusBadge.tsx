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
  in_stock: { label: 'In Stock', className: 'bg-green-500/10 text-green-700 border-green-500/20' },
  low: { label: 'Low', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  out: { label: 'Out', className: 'bg-red-500/10 text-red-700 border-red-500/20' },
  reserved: { label: 'Reserved', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  installed: { label: 'Installed', className: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  lost: { label: 'Lost', className: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  scrapped: { label: 'Scrapped', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  idea: { label: 'Idea', className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  planned: { label: 'Planned', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  active: { label: 'Active', className: 'bg-green-500/10 text-green-700 border-green-500/20' },
  deployed: { label: 'Deployed', className: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  retired: { label: 'Retired', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  in_use: { label: 'In Use', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  recovered: { label: 'Recovered', className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
};

const base = 'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium';

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn(base, config?.className ?? 'bg-gray-100 text-gray-700 border-gray-200', className)}>
      {config?.label ?? status}
    </span>
  );
}
