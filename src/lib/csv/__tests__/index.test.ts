import { parseCSV, csvRowsToRecords, buildCSVTemplate, recordsToCSV } from '../index';

describe('parseCSV', () => {
  it('parses a simple header + data row', () => {
    const csv = 'name,category,mpn\nESP32,Microcontrollers,ESP32-WROOM';
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(['name', 'category', 'mpn']);
    expect(result[1]).toEqual(['ESP32', 'Microcontrollers', 'ESP32-WROOM']);
  });

  it('handles quoted fields containing commas', () => {
    const csv = 'name,notes\n"Part, with comma","Some note"';
    const result = parseCSV(csv);
    expect(result[1][0]).toBe('Part, with comma');
    expect(result[1][1]).toBe('Some note');
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const csv = 'name\n"Say ""hello"""';
    const result = parseCSV(csv);
    expect(result[1][0]).toBe('Say "hello"');
  });

  it('handles CRLF line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual(['1', '2']);
    expect(result[2]).toEqual(['3', '4']);
  });

  it('skips blank lines', () => {
    const csv = 'a,b\n\n1,2\n\n3,4';
    const result = parseCSV(csv);
    expect(result).toHaveLength(3); // header + 2 data rows
  });

  it('returns an empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV('\n\n')).toEqual([]);
  });

  it('trims whitespace from unquoted fields', () => {
    const csv = 'a , b , c \n 1 , 2 , 3 ';
    const result = parseCSV(csv);
    expect(result[0]).toEqual(['a', 'b', 'c']);
    expect(result[1]).toEqual(['1', '2', '3']);
  });
});

describe('csvRowsToRecords', () => {
  it('maps header columns to row values', () => {
    const rows = [
      ['name', 'category'],
      ['ESP32', 'MCU'],
    ];
    const records = csvRowsToRecords(rows);
    expect(records).toEqual([{ name: 'ESP32', category: 'MCU' }]);
  });

  it('returns null for empty input', () => {
    expect(csvRowsToRecords([])).toBeNull();
  });

  it('returns an empty array when there is only a header', () => {
    const rows = [['name', 'category']];
    expect(csvRowsToRecords(rows)).toEqual([]);
  });

  it('fills missing columns with empty string', () => {
    const rows = [['a', 'b', 'c'], ['x', 'y']];
    const records = csvRowsToRecords(rows);
    expect(records![0]).toEqual({ a: 'x', b: 'y', c: '' });
  });
});

describe('buildCSVTemplate', () => {
  it('produces a header-only CSV string', () => {
    const cols = ['name', 'category', 'mpn'];
    expect(buildCSVTemplate(cols)).toBe('name,category,mpn\n');
  });
});

describe('recordsToCSV', () => {
  it('serializes records with a header row', () => {
    const headers = ['name', 'category'];
    const records = [{ name: 'ESP32', category: 'Microcontrollers' }];
    const csv = recordsToCSV(headers, records);
    expect(csv).toBe('name,category\nESP32,Microcontrollers\n');
  });

  it('wraps fields containing commas in double-quotes', () => {
    const headers = ['name', 'notes'];
    const records = [{ name: 'Part, A', notes: 'ok' }];
    const csv = recordsToCSV(headers, records);
    expect(csv).toBe('name,notes\n"Part, A",ok\n');
  });

  it('escapes embedded double-quotes by doubling them', () => {
    const headers = ['notes'];
    const records = [{ notes: 'Say "hello"' }];
    const csv = recordsToCSV(headers, records);
    expect(csv).toBe('notes\n"Say ""hello"""\n');
  });

  it('wraps fields containing newlines in double-quotes', () => {
    const headers = ['notes'];
    const records = [{ notes: 'line1\nline2' }];
    const csv = recordsToCSV(headers, records);
    expect(csv).toBe('notes\n"line1\nline2"\n');
  });

  it('fills missing fields with empty string', () => {
    const headers = ['a', 'b', 'c'];
    const records = [{ a: 'x' }] as Record<string, string>[];
    const csv = recordsToCSV(headers, records);
    expect(csv).toBe('a,b,c\nx,,\n');
  });

  it('returns only a header row for empty records array', () => {
    const headers = ['name', 'mpn'];
    const csv = recordsToCSV(headers, []);
    expect(csv).toBe('name,mpn\n');
  });

  it('produces round-trip compatible output (parseCSV can re-read it)', () => {
    const headers = ['name', 'tags', 'notes'];
    const records = [
      { name: 'R1', tags: 'smd;0402', notes: 'Has "special" chars, and comma' },
    ];
    const csv = recordsToCSV(headers, records);
    const rows = parseCSV(csv);
    expect(rows[0]).toEqual(headers);
    expect(rows[1][0]).toBe('R1');
    expect(rows[1][1]).toBe('smd;0402');
    expect(rows[1][2]).toBe('Has "special" chars, and comma');
  });
});

