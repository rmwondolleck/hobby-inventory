import prisma from '@/lib/db';
import { detectSourceType } from '@/lib/utils';
import { parseCSV, csvToRecords } from './csv-parser';
import type {
  ImportType,
  RowError,
  RowResult,
  ValidationSummary,
  ExecuteSummary,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function validateImport(
  type: ImportType,
  csv: string,
  overrideDuplicates: boolean
): Promise<ValidationSummary> {
  const records = parseRecords(csv);
  switch (type) {
    case 'parts':
      return validateParts(records, overrideDuplicates);
    case 'lots':
      return validateLots(records, overrideDuplicates);
    case 'locations':
      return validateLocations(records, overrideDuplicates);
  }
}

export async function executeImport(
  type: ImportType,
  csv: string,
  overrideDuplicates: boolean
): Promise<ExecuteSummary> {
  const records = parseRecords(csv);
  switch (type) {
    case 'parts':
      return executeParts(records, overrideDuplicates);
    case 'lots':
      return executeLots(records, overrideDuplicates);
    case 'locations':
      return executeLocations(records, overrideDuplicates);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRecords(csv: string): Record<string, string>[] {
  return csvToRecords(parseCSV(csv));
}

function str(val: string | undefined): string {
  return val?.trim() ?? '';
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

async function validateParts(
  records: Record<string, string>[],
  overrideDuplicates: boolean
): Promise<ValidationSummary> {
  const errors: RowError[] = [];
  const rows: RowResult[] = [];
  let willCreate = 0;
  let willUpdate = 0;
  let willSkip = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const rec = records[i];
    const name = str(rec['name']);
    const mpn = str(rec['mpn']);
    const category = str(rec['category']);

    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'name is required' });
      rows.push({ row: rowNum, action: 'error', message: 'name is required' });
      continue;
    }

    const existing = await prisma.part.findFirst({
      where: mpn ? { mpn } : { name, category: category || null },
      select: { id: true },
    });

    if (existing) {
      if (overrideDuplicates) {
        willUpdate++;
        rows.push({ row: rowNum, action: 'update', message: `Duplicate found (id: ${existing.id}), will update` });
      } else {
        willSkip++;
        rows.push({ row: rowNum, action: 'skip', message: 'Duplicate found, skipping' });
      }
    } else {
      willCreate++;
      rows.push({ row: rowNum, action: 'create' });
    }
  }

  return { willCreate, willUpdate, willSkip, errors, rows };
}

async function executeParts(
  records: Record<string, string>[],
  overrideDuplicates: boolean
): Promise<ExecuteSummary> {
  const errors: RowError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const rec = records[i];
    const name = str(rec['name']);
    const mpn = str(rec['mpn']);
    const category = str(rec['category']);
    const manufacturer = str(rec['manufacturer']);
    const tagsRaw = str(rec['tags']);
    const notes = str(rec['notes']);

    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'name is required' });
      continue;
    }

    // Tags are semicolon-separated within a CSV field to avoid comma conflicts
    const tags = tagsRaw
      ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean)
      : [];

    const data = {
      name,
      category: category || null,
      manufacturer: manufacturer || null,
      mpn: mpn || null,
      tags: JSON.stringify(tags),
      notes: notes || null,
      parameters: JSON.stringify({}),
    };

    try {
      const existing = await prisma.part.findFirst({
        where: mpn ? { mpn } : { name, category: category || null },
        select: { id: true },
      });

      if (existing) {
        if (overrideDuplicates) {
          await prisma.part.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.part.create({ data });
        created++;
      }
    } catch (err) {
      errors.push({ row: rowNum, field: 'unknown', message: String(err) });
    }
  }

  return { created, updated, skipped, errors };
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

async function validateLocations(
  records: Record<string, string>[],
  overrideDuplicates: boolean
): Promise<ValidationSummary> {
  const errors: RowError[] = [];
  const rows: RowResult[] = [];
  let willCreate = 0;
  let willUpdate = 0;
  let willSkip = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const rec = records[i];
    const path = str(rec['path']);

    if (!path) {
      errors.push({ row: rowNum, field: 'path', message: 'path is required' });
      rows.push({ row: rowNum, action: 'error', message: 'path is required' });
      continue;
    }

    const segments = path.split('/').map((s) => s.trim()).filter(Boolean);
    let newSegments = 0;

    for (let j = 0; j < segments.length; j++) {
      const segPath = segments.slice(0, j + 1).join('/');
      const existing = await prisma.location.findFirst({
        where: { path: segPath },
        select: { id: true },
      });
      if (!existing) newSegments++;
    }

    if (newSegments > 0) {
      willCreate++;
      rows.push({
        row: rowNum,
        action: 'create',
        message: `Will create ${newSegments} new location segment(s)`,
      });
    } else if (overrideDuplicates) {
      willUpdate++;
      rows.push({ row: rowNum, action: 'update', message: 'Location already exists, will update notes' });
    } else {
      willSkip++;
      rows.push({ row: rowNum, action: 'skip', message: 'Location already exists, skipping' });
    }
  }

  return { willCreate, willUpdate, willSkip, errors, rows };
}

async function executeLocations(
  records: Record<string, string>[],
  overrideDuplicates: boolean
): Promise<ExecuteSummary> {
  const errors: RowError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const rec = records[i];
    const path = str(rec['path']);
    const notes = str(rec['notes']);

    if (!path) {
      errors.push({ row: rowNum, field: 'path', message: 'path is required' });
      continue;
    }

    try {
      const segments = path.split('/').map((s) => s.trim()).filter(Boolean);
      let parentId: string | null = null;
      let anyCreated = false;
      let leafId: string | null = null;

      for (let j = 0; j < segments.length; j++) {
        const segPath = segments.slice(0, j + 1).join('/');
        const segName = segments[j];
        const isLeaf = j === segments.length - 1;

        const existing = await prisma.location.findFirst({ where: { path: segPath } });

        if (existing) {
          parentId = existing.id;
          if (isLeaf) leafId = existing.id;
        } else {
          const created: { id: string } = await prisma.location.create({
            data: {
              name: segName,
              parentId,
              path: segPath,
              notes: isLeaf ? (notes || null) : null,
            },
            select: { id: true },
          });
          parentId = created.id;
          if (isLeaf) leafId = created.id;
          anyCreated = true;
        }
      }

      if (anyCreated) {
        created++;
      } else if (overrideDuplicates && leafId) {
        await prisma.location.update({
          where: { id: leafId },
          data: { notes: notes || null },
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push({ row: rowNum, field: 'unknown', message: String(err) });
    }
  }

  return { created, updated, skipped, errors };
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

async function validateLots(
  records: Record<string, string>[],
  overrideDuplicates: boolean
): Promise<ValidationSummary> {
  const errors: RowError[] = [];
  const rows: RowResult[] = [];
  let willCreate = 0;
  let willSkip = 0;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const rec = records[i];
    const partName = str(rec['partName']);
    const partMpn = str(rec['partMpn']);
    const quantityStr = str(rec['quantity']);
    const purchaseDate = str(rec['purchaseDate']);

    if (!partName && !partMpn) {
      errors.push({
        row: rowNum,
        field: 'partName/partMpn',
        message: 'Either partName or partMpn is required',
      });
      rows.push({ row: rowNum, action: 'error', message: 'Either partName or partMpn is required' });
      continue;
    }

    if (quantityStr && isNaN(Number(quantityStr))) {
      errors.push({ row: rowNum, field: 'quantity', message: 'quantity must be a number' });
      rows.push({ row: rowNum, action: 'error', message: 'quantity must be a number' });
      continue;
    }

    const part = await prisma.part.findFirst({
      where: partMpn ? { mpn: partMpn } : { name: partName },
      select: { id: true },
    });

    if (!part) {
      errors.push({
        row: rowNum,
        field: partMpn ? 'partMpn' : 'partName',
        message: `Part not found: ${partMpn || partName}`,
      });
      rows.push({ row: rowNum, action: 'error', message: `Part not found: ${partMpn || partName}` });
      continue;
    }

    const duplicate = await findDuplicateLot(part.id, quantityStr, purchaseDate);

    if (duplicate) {
      willSkip++;
      rows.push({ row: rowNum, action: 'skip', message: 'Duplicate lot detected, skipping' });
    } else {
      willCreate++;
      rows.push({ row: rowNum, action: 'create' });
    }
  }

  // overrideDuplicates has no effect for lots — importing always creates; duplicates always skip.
  // We suppress the unused-variable lint here.
  void overrideDuplicates;

  return { willCreate, willUpdate: 0, willSkip, errors, rows };
}

async function executeLots(
  records: Record<string, string>[],
  overrideDuplicates: boolean
): Promise<ExecuteSummary> {
  const errors: RowError[] = [];
  let created = 0;
  let skipped = 0;

  // overrideDuplicates is intentionally not used for lots — creating a duplicate lot
  // that differs only by e.g. unitCost is indistinguishable from a new purchase.
  void overrideDuplicates;

  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const rec = records[i];

    const partName = str(rec['partName']);
    const partMpn = str(rec['partMpn']);
    const quantityStr = str(rec['quantity']);
    const unit = str(rec['unit']);
    const locationPath = str(rec['locationPath']);
    const seller = str(rec['seller']);
    const sourceUrl = str(rec['sourceUrl']);
    const unitCostStr = str(rec['unitCost']);
    const currency = str(rec['currency']);
    const purchaseDate = str(rec['purchaseDate']);
    const notes = str(rec['notes']);

    if (!partName && !partMpn) {
      errors.push({
        row: rowNum,
        field: 'partName/partMpn',
        message: 'Either partName or partMpn is required',
      });
      continue;
    }

    if (quantityStr && isNaN(Number(quantityStr))) {
      errors.push({ row: rowNum, field: 'quantity', message: 'quantity must be a number' });
      continue;
    }

    const part = await prisma.part.findFirst({
      where: partMpn ? { mpn: partMpn } : { name: partName },
      select: { id: true },
    });

    if (!part) {
      errors.push({
        row: rowNum,
        field: partMpn ? 'partMpn' : 'partName',
        message: `Part not found: ${partMpn || partName}`,
      });
      continue;
    }

    const duplicate = await findDuplicateLot(part.id, quantityStr, purchaseDate);
    if (duplicate) {
      skipped++;
      continue;
    }

    try {
      // Resolve or create location hierarchy
      let resolvedLocationId: string | null = null;
      if (locationPath) {
        resolvedLocationId = await ensureLocationPath(locationPath);
      }

      // Build source object
      const unitCost = unitCostStr ? parseFloat(unitCostStr) : undefined;
      const source: Record<string, unknown> = {};
      if (seller) source['seller'] = seller;
      if (sourceUrl) {
        source['url'] = sourceUrl;
        source['type'] = detectSourceType(sourceUrl);
      }
      if (unitCost !== undefined && !isNaN(unitCost)) source['unitCost'] = unitCost;
      if (currency) source['currency'] = currency;
      if (purchaseDate) source['purchaseDate'] = purchaseDate;

      const quantity = quantityStr ? parseInt(quantityStr, 10) : null;
      const receivedAt = purchaseDate ? new Date(purchaseDate) : null;

      await prisma.lot.create({
        data: {
          partId: part.id,
          quantity: quantity !== null && !isNaN(quantity) ? quantity : null,
          quantityMode: quantity !== null && !isNaN(quantity) ? 'exact' : 'qualitative',
          qualitativeStatus: quantity !== null && !isNaN(quantity) ? null : 'plenty',
          unit: unit || null,
          status: 'in_stock',
          locationId: resolvedLocationId,
          source: JSON.stringify(source),
          receivedAt,
          notes: notes || null,
        },
      });

      created++;
    } catch (err) {
      errors.push({ row: rowNum, field: 'unknown', message: String(err) });
    }
  }

  return { created, updated: 0, skipped, errors };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function findDuplicateLot(
  partId: string,
  quantityStr: string,
  purchaseDate: string
): Promise<{ id: string } | null> {
  const quantity = quantityStr ? parseInt(quantityStr, 10) : NaN;
  if (!purchaseDate || isNaN(quantity)) return null;

  const parsedDate = new Date(purchaseDate);
  if (isNaN(parsedDate.getTime())) return null;

  return prisma.lot.findFirst({
    where: { partId, receivedAt: parsedDate, quantity },
    select: { id: true },
  });
}

/** Ensures all segments of a location path exist, creating missing ones. Returns leaf location id. */
async function ensureLocationPath(path: string): Promise<string> {
  const segments = path.split('/').map((s) => s.trim()).filter(Boolean);
  let parentId: string | null = null;
  let leafId = '';

  for (let j = 0; j < segments.length; j++) {
    const segPath = segments.slice(0, j + 1).join('/');
    const segName = segments[j];

    const existing = await prisma.location.findFirst({ where: { path: segPath } });

    if (existing) {
      parentId = existing.id;
      leafId = existing.id;
    } else {
      const created: { id: string } = await prisma.location.create({
        data: { name: segName, parentId, path: segPath, notes: null },
        select: { id: true },
      });
      parentId = created.id;
      leafId = created.id;
    }
  }

  return leafId;
}
