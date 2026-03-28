import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  in_stock: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  out: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  reserved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  installed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  lost: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  scrapped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: 'In Stock',
  low: 'Low',
  out: 'Out',
  reserved: 'Reserved',
  installed: 'Installed',
  lost: 'Lost',
  scrapped: 'Scrapped',
};

interface LotStatusBadgeProps {
  status: string;
  className?: string;
}

export function LotStatusBadge({ status, className }: LotStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
