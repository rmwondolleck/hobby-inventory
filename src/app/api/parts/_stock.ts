export type LotForStock = {
  quantity: number | null;
  quantityMode: string;
  qualitativeStatus: string | null;
  status: string;
  allocations?: { quantity: number | null; status: string }[];
};

export function computeStockFields(lots: LotForStock[]) {
  const inStockLots = lots.filter((l) => l.status === 'in_stock');

  const totalQuantity = inStockLots
    .filter((l) => l.quantityMode === 'exact')
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  const allAllocations = lots.flatMap((l) => l.allocations ?? []);

  const reservedQuantity = allAllocations
    .filter((a) => a.status === 'reserved')
    .reduce((sum, a) => sum + (a.quantity ?? 0), 0);

  const inUseQuantity = allAllocations
    .filter((a) => a.status === 'in_use')
    .reduce((sum, a) => sum + (a.quantity ?? 0), 0);

  const scrappedQuantity = lots
    .filter((l) => l.status === 'scrapped' && l.quantityMode === 'exact')
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0);

  const availableQuantity = Math.max(0, totalQuantity - reservedQuantity - inUseQuantity);

  const qualitativeStatuses = Array.from(
    new Set(
      inStockLots
        .filter(
          (l) =>
            l.quantityMode === 'qualitative' &&
            l.qualitativeStatus !== null &&
            l.qualitativeStatus !== undefined,
        )
        .map((l) => l.qualitativeStatus as string),
    ),
  );

  return {
    totalQuantity,
    availableQuantity,
    reservedQuantity,
    inUseQuantity,
    scrappedQuantity,
    qualitativeStatuses,
    lotCount: lots.length,
  };
}
