import { detectSourceType, slugify, buildLocationPath } from '../index';

// ─── detectSourceType ─────────────────────────────────────────────────────────

describe('detectSourceType', () => {
  it('detects amazon.com', () => {
    expect(detectSourceType('https://www.amazon.com/dp/B00TEST123')).toBe('amazon');
  });

  it('detects amazon regional domains', () => {
    expect(detectSourceType('https://www.amazon.co.uk/dp/B00TEST')).toBe('amazon');
    expect(detectSourceType('https://www.amazon.de/dp/B00TEST')).toBe('amazon');
  });

  it('detects aliexpress.com', () => {
    expect(detectSourceType('https://www.aliexpress.com/item/12345.html')).toBe('aliexpress');
  });

  it('detects digikey.com', () => {
    expect(detectSourceType('https://www.digikey.com/product-detail/en/resistor')).toBe('digikey');
  });

  it('detects mouser.com', () => {
    expect(detectSourceType('https://www.mouser.com/ProductDetail/resistor')).toBe('mouser');
  });

  it('detects adafruit.com', () => {
    expect(detectSourceType('https://www.adafruit.com/product/1234')).toBe('adafruit');
  });

  it('detects sparkfun.com', () => {
    expect(detectSourceType('https://www.sparkfun.com/products/12345')).toBe('sparkfun');
  });

  it('detects ebay.com', () => {
    expect(detectSourceType('https://www.ebay.com/itm/123456')).toBe('ebay');
  });

  it('returns "manual" for unknown domains', () => {
    expect(detectSourceType('https://example.com/product')).toBe('manual');
  });

  it('returns "manual" for invalid/empty URLs', () => {
    expect(detectSourceType('not-a-url')).toBe('manual');
    expect(detectSourceType('')).toBe('manual');
  });

  it('returns "manual" for URLs with no matching seller', () => {
    expect(detectSourceType('https://lcsc.com/product/abc')).toBe('manual');
  });
});

// ─── slugify ─────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and trims input', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('10kΩ Resistor!')).toBe('10k-resistor');
  });

  it('collapses multiple spaces/hyphens into a single hyphen', () => {
    expect(slugify('a   b--c')).toBe('a-b-c');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

// ─── buildLocationPath ───────────────────────────────────────────────────────

describe('buildLocationPath', () => {
  it('returns just the name when no parent path is given', () => {
    expect(buildLocationPath('Shelf A')).toBe('Shelf A');
  });

  it('prepends the parent path with a slash separator', () => {
    expect(buildLocationPath('Shelf A', 'Office')).toBe('Office/Shelf A');
  });

  it('supports deeply nested paths', () => {
    expect(buildLocationPath('Bin 3', 'Office/Cabinet/Drawer')).toBe(
      'Office/Cabinet/Drawer/Bin 3'
    );
  });

  it('treats empty parentPath as no parent', () => {
    expect(buildLocationPath('Top Level', '')).toBe('Top Level');
  });
});
