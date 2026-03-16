import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PartListItem } from '../types';

interface PartCardProps {
  part: PartListItem;
}

export function PartCard({ part }: PartCardProps) {
  const isArchived = !!part.archivedAt;
  const hasExactStock = part.totalQuantity > 0;
  const hasQualitativeStock = part.qualitativeStatuses.length > 0;

  function QualitativeDisplay() {
    const status = part.qualitativeStatuses[0];
    const colorClass =
      status === 'plenty'
        ? 'text-green-600'
        : status === 'low'
        ? 'text-yellow-600'
        : 'text-red-600';
    return <span className={colorClass}>{status}</span>;
  }

  return (
    <Link
      href={`/parts/${part.id}`}
      className={cn(
        'block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        isArchived && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">{part.name}</h3>
          {part.mpn && (
            <p className="mt-0.5 text-sm text-gray-500">MPN: {part.mpn}</p>
          )}
          {part.manufacturer && (
            <p className="mt-0.5 text-xs text-gray-400">{part.manufacturer}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isArchived && <Badge variant="secondary">Archived</Badge>}
          {part.category && <Badge variant="default">{part.category}</Badge>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {part.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {part.tags.length > 4 && (
            <Badge variant="secondary">+{part.tags.length - 4}</Badge>
          )}
        </div>
        <div className="ml-2 shrink-0 text-sm font-medium text-gray-700">
          {hasQualitativeStock ? (
            <QualitativeDisplay />
          ) : hasExactStock ? (
            <span>{part.totalQuantity} in stock</span>
          ) : (
            <span className="text-gray-400">No stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}
