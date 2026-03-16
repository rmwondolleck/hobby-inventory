/**
 * CSV parsing and generation utilities
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawData: string[][];
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [], rawData: [] };
  }

  // Parse CSV with basic quote handling
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawData = lines.map(parseRow);
  const headers = rawData[0];
  const dataRows = rawData.slice(1);

  const rows = dataRows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });

  return { headers, rows, rawData };
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const escapeCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ];

  return lines.join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// CSV Templates
export const TEMPLATES = {
  parts: {
    filename: 'parts_import_template.csv',
    headers: ['name', 'category', 'manufacturer', 'mpn', 'tags', 'notes'],
    example: [
      ['ESP32-WROOM-32', 'Microcontrollers', 'Espressif', 'ESP32-WROOM-32D', 'wifi,bluetooth,iot', 'Dual-core MCU with WiFi'],
      ['Resistor 10K 0805', 'Resistors', 'Yageo', 'RC0805FR-0710KL', '0805,smd', '10K ohm 1% 0805 package'],
    ],
  },
  lots: {
    filename: 'lots_import_template.csv',
    headers: ['partName', 'quantity', 'unit', 'locationPath', 'seller', 'unitCost', 'currency', 'notes'],
    example: [
      ['ESP32-WROOM-32', '50', 'pcs', 'Workshop/Shelf A/Bin 1', 'DigiKey', '2.50', 'USD', 'Bulk order'],
      ['Resistor 10K 0805', '1000', 'pcs', 'Workshop/Shelf B/Bin 3', 'Mouser', '0.05', 'USD', 'Reel'],
    ],
  },
  locations: {
    filename: 'locations_import_template.csv',
    headers: ['name', 'parentPath', 'description'],
    example: [
      ['Workshop', '', 'Main workspace'],
      ['Shelf A', 'Workshop', 'Left side shelving'],
      ['Bin 1', 'Workshop/Shelf A', 'Top left bin'],
    ],
  },
};
