import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LotStatusBadge } from './LotStatusBadge';

export interface LotCardLot {
  id: string;
  quantity: number | null;
  quantityMode: string;
  qualitativeStatus: string | null;
  unit: string | null;
  status: string;
  notes: string | null;
  part: {
    id: string;
    name: string;
    category: string | null;
  };
  location: {
    id: string;
    name: string;
    path: string;
  } | null;
}

function formatQuantity(
  quantity: number | null,
  quantityMode: string,
  qualitativeStatus: string | null,
  unit: string | null
): string {
  if (quantityMode === 'qualitative') {
    const labels: Record<string, string> = { plenty: 'Plenty', low: 'Low', out: 'Out' };
    return qualitativeStatus ? (labels[qualitativeStatus] ?? qualitativeStatus) : '—';
  }
  if (quantity === null) return '—';
  return unit ? `${quantity} ${unit}` : String(quantity);
}

interface LotCardProps {
  lot: LotCardLot;
}

export function LotCard({ lot }: LotCardProps) {
  const isOutOfStock =
    lot.status === 'out' || lot.qualitativeStatus === 'out';
  const isLowStock =
    !isOutOfStock && (lot.status === 'low' || lot.qualitativeStatus === 'low');

  return (
    <Link href={`/lots/${lot.id}`} className="block">
      <div
        className={cn(
          'rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
          isOutOfStock && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
          isLowStock && 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{lot.part.name}</p>
            {lot.part.category && (
              <p className="text-xs text-muted-foreground">{lot.part.category}</p>
            )}
          </div>
          <LotStatusBadge status={lot.status} className="shrink-0" />
        </div>

        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Qty:</span>
            <span
              className={cn(
                'font-medium',
                isOutOfStock && 'text-red-600 dark:text-red-400',
                isLowStock && 'text-yellow-700 dark:text-yellow-400'
              )}
            >
              {formatQuantity(lot.quantity, lot.quantityMode, lot.qualitativeStatus, lot.unit)}
            </span>
          </div>
          {lot.location && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Location:</span>
              <span className="truncate">{lot.location.path || lot.location.name}</span>
            </div>
          )}
        </div>

        {lot.notes && (
          <p className="mt-2 truncate text-xs text-muted-foreground">{lot.notes}</p>
        )}
      </div>
    </Link>
  );
}
