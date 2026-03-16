import prisma from '@/lib/db';
import { detectSourceType } from '@/lib/utils';
import type {
  ImportType,
  ImportPlan,
  ImportSummary,
  ImportRowResult,
  ImportRowError,
  PartRow,
  LotRow,
  LocationRow,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blank(v: string | undefined): boolean {
  return !v || v.trim() === '';
}

function asRow<T>(data: Record<string, string>): T {
  return data as unknown as T;
}

function rowError(field: string | undefined, message: string): ImportRowError {
  return { field, message };
}

/** Extract a trimmed string value from a row field, returning '' if absent. */
function strField(row: Record<string, unknown>, key: string): string {
  return row[key] ? String(row[key]).trim() : '';
}

type TransactionClient = any;

// ---------------------------------------------------------------------------
// LOCATION PLANNING
// ---------------------------------------------------------------------------

export async function planLocations(rows: Record<string, string>[]): Promise<ImportPlan> {
  const existing = await prisma.location.findMany({ select: { id: true, path: true } });
  const existingByPath = new Map<string, string>(
    (existing as Array<{ id: string; path: string }>).map((l) => [l.path, l.id] as [string, string])
  );
  const plannedPaths = new Set<string>(existingByPath.keys());

  const rowResults: ImportRowResult[] = [];
  let willCreate = 0, willUpdate = 0, willSkip = 0, errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row: LocationRow = asRow<LocationRow>(rows[i]);
    const errors: ImportRowError[] = [];

    if (blank(row.path)) errors.push(rowError('path', 'path is required'));

    if (errors.length > 0) {
      errorCount++;
      rowResults.push({ rowIndex: i + 1, action: 'error', data: rows[i], errors });
      continue;
    }

    const path = row.path.trim();
    const segments = path.split('/').map((s) => s.trim()).filter(Boolean);

    for (let s = 0; s < segments.length - 1; s++) {
      const segPath = segments.slice(0, s + 1).join('/');
      if (!plannedPaths.has(segPath)) { plannedPaths.add(segPath); willCreate++; }
    }

    const isNew = !existingByPath.has(path);
    // Treat blank/whitespace notes as "no update" — only mark 'update' when there is actual content
    const hasNonBlankNotes = !blank(row.notes);
    const action: ImportRowResult['action'] = isNew ? 'create' : hasNonBlankNotes ? 'update' : 'skip';
    if (action === 'create') willCreate++;
    else if (action === 'update') willUpdate++;
    else willSkip++;
    plannedPaths.add(path);
    rowResults.push({ rowIndex: i + 1, action, data: rows[i], errors: [] });
  }

  return { type: 'locations', willCreate, willUpdate, willSkip, errorCount, rows: rowResults };
}

// ---------------------------------------------------------------------------
// PART PLANNING
// ---------------------------------------------------------------------------

export async function planParts(rows: Record<string, string>[]): Promise<ImportPlan> {
  const existing = await prisma.part.findMany({ select: { id: true, name: true, category: true, mpn: true } });
  const byMpn = new Map<string, string>();
  const byNameCat = new Map<string, string>();
  for (const p of existing as Array<{ id: string; name: string; category: string | null; mpn: string | null }>) {
    if (p.mpn) byMpn.set(p.mpn.toLowerCase(), p.id);
    byNameCat.set(`${p.name.toLowerCase()}::${(p.category ?? '').toLowerCase()}`, p.id);
  }

  const rowResults: ImportRowResult[] = [];
  let willCreate = 0, willUpdate = 0, willSkip = 0, errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row: PartRow = asRow<PartRow>(rows[i]);
    const errors: ImportRowError[] = [];
    if (blank(row.name)) errors.push(rowError('name', 'name is required'));

    if (errors.length > 0) {
      errorCount++;
      rowResults.push({ rowIndex: i + 1, action: 'error', data: rows[i], errors });
      continue;
    }

    let existingId: string | undefined;
    if (!blank(row.mpn)) existingId = byMpn.get(row.mpn!.toLowerCase());
    if (!existingId) existingId = byNameCat.get(`${row.name.toLowerCase()}::${(row.category ?? '').toLowerCase()}`);

    const warnings: ImportRowError[] = existingId
      ? [{ message: 'Duplicate detected — existing record will be updated' }]
      : [];

    const action: ImportRowResult['action'] = existingId ? 'update' : 'create';
    if (action === 'create') willCreate++; else willUpdate++;

    rowResults.push({ rowIndex: i + 1, action, data: { ...rows[i], _existingId: existingId ?? '' }, errors: [], warnings });
  }

  return { type: 'parts', willCreate, willUpdate, willSkip, errorCount, rows: rowResults };
}

// ---------------------------------------------------------------------------
// LOT PLANNING
// ---------------------------------------------------------------------------

export async function planLots(rows: Record<string, string>[]): Promise<ImportPlan> {
  const [existingParts, existingLocations] = await Promise.all([
    prisma.part.findMany({ select: { id: true, name: true, mpn: true } }),
    prisma.location.findMany({ select: { id: true, path: true } }),
  ]);

  const partsByMpn = new Map<string, string>();
  const partsByName = new Map<string, string>();
  for (const p of existingParts as Array<{ id: string; name: string; mpn: string | null }>) {
    if (p.mpn) partsByMpn.set(p.mpn.toLowerCase(), p.id);
    partsByName.set(p.name.toLowerCase(), p.id);
  }
  const locationsByPath = new Map<string, string>(
    (existingLocations as Array<{ id: string; path: string }>).map((l) => [l.path, l.id] as [string, string])
  );

  const rowResults: ImportRowResult[] = [];
  let willCreate = 0, willSkip = 0, errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row: LotRow = asRow<LotRow>(rows[i]);
    const errors: ImportRowError[] = [];

    if (blank(row.partName) && blank(row.partMpn)) errors.push(rowError(undefined, 'partName or partMpn is required'));

    let partId: string | undefined;
    if (!blank(row.partMpn)) {
      partId = partsByMpn.get(row.partMpn!.toLowerCase());
      if (!partId) errors.push(rowError('partMpn', `No part found with MPN "${row.partMpn}"`));
    } else if (!blank(row.partName)) {
      partId = partsByName.get(row.partName!.toLowerCase());
      if (!partId) errors.push(rowError('partName', `No part found with name "${row.partName}"`));
    }

    let locationId: string | undefined;
    if (!blank(row.locationPath)) {
      locationId = locationsByPath.get(row.locationPath!.trim());
      if (!locationId) errors.push(rowError('locationPath', `Location "${row.locationPath}" not found — import locations first`));
    }

    // Validate quantity: must be a non-negative integer when provided
    if (!blank(row.quantity)) {
      const trimmed = row.quantity!.trim();
      const qty = parseInt(trimmed, 10);
      if (isNaN(qty) || qty < 0 || String(qty) !== trimmed) {
        errors.push(rowError('quantity', 'quantity must be a non-negative integer'));
      }
    }

    // Validate purchaseDate: must parse to a valid date when provided
    if (!blank(row.purchaseDate)) {
      const d = new Date(row.purchaseDate!.trim());
      if (isNaN(d.getTime())) {
        errors.push(rowError('purchaseDate', `"${row.purchaseDate}" is not a valid date`));
      }
    }

    if (errors.length > 0) { errorCount++; rowResults.push({ rowIndex: i + 1, action: 'error', data: rows[i], errors }); continue; }

    willCreate++;
    rowResults.push({ rowIndex: i + 1, action: 'create', data: { ...rows[i], _partId: partId ?? '', _locationId: locationId ?? '' }, errors: [] });
  }

  return { type: 'lots', willCreate, willUpdate: 0, willSkip, errorCount, rows: rowResults };
}

// ---------------------------------------------------------------------------
// EXECUTE LOCATIONS
// ---------------------------------------------------------------------------

export async function executeLocations(plan: ImportPlan, tx?: TransactionClient): Promise<ImportSummary> {
  const db = tx ?? prisma;
  let created = 0, updated = 0, skipped = 0, errors = 0;

  const existingList = await db.location.findMany({ select: { id: true, path: true } });
  const existingByPath = new Map<string, string>(
    (existingList as Array<{ id: string; path: string }>).map((l) => [l.path, l.id] as [string, string])
  );

  for (const rowResult of plan.rows) {
    if (rowResult.action === 'error') { errors++; continue; }

    const row = rowResult.data as Record<string, unknown>;
    const path = String(row['path'] ?? '').trim();
    const notes = row['notes'] != null ? String(row['notes']).trim() || null : null;
    const segments = path.split('/').map((s) => s.trim()).filter(Boolean);

    let parentId: string | null = null;
    for (let s = 0; s < segments.length; s++) {
      const segPath = segments.slice(0, s + 1).join('/');
      const segName = segments[s];
      if (existingByPath.has(segPath)) {
        parentId = existingByPath.get(segPath)!;
      } else {
        const loc = await db.location.create({
          data: { name: segName, path: segPath, parentId, notes: s === segments.length - 1 ? notes : null },
        }) as { id: string };
        existingByPath.set(segPath, loc.id);
        parentId = loc.id;
        if (s < segments.length - 1) created++;
      }
    }

    const leafId = existingByPath.get(path);
    if (rowResult.action === 'create') created++;
    else if (rowResult.action === 'update' && leafId) { await db.location.update({ where: { id: leafId }, data: { notes } }); updated++; }
    else skipped++;
  }

  return { type: 'locations', created, updated, skipped, errors, rows: plan.rows };
}

// ---------------------------------------------------------------------------
// EXECUTE PARTS
// ---------------------------------------------------------------------------

export async function executeParts(plan: ImportPlan, tx?: TransactionClient): Promise<ImportSummary> {
  const db = tx ?? prisma;
  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (const rowResult of plan.rows) {
    if (rowResult.action === 'error') { errors++; continue; }

    const row = rowResult.data as Record<string, unknown>;
    const name = String(row['name'] ?? '').trim();
    const category = row['category'] ? String(row['category']).trim() || null : null;
    const manufacturer = row['manufacturer'] ? String(row['manufacturer']).trim() || null : null;
    const mpn = row['mpn'] ? String(row['mpn']).trim() || null : null;
    const notes = row['notes'] ? String(row['notes']).trim() || null : null;
    const rawTags = row['tags'] ? String(row['tags']) : '';
    const tags = rawTags ? JSON.stringify(rawTags.split(',').map((t) => t.trim()).filter(Boolean)) : '[]';
    const existingId = row['_existingId'] ? String(row['_existingId']) : null;

    if (rowResult.action === 'create') {
      await db.part.create({ data: { name, category, manufacturer, mpn, notes, tags } });
      created++;
    } else if (rowResult.action === 'update' && existingId) {
      // Only include non-blank fields in the update to avoid clearing existing DB values
      const updateData: Record<string, unknown> = { name };
      if (!blank(String(row['category'] ?? ''))) updateData.category = category;
      if (!blank(String(row['manufacturer'] ?? ''))) updateData.manufacturer = manufacturer;
      if (!blank(String(row['mpn'] ?? ''))) updateData.mpn = mpn;
      if (!blank(String(row['notes'] ?? ''))) updateData.notes = notes;
      if (rawTags) updateData.tags = tags;
      await db.part.update({ where: { id: existingId }, data: updateData });
      updated++;
    } else skipped++;
  }

  return { type: 'parts', created, updated, skipped, errors, rows: plan.rows };
}

// ---------------------------------------------------------------------------
// EXECUTE LOTS
// ---------------------------------------------------------------------------

export async function executeLots(plan: ImportPlan, tx?: TransactionClient): Promise<ImportSummary> {
  const db = tx ?? prisma;
  let created = 0, skipped = 0, errors = 0;

  for (const rowResult of plan.rows) {
    if (rowResult.action === 'error') { errors++; continue; }

    const row = rowResult.data as Record<string, unknown>;
    const partId = row['_partId'] ? String(row['_partId']) : null;
    const locationId = row['_locationId'] ? String(row['_locationId']) : null;
    if (!partId) { errors++; continue; }

    const qtyStr = row['quantity'] ? String(row['quantity']).trim() : '';
    const quantityMode = qtyStr !== '' ? 'exact' : 'qualitative';
    // quantity was validated as a non-negative integer during planning
    const quantity = quantityMode === 'exact' ? parseInt(qtyStr, 10) : null;

    const sourceObj: Record<string, unknown> = {};
    const seller = strField(row, 'seller');
    const sourceUrl = strField(row, 'sourceUrl');
    const unitCost = strField(row, 'unitCost');
    const currency = strField(row, 'currency');
    const purchaseDate = strField(row, 'purchaseDate');
    if (seller) sourceObj.seller = seller;
    if (sourceUrl) { sourceObj.url = sourceUrl; sourceObj.type = detectSourceType(sourceUrl); }
    if (unitCost) sourceObj.unitCost = parseFloat(unitCost);
    if (currency) sourceObj.currency = currency;
    if (purchaseDate) sourceObj.purchaseDate = purchaseDate;

    // purchaseDate was validated as a valid date during planning
    const receivedAt = purchaseDate ? new Date(purchaseDate) : null;

    const lot = await db.lot.create({
      data: {
        partId, quantity: quantity ?? null, quantityMode,
        qualitativeStatus: quantityMode === 'qualitative' ? 'plenty' : null,
        unit: row['unit'] ? String(row['unit']).trim() || null : null,
        locationId: locationId || null,
        source: JSON.stringify(sourceObj),
        notes: row['notes'] ? String(row['notes']).trim() || null : null,
        receivedAt,
      },
    }) as { id: string };

    await db.event.create({ data: { lotId: lot.id, type: 'received' } });
    created++;
  }

  return { type: 'lots', created, updated: 0, skipped, errors, rows: plan.rows };
}

// ---------------------------------------------------------------------------
// Dispatchers
// ---------------------------------------------------------------------------

export async function planImport(type: ImportType, rows: Record<string, string>[]): Promise<ImportPlan> {
  if (type === 'locations') return planLocations(rows);
  if (type === 'parts') return planParts(rows);
  if (type === 'lots') return planLots(rows);
  throw new Error(`Unknown import type: ${type}`);
}

export async function executeImport(plan: ImportPlan): Promise<ImportSummary> {
  return prisma.$transaction(async (tx: TransactionClient) => {
    if (plan.type === 'locations') return executeLocations(plan, tx);
    if (plan.type === 'parts') return executeParts(plan, tx);
    if (plan.type === 'lots') return executeLots(plan, tx);
    throw new Error(`Unknown import type: ${plan.type}`);
  });
}
