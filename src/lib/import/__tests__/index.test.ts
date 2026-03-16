import {
  planLocations,
  planParts,
  planLots,
  executeLocations,
  executeParts,
  executeLots,
  planImport,
  executeImport,
} from '../index';
import type { ImportPlan } from '../types';

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    part: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    location: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    lot: { findMany: jest.fn(), create: jest.fn() },
    event: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/events', () => ({
  createEvent: jest.fn().mockResolvedValue({}),
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
  // $transaction executes the callback with the same mock client
  (mockPrisma.$transaction as jest.Mock).mockImplementation(
    (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)
  );
});

// ---------------------------------------------------------------------------
// planLocations
// ---------------------------------------------------------------------------

describe('planLocations', () => {
  it('marks a new location as create', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planLocations([{ path: 'Shelf A', notes: '' }]);
    expect(plan.willCreate).toBe(1);
    expect(plan.willSkip).toBe(0);
    expect(plan.errorCount).toBe(0);
    expect(plan.rows[0].action).toBe('create');
  });

  it('auto-creates ancestor segments', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planLocations([{ path: 'Office/Shelf A/Drawer 1', notes: '' }]);
    // "Office" + "Office/Shelf A" + "Office/Shelf A/Drawer 1" = 3
    expect(plan.willCreate).toBe(3);
  });

  it('marks an existing location with notes as update', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc-1', path: 'Shelf A' },
    ]);
    const plan = await planLocations([{ path: 'Shelf A', notes: 'updated note' }]);
    expect(plan.willUpdate).toBe(1);
    expect(plan.willCreate).toBe(0);
  });

  it('marks an existing location without notes as skip', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc-1', path: 'Shelf A' },
    ]);
    const plan = await planLocations([{ path: 'Shelf A' }]);
    expect(plan.willSkip).toBe(1);
  });

  it('errors on rows missing path', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planLocations([{ path: '' }]);
    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].action).toBe('error');
    expect(plan.rows[0].errors[0].field).toBe('path');
  });
});

// ---------------------------------------------------------------------------
// planParts
// ---------------------------------------------------------------------------

describe('planParts', () => {
  it('marks a new part as create', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planParts([{ name: 'ESP32', category: 'MCU', mpn: '' }]);
    expect(plan.willCreate).toBe(1);
    expect(plan.rows[0].action).toBe('create');
  });

  it('detects duplicate by MPN and marks as update', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' },
    ]);
    const plan = await planParts([{ name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' }]);
    expect(plan.willUpdate).toBe(1);
    expect(plan.willCreate).toBe(0);
    expect(plan.rows[0].action).toBe('update');
  });

  it('detects duplicate by name+category and marks as update', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'ESP32', category: 'MCU', mpn: null },
    ]);
    const plan = await planParts([{ name: 'ESP32', category: 'MCU', mpn: '' }]);
    expect(plan.willUpdate).toBe(1);
  });

  it('adds a warning (not an error) for duplicates detected by MPN', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' },
    ]);
    const plan = await planParts([{ name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' }]);
    expect(plan.errorCount).toBe(0);
    expect(plan.rows[0].action).toBe('update');
    expect(plan.rows[0].warnings).toHaveLength(1);
    expect(plan.rows[0].warnings![0].message).toMatch(/duplicate/i);
  });

  it('errors on rows missing name', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planParts([{ name: '', category: 'MCU' }]);
    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].action).toBe('error');
    expect(plan.rows[0].errors[0].field).toBe('name');
  });
});

// ---------------------------------------------------------------------------
// planLots
// ---------------------------------------------------------------------------

describe('planLots', () => {
  beforeEach(() => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' },
    ]);
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc1', path: 'Shelf A' },
    ]);
  });

  it('resolves part by MPN and marks lot as create', async () => {
    const plan = await planLots([
      { partMpn: 'ESP32-WROOM', partName: '', quantity: '5', locationPath: 'Shelf A' },
    ]);
    expect(plan.willCreate).toBe(1);
    expect(plan.rows[0].action).toBe('create');
  });

  it('resolves part by name and marks lot as create', async () => {
    const plan = await planLots([
      { partMpn: '', partName: 'ESP32', quantity: '5', locationPath: '' },
    ]);
    expect(plan.willCreate).toBe(1);
  });

  it('errors when part cannot be resolved', async () => {
    const plan = await planLots([{ partMpn: '', partName: 'Unknown', quantity: '5' }]);
    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].action).toBe('error');
  });

  it('creates lot in qualitative mode when quantity is blank', async () => {
    // A lot with no quantity maps to qualitative mode; should still create
    const plan = await planLots([{ partMpn: 'ESP32-WROOM', partName: '', quantity: '' }]);
    expect(plan.willCreate).toBe(1);
  });

  it('errors when quantity is not a valid integer', async () => {
    const plan = await planLots([{ partMpn: 'ESP32-WROOM', partName: '', quantity: '1.5' }]);
    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].action).toBe('error');
    expect(plan.rows[0].errors[0].field).toBe('quantity');
  });

  it('errors when quantity is negative', async () => {
    const plan = await planLots([{ partMpn: 'ESP32-WROOM', partName: '', quantity: '-1' }]);
    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].action).toBe('error');
    expect(plan.rows[0].errors[0].field).toBe('quantity');
  });

  it('errors when purchaseDate is not a valid date', async () => {
    const plan = await planLots([{ partMpn: 'ESP32-WROOM', partName: '', quantity: '5', purchaseDate: 'not-a-date' }]);
    expect(plan.errorCount).toBe(1);
    expect(plan.rows[0].action).toBe('error');
    expect(plan.rows[0].errors[0].field).toBe('purchaseDate');
  });

  it('accepts a valid ISO-8601 purchaseDate', async () => {
    const plan = await planLots([{ partMpn: 'ESP32-WROOM', partName: '', quantity: '5', purchaseDate: '2024-01-15' }]);
    expect(plan.willCreate).toBe(1);
    expect(plan.rows[0].action).toBe('create');
  });
});

// ---------------------------------------------------------------------------
// planImport dispatcher
// ---------------------------------------------------------------------------

describe('planImport', () => {
  it('dispatches locations correctly', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planImport('locations', [{ path: 'Shelf A', notes: '' }]);
    expect(plan.type).toBe('locations');
  });

  it('dispatches parts correctly', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planImport('parts', [{ name: 'ESP32', category: '' }]);
    expect(plan.type).toBe('parts');
  });

  it('dispatches lots correctly', async () => {
    (mockPrisma.part.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM' },
    ]);
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    const plan = await planImport('lots', [{ partMpn: 'ESP32-WROOM', partName: '', quantity: '1' }]);
    expect(plan.type).toBe('lots');
  });
});

// ---------------------------------------------------------------------------
// executeParts
// ---------------------------------------------------------------------------

describe('executeParts', () => {
  it('creates new parts', async () => {
    (mockPrisma.part.create as jest.Mock).mockResolvedValue({ id: 'new-1' });
    const plan: ImportPlan = {
      type: 'parts',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [
        {
          rowIndex: 1,
          action: 'create',
          data: { name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM', manufacturer: '', tags: '', notes: '' },
          errors: [],
        },
      ],
    };
    const summary = await executeParts(plan);
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(0);
    expect(mockPrisma.part.create).toHaveBeenCalledTimes(1);
  });

  it('updates existing parts', async () => {
    (mockPrisma.part.update as jest.Mock).mockResolvedValue({ id: 'p1' });
    const plan: ImportPlan = {
      type: 'parts',
      willCreate: 0, willUpdate: 1, willSkip: 0, errorCount: 0,
      rows: [
        {
          rowIndex: 1,
          action: 'update',
          data: { name: 'ESP32', category: 'MCU', mpn: 'ESP32-WROOM', _existingId: 'p1' },
          errors: [],
        },
      ],
    };
    const summary = await executeParts(plan);
    expect(summary.updated).toBe(1);
    expect(mockPrisma.part.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } })
    );
  });

  it('does not clear existing fields when update row has blank cells', async () => {
    (mockPrisma.part.update as jest.Mock).mockResolvedValue({ id: 'p1' });
    const plan: ImportPlan = {
      type: 'parts',
      willCreate: 0, willUpdate: 1, willSkip: 0, errorCount: 0,
      rows: [
        {
          rowIndex: 1,
          action: 'update',
          // category, manufacturer, mpn, notes, tags are all blank
          data: { name: 'ESP32', category: '', manufacturer: '', mpn: '', notes: '', tags: '', _existingId: 'p1' },
          errors: [],
        },
      ],
    };
    await executeParts(plan);
    const updateCall = (mockPrisma.part.update as jest.Mock).mock.calls[0][0];
    // Only name should be in the update payload; blank fields are omitted
    expect(updateCall.data).toHaveProperty('name', 'ESP32');
    expect(updateCall.data).not.toHaveProperty('category');
    expect(updateCall.data).not.toHaveProperty('manufacturer');
    expect(updateCall.data).not.toHaveProperty('mpn');
    expect(updateCall.data).not.toHaveProperty('notes');
    expect(updateCall.data).not.toHaveProperty('tags');
  });

  it('skips rows with skip action', async () => {
    const plan: ImportPlan = {
      type: 'parts',
      willCreate: 0, willUpdate: 0, willSkip: 1, errorCount: 0,
      rows: [
        { rowIndex: 1, action: 'skip', data: { name: 'ESP32' }, errors: [] },
      ],
    };
    const summary = await executeParts(plan);
    expect(summary.skipped).toBe(1);
    expect(mockPrisma.part.create).not.toHaveBeenCalled();
    expect(mockPrisma.part.update).not.toHaveBeenCalled();
  });

  it('parses comma-separated tags into JSON array', async () => {
    (mockPrisma.part.create as jest.Mock).mockResolvedValue({ id: 'new-1' });
    const plan: ImportPlan = {
      type: 'parts',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [
        { rowIndex: 1, action: 'create', data: { name: 'Part A', tags: 'smd,resistor,0402' }, errors: [] },
      ],
    };
    await executeParts(plan);
    const createCall = (mockPrisma.part.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.tags).toBe('["smd","resistor","0402"]');
  });
});

// ---------------------------------------------------------------------------
// executeLocations
// ---------------------------------------------------------------------------

describe('executeLocations', () => {
  it('creates a new location', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.location.create as jest.Mock).mockResolvedValue({ id: 'loc-new' });
    const plan: ImportPlan = {
      type: 'locations',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [
        { rowIndex: 1, action: 'create', data: { path: 'Shelf A', notes: '' }, errors: [] },
      ],
    };
    const summary = await executeLocations(plan);
    expect(summary.created).toBe(1);
    expect(mockPrisma.location.create).toHaveBeenCalled();
  });

  it('updates an existing location', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([
      { id: 'loc-1', path: 'Shelf A' },
    ]);
    (mockPrisma.location.update as jest.Mock).mockResolvedValue({ id: 'loc-1' });
    const plan: ImportPlan = {
      type: 'locations',
      willCreate: 0, willUpdate: 1, willSkip: 0, errorCount: 0,
      rows: [
        { rowIndex: 1, action: 'update', data: { path: 'Shelf A', notes: 'new note' }, errors: [] },
      ],
    };
    const summary = await executeLocations(plan);
    expect(summary.updated).toBe(1);
    expect(mockPrisma.location.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'loc-1' } })
    );
  });

  it('auto-creates ancestor segments', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.location.create as jest.Mock)
      .mockResolvedValueOnce({ id: 'anc-1' })  // "Office"
      .mockResolvedValueOnce({ id: 'anc-2' })  // "Office/Shelf A"
      .mockResolvedValueOnce({ id: 'leaf-1' }); // "Office/Shelf A/Drawer 1"
    const plan: ImportPlan = {
      type: 'locations',
      willCreate: 3, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [
        { rowIndex: 1, action: 'create', data: { path: 'Office/Shelf A/Drawer 1', notes: '' }, errors: [] },
      ],
    };
    const summary = await executeLocations(plan);
    expect(mockPrisma.location.create).toHaveBeenCalledTimes(3);
    expect(summary.created).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// executeLots
// ---------------------------------------------------------------------------

describe('executeLots', () => {
  it('creates a lot and fires a received event', async () => {
    (mockPrisma.lot.create as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    const plan: ImportPlan = {
      type: 'lots',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [
        {
          rowIndex: 1,
          action: 'create',
          data: { _partId: 'p1', quantity: '5', unit: 'pcs', locationPath: 'Shelf A', _locationId: 'loc-1' },
          errors: [],
        },
      ],
    };
    const summary = await executeLots(plan);
    expect(summary.created).toBe(1);
    expect(mockPrisma.lot.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.event.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lotId: 'lot-1', type: 'received' }) }));
  });

  it('uses qualitative mode when quantity is blank', async () => {
    (mockPrisma.lot.create as jest.Mock).mockResolvedValue({ id: 'lot-2' });
    const plan: ImportPlan = {
      type: 'lots',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [
        {
          rowIndex: 1,
          action: 'create',
          data: { _partId: 'p1', quantity: '' },
          errors: [],
        },
      ],
    };
    await executeLots(plan);
    const createCall = (mockPrisma.lot.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.quantityMode).toBe('qualitative');
    expect(createCall.data.quantity).toBeNull();
  });

  it('skips rows with error action', async () => {
    const plan: ImportPlan = {
      type: 'lots',
      willCreate: 0, willUpdate: 0, willSkip: 0, errorCount: 1,
      rows: [
        { rowIndex: 1, action: 'error', data: {}, errors: [{ message: 'part not found' }] },
      ],
    };
    const summary = await executeLots(plan);
    expect(summary.errors).toBe(1);
    expect(mockPrisma.lot.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// executeImport dispatcher
// ---------------------------------------------------------------------------

describe('executeImport', () => {
  it('dispatches to executeLocations', async () => {
    (mockPrisma.location.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.location.create as jest.Mock).mockResolvedValue({ id: 'loc-1' });
    const plan: ImportPlan = {
      type: 'locations',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [{ rowIndex: 1, action: 'create', data: { path: 'Shelf A', notes: '' }, errors: [] }],
    };
    const summary = await executeImport(plan);
    expect(summary.type).toBe('locations');
  });

  it('dispatches to executeParts', async () => {
    (mockPrisma.part.create as jest.Mock).mockResolvedValue({ id: 'p-new' });
    const plan: ImportPlan = {
      type: 'parts',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [{ rowIndex: 1, action: 'create', data: { name: 'ESP32', category: '', mpn: '' }, errors: [] }],
    };
    const summary = await executeImport(plan);
    expect(summary.type).toBe('parts');
  });

  it('dispatches to executeLots', async () => {
    (mockPrisma.lot.create as jest.Mock).mockResolvedValue({ id: 'lot-1' });
    const plan: ImportPlan = {
      type: 'lots',
      willCreate: 1, willUpdate: 0, willSkip: 0, errorCount: 0,
      rows: [{
        rowIndex: 1,
        action: 'create',
        data: { _partId: 'part-1', _locationId: null, quantity: '5' },
        errors: [],
      }],
    };
    const summary = await executeImport(plan);
    expect(summary.type).toBe('lots');
    expect(summary.created).toBe(1);
  });
});
