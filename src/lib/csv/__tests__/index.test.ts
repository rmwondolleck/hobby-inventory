import { parseCSV, csvRowsToRecords, buildCSVTemplate } from '../index';

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

