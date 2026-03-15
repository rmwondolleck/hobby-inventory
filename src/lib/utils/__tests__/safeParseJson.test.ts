import { safeParseJson } from '../index';

describe('safeParseJson', () => {
  it('parses a valid JSON string into an object', () => {
    const result = safeParseJson<{ a: number }>('{"a":1}', { a: 0 });
    expect(result).toEqual({ a: 1 });
  });

  it('returns the fallback value for invalid JSON', () => {
    const fallback = { a: 0 };
    const result = safeParseJson<{ a: number }>('not-valid-json', fallback);
    expect(result).toBe(fallback);
  });

  it('parses a valid JSON array', () => {
    const result = safeParseJson<string[]>('["a","b","c"]', []);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns fallback array when JSON is malformed', () => {
    const fallback: string[] = [];
    const result = safeParseJson<string[]>('{broken', fallback);
    expect(result).toBe(fallback);
  });

  it('parses nested objects correctly', () => {
    const json = '{"resistance":"10k","tolerance":"1%"}';
    const result = safeParseJson<Record<string, string>>(json, {});
    expect(result).toEqual({ resistance: '10k', tolerance: '1%' });
  });

  it('parses boolean values', () => {
    expect(safeParseJson<boolean>('true', false)).toBe(true);
    expect(safeParseJson<boolean>('false', true)).toBe(false);
  });

  it('returns fallback for empty string', () => {
    const fallback = { x: 1 };
    const result = safeParseJson<{ x: number }>('', fallback);
    expect(result).toBe(fallback);
  });
});
