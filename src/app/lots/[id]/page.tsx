import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { safeParseJson, formatDate, formatDateTime, cn } from '@/lib/utils';
import { LotStatusBadge } from '@/features/lots/components/LotStatusBadge';
import { LotActionsPanel } from '@/features/lots/components/LotActionsPanel';
import { AllocationActions } from '@/features/lots/components/AllocationActions';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SourceData {
  type?: string;
  seller?: string;
  url?: string;
  orderRef?: string;
  unitCost?: number;
  currency?: string;
  purchaseDate?: string;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  aliexpress: 'AliExpress',
  digikey: 'DigiKey',
  mouser: 'Mouser',
  adafruit: 'Adafruit',
  sparkfun: 'SparkFun',
  ebay: 'eBay',
  manual: 'Manual',
};

const QUALITATIVE_LABELS: Record<string, string> = {
  plenty: 'Plenty',
  low: 'Low',
  out: 'Out',
};

function formatQuantity(
  quantity: number | null,
  quantityMode: string,
  qualitativeStatus: string | null,
  unit: string | null
): string {
  if (quantityMode === 'qualitative') {
    return qualitativeStatus
      ? (QUALITATIVE_LABELS[qualitativeStatus] ?? qualitativeStatus)
      : '—';
  }
  if (quantity === null) return '—';
  return unit ? `${quantity} ${unit}` : String(quantity);
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function DefinitionItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

const EVENTS_LIMIT = 50;

export default async function LotDetailPage({ params }: PageProps) {
  const { id } = await params;

  const lot = await prisma.lot.findUnique({
    where: { id },
    include: {
      part: true,
      location: true,
      allocations: {
        include: {
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: EVENTS_LIMIT,
      },
    },
  });

  if (!lot) notFound();

  const source = safeParseJson<SourceData>(lot.source, {});
  const hasSource = Object.keys(source).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/lots" className="hover:text-gray-700">
            Lots
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{lot.part.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lot.part.name}</h1>
            {lot.part.category && (
              <p className="mt-1 text-sm text-gray-500">{lot.part.category}</p>
            )}
          </div>
          <LotStatusBadge status={lot.status} className="shrink-0 px-3 py-1 text-sm" />
        </div>

        <div className="space-y-6">
          {/* Actions */}
          <LotActionsPanel
            lotId={lot.id}
            status={lot.status}
            quantityMode={lot.quantityMode}
            quantity={lot.quantity}
            qualitativeStatus={lot.qualitativeStatus}
            unit={lot.unit}
            locationId={lot.locationId}
            notes={lot.notes}
          />

          {/* Core Details */}
          <section className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Lot Details</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DefinitionItem label="Quantity">
                <span
                  className={cn(
                    'font-medium',
                    (lot.status === 'out' || lot.qualitativeStatus === 'out') && 'text-red-600',
                    (lot.status === 'low' || lot.qualitativeStatus === 'low') &&
                      lot.status !== 'out' &&
                      lot.qualitativeStatus !== 'out' &&
                      'text-yellow-700'
                  )}
                >
                  {formatQuantity(lot.quantity, lot.quantityMode, lot.qualitativeStatus, lot.unit)}
                </span>
              </DefinitionItem>

              <DefinitionItem label="Part">
                <Link href={`/parts/${lot.part.id}`} className="text-blue-600 hover:underline">
                  {lot.part.name}
                </Link>
              </DefinitionItem>

              {lot.location && (
                <DefinitionItem label="Location">
                  <Link
                    href={`/locations/${lot.location.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {lot.location.path || lot.location.name}
                  </Link>
                </DefinitionItem>
              )}

              {lot.receivedAt && (
                <DefinitionItem label="Received">{formatDate(lot.receivedAt)}</DefinitionItem>
              )}

              <DefinitionItem label="Created">{formatDate(lot.createdAt)}</DefinitionItem>
              <DefinitionItem label="Updated">{formatDate(lot.updatedAt)}</DefinitionItem>
            </dl>

            {lot.notes && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</p>
                <p className="mt-1 text-sm text-gray-700">{lot.notes}</p>
              </div>
            )}
          </section>

          {/* Source / Purchase Info */}
          {hasSource && (
            <section className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Source</h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {source.type && (
                  <DefinitionItem label="Store">
                    {SOURCE_TYPE_LABELS[source.type] ?? source.type}
                  </DefinitionItem>
                )}
                {source.seller && (
                  <DefinitionItem label="Seller">{source.seller}</DefinitionItem>
                )}
                {source.orderRef && (
                  <DefinitionItem label="Order Ref">{source.orderRef}</DefinitionItem>
                )}
                {source.unitCost !== undefined && (
                  <DefinitionItem label="Unit Cost">
                    {source.currency ?? '$'}
                    {source.unitCost}
                  </DefinitionItem>
                )}
                {source.purchaseDate && (
                  <DefinitionItem label="Purchase Date">
                    {formatDate(source.purchaseDate)}
                  </DefinitionItem>
                )}
              </dl>

              {source.url && isSafeUrl(source.url) && (
                <div className="mt-4 border-t pt-4">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    Re-order →
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Allocations */}
          {lot.allocations.length > 0 && (
            <section className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Allocations ({lot.allocations.length})
              </h2>
              <div className="divide-y">
                {lot.allocations.map(alloc => (
                  <div key={alloc.id} className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/projects/${alloc.project.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {alloc.project.name}
                        </Link>
                        {alloc.notes && (
                          <p className="text-xs text-gray-500">{alloc.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        {alloc.quantity !== null && (
                          <span className="text-sm font-medium text-gray-900">
                            {alloc.quantity}
                            {lot.unit ? ` ${lot.unit}` : ''}
                          </span>
                        )}
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            alloc.status === 'reserved' && 'bg-blue-100 text-blue-800',
                            alloc.status === 'in_use' && 'bg-green-100 text-green-800',
                            alloc.status === 'deployed' && 'bg-purple-100 text-purple-800',
                            alloc.status === 'recovered' && 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {alloc.status}
                        </span>
                      </div>
                    </div>
                    <AllocationActions
                      allocationId={alloc.id}
                      status={alloc.status}
                      projectName={alloc.project.name}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Event History */}
          {lot.events.length > 0 && (
            <section className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                History ({lot.events.length === EVENTS_LIMIT ? `most recent ${EVENTS_LIMIT}` : lot.events.length})
              </h2>
              <div className="space-y-3">
                {lot.events.map(event => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize text-gray-900">
                          {event.type.replace(/_/g, ' ')}
                        </span>
                        {event.delta !== null && (
                          <span
                            className={cn(
                              'text-xs font-medium',
                              event.delta > 0 ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {event.delta > 0 ? '+' : ''}
                            {event.delta}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          {formatDateTime(event.createdAt)}
                        </span>
                      </div>
                      {event.notes && (
                        <p className="text-xs text-gray-500">{event.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
