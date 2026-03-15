/**
 * Minimal RFC-4180-compliant CSV parser.
 * Returns rows as arrays of strings (header row included).
 */
export function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  // Normalise line endings
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped double-quote
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
      } else if (ch === '\n') {
        current.push(field.trim());
        field = '';
        if (current.length > 0 && current.some((f) => f !== '')) {
          rows.push(current);
        }
        current = [];
        i++;
        continue;
      } else {
        field += ch;
      }
    }
    i++;
  }

  // Handle the last field / row
  current.push(field.trim());
  if (current.some((f) => f !== '')) {
    rows.push(current);
  }

  return rows;
}

/**
 * Convert an array of rows (header + data) into an array of record objects.
 * Returns null if there is no header row.
 */
export function csvRowsToRecords(
  rows: string[][]
): Record<string, string>[] | null {
  if (rows.length === 0) return null;
  const [header, ...dataRows] = rows;
  return dataRows.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((col, idx) => {
      record[col] = row[idx] ?? '';
    });
    return record;
  });
}

/** Build a CSV string from an array of column names (header only, for templates). */
export function buildCSVTemplate(columns: string[]): string {
  return columns.join(',') + '\n';
}

