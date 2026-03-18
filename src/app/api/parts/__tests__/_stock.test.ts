import { computeStockFields, type LotForStock } from '../_stock';

// ─── computeStockFields ───────────────────────────────────────────────────────

describe('computeStockFields', () => {
  it('returns all-zero counts for empty lots array', () => {
    const result = computeStockFields([]);
    expect(result).toEqual({
      totalQuantity: 0,
      availableQuantity: 0,
      reservedQuantity: 0,
      inUseQuantity: 0,
      scrappedQuantity: 0,
      qualitativeStatuses: [],
      lotCount: 0,
    });
  });

  it('sums quantity for exact in_stock lots', () => {
    const lots: LotForStock[] = [
      { quantity: 10, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
      { quantity: 5, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
    ];
    const { totalQuantity } = computeStockFields(lots);
    expect(totalQuantity).toBe(15);
  });

  it('ignores non-in_stock lots for totalQuantity', () => {
    const lots: LotForStock[] = [
      { quantity: 10, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
      { quantity: 20, quantityMode: 'exact', qualitativeStatus: null, status: 'scrapped' },
      { quantity: 5, quantityMode: 'exact', qualitativeStatus: null, status: 'ordered' },
    ];
    const { totalQuantity } = computeStockFields(lots);
    expect(totalQuantity).toBe(10);
  });

  it('ignores qualitative lots for totalQuantity', () => {
    const lots: LotForStock[] = [
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'good', status: 'in_stock' },
      { quantity: 5, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
    ];
    const { totalQuantity } = computeStockFields(lots);
    expect(totalQuantity).toBe(5);
  });

  it('handles null quantity by treating it as 0', () => {
    const lots: LotForStock[] = [
      { quantity: null, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
    ];
    const { totalQuantity } = computeStockFields(lots);
    expect(totalQuantity).toBe(0);
  });

  it('sums reservedQuantity from reserved allocations', () => {
    const lots: LotForStock[] = [
      {
        quantity: 100,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [
          { quantity: 10, status: 'reserved' },
          { quantity: 5, status: 'reserved' },
        ],
      },
    ];
    const { reservedQuantity } = computeStockFields(lots);
    expect(reservedQuantity).toBe(15);
  });

  it('sums inUseQuantity from in_use allocations', () => {
    const lots: LotForStock[] = [
      {
        quantity: 100,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [
          { quantity: 8, status: 'in_use' },
          { quantity: 2, status: 'in_use' },
        ],
      },
    ];
    const { inUseQuantity } = computeStockFields(lots);
    expect(inUseQuantity).toBe(10);
  });

  it('ignores non-reserved/non-in_use allocations', () => {
    const lots: LotForStock[] = [
      {
        quantity: 50,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [
          { quantity: 5, status: 'deployed' },
          { quantity: 3, status: 'recovered' },
        ],
      },
    ];
    const { reservedQuantity, inUseQuantity } = computeStockFields(lots);
    expect(reservedQuantity).toBe(0);
    expect(inUseQuantity).toBe(0);
  });

  it('computes availableQuantity as totalQuantity minus reserved and in_use', () => {
    const lots: LotForStock[] = [
      {
        quantity: 20,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [
          { quantity: 5, status: 'reserved' },
          { quantity: 3, status: 'in_use' },
        ],
      },
    ];
    const { availableQuantity, totalQuantity, reservedQuantity, inUseQuantity } = computeStockFields(lots);
    expect(totalQuantity).toBe(20);
    expect(reservedQuantity).toBe(5);
    expect(inUseQuantity).toBe(3);
    expect(availableQuantity).toBe(12);
  });

  it('clamps availableQuantity to 0 when allocations exceed total', () => {
    const lots: LotForStock[] = [
      {
        quantity: 5,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [
          { quantity: 4, status: 'reserved' },
          { quantity: 4, status: 'in_use' },
        ],
      },
    ];
    const { availableQuantity } = computeStockFields(lots);
    expect(availableQuantity).toBe(0);
  });

  it('sums scrappedQuantity from scrapped exact lots', () => {
    const lots: LotForStock[] = [
      { quantity: 3, quantityMode: 'exact', qualitativeStatus: null, status: 'scrapped' },
      { quantity: 7, quantityMode: 'exact', qualitativeStatus: null, status: 'scrapped' },
    ];
    const { scrappedQuantity } = computeStockFields(lots);
    expect(scrappedQuantity).toBe(10);
  });

  it('ignores qualitative scrapped lots for scrappedQuantity', () => {
    const lots: LotForStock[] = [
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'damaged', status: 'scrapped' },
    ];
    const { scrappedQuantity } = computeStockFields(lots);
    expect(scrappedQuantity).toBe(0);
  });

  it('collects unique qualitativeStatuses from qualitative in_stock lots', () => {
    const lots: LotForStock[] = [
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'good', status: 'in_stock' },
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'fair', status: 'in_stock' },
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'good', status: 'in_stock' },
    ];
    const { qualitativeStatuses } = computeStockFields(lots);
    expect(qualitativeStatuses).toHaveLength(2);
    expect(qualitativeStatuses).toContain('good');
    expect(qualitativeStatuses).toContain('fair');
  });

  it('excludes null qualitativeStatus from qualitativeStatuses', () => {
    const lots: LotForStock[] = [
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: null, status: 'in_stock' },
    ];
    const { qualitativeStatuses } = computeStockFields(lots);
    expect(qualitativeStatuses).toHaveLength(0);
  });

  it('does not include qualitative statuses from non-in_stock lots', () => {
    const lots: LotForStock[] = [
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'good', status: 'scrapped' },
    ];
    const { qualitativeStatuses } = computeStockFields(lots);
    expect(qualitativeStatuses).toHaveLength(0);
  });

  it('returns lotCount equal to total number of lots', () => {
    const lots: LotForStock[] = [
      { quantity: 5, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
      { quantity: 3, quantityMode: 'exact', qualitativeStatus: null, status: 'scrapped' },
      { quantity: null, quantityMode: 'qualitative', qualitativeStatus: 'good', status: 'in_stock' },
    ];
    const { lotCount } = computeStockFields(lots);
    expect(lotCount).toBe(3);
  });

  it('aggregates allocations across multiple lots', () => {
    const lots: LotForStock[] = [
      {
        quantity: 10,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [{ quantity: 3, status: 'reserved' }],
      },
      {
        quantity: 10,
        quantityMode: 'exact',
        qualitativeStatus: null,
        status: 'in_stock',
        allocations: [{ quantity: 2, status: 'in_use' }],
      },
    ];
    const { totalQuantity, reservedQuantity, inUseQuantity, availableQuantity } = computeStockFields(lots);
    expect(totalQuantity).toBe(20);
    expect(reservedQuantity).toBe(3);
    expect(inUseQuantity).toBe(2);
    expect(availableQuantity).toBe(15);
  });

  it('treats lots with no allocations field as having no allocations', () => {
    const lots: LotForStock[] = [
      { quantity: 10, quantityMode: 'exact', qualitativeStatus: null, status: 'in_stock' },
    ];
    const { reservedQuantity, inUseQuantity, availableQuantity } = computeStockFields(lots);
    expect(reservedQuantity).toBe(0);
    expect(inUseQuantity).toBe(0);
    expect(availableQuantity).toBe(10);
  });
});
