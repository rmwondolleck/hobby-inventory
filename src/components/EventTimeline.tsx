'use client';

import Link from 'next/link';
import {
  PackagePlus,
  PackageCheck,
  MoveRight,
  Bookmark,
  Wrench,
  Undo2,
  HelpCircle,
  Trash2,
  Pencil,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
  id: string;
  type: string;
  delta: number | null;
  notes: string | null;
  createdAt: string;
  fromLocation?: { name: string; path: string } | null;
  toLocation?: { name: string; path: string } | null;
  projectId?: string | null;
}

interface EventTimelineProps {
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: PackagePlus,
  received: PackageCheck,
  moved: MoveRight,
  allocated: Bookmark,
  installed: Wrench,
  returned: Undo2,
  lost: HelpCircle,
  scrapped: Trash2,
  edited: Pencil,
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Created',
  received: 'Received',
  moved: 'Moved',
  allocated: 'Allocated',
  installed: 'Installed',
  returned: 'Returned',
  lost: 'Lost',
  scrapped: 'Scrapped',
  edited: 'Edited',
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'text-xs font-medium',
        delta > 0 ? 'text-green-600' : 'text-red-600'
      )}
    >
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  );
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No history yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const Icon = EVENT_ICONS[event.type] ?? Circle;
        const label = EVENT_LABELS[event.type] ?? event.type.replace(/_/g, ' ');

        return (
          <div key={event.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium capitalize text-foreground">{label}</span>
                <DeltaBadge delta={event.delta} />
                {event.type === 'moved' &&
                  (event.fromLocation || event.toLocation) && (
                    <span className="text-xs text-muted-foreground">
                      {event.fromLocation?.path ?? event.fromLocation?.name ?? '?'}
                      {' → '}
                      {event.toLocation?.path ?? event.toLocation?.name ?? '?'}
                    </span>
                  )}
                {(event.type === 'allocated' || event.type === 'installed' || event.type === 'returned') &&
                  event.projectId && (
                    <Link
                      href={`/projects/${event.projectId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Project ↗
                    </Link>
                  )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </span>
              </div>
              {event.notes && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
