import { GET } from '../[type]/route';

function makeRequest(type: string): Request {
  return new Request(`http://localhost/api/import/templates/${type}`);
}

function makeParams(type: string): { params: Promise<{ type: string }> } {
  return { params: Promise.resolve({ type }) };
}

describe('GET /api/import/templates/[type]', () => {
  it('returns a CSV template for parts', async () => {
    const res = await GET(makeRequest('parts'), makeParams('parts'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('name');
    expect(text).toContain('mpn');
    expect(text).toContain('category');
    expect(res.headers.get('Content-Type')).toContain('text/csv');
  });

  it('returns a CSV template for lots', async () => {
    const res = await GET(makeRequest('lots'), makeParams('lots'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('partName');
    expect(text).toContain('quantity');
    expect(text).toContain('locationPath');
  });

  it('returns a CSV template for locations', async () => {
    const res = await GET(makeRequest('locations'), makeParams('locations'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('path');
    expect(text).toContain('notes');
  });

  it('sets Content-Disposition attachment header', async () => {
    const res = await GET(makeRequest('parts'), makeParams('parts'));
    const disposition = res.headers.get('Content-Disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('import-template-parts.csv');
  });

  it('returns 404 for unknown template type', async () => {
    const res = await GET(makeRequest('widgets'), makeParams('widgets'));
    expect(res.status).toBe(404);
    const json = await res.json() as { message: string };
    expect(json.message).toContain('widgets');
  });

  it('returns a header-only CSV (single line ending with newline)', async () => {
    const res = await GET(makeRequest('locations'), makeParams('locations'));
    const text = await res.text();
    expect(text.endsWith('\n')).toBe(true);
    // Only header row — no data rows
    expect(text.trim().split('\n')).toHaveLength(1);
  });
});
