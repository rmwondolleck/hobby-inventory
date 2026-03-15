/**
 * Simple RFC 4180-compatible CSV parser.
 * Handles quoted fields (with embedded commas and escaped double-quotes).
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (const line of normalised.split('\n')) {
    if (line.trim() === '') continue;
    rows.push(parseRow(line));
  }

  return rows;
}

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // Escaped double-quote inside quoted field
          field += '"';
          i++;
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
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
  }

  fields.push(field.trim());
  return fields;
}

/**
 * Converts raw CSV rows into an array of records keyed by header name.
 * Row 0 is treated as the header row.
 */
export function csvToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = row[j] ?? '';
    }
    records.push(record);
  }

  return records;
}
