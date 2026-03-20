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

  const inStockExactAllocations = inStockLots
    .filter((l) => l.quantityMode === 'exact')
    .flatMap((l) => l.allocations ?? []);

  const reservedQuantity = inStockExactAllocations
    .filter((a) => a.status === 'reserved')
    .reduce((sum, a) => sum + (a.quantity ?? 0), 0);

  const inUseQuantity = inStockExactAllocations
    .filter((a) => a.status === 'in_use' || a.status === 'deployed')
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
