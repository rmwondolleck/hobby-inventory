import { DEFAULT_CATEGORY_TEMPLATES } from '../defaults';

const VALID_PARAMETER_TYPES = ['string', 'boolean', 'number'] as const;
const EXPECTED_CATEGORIES = ['Resistors', 'Capacitors', 'Sensors', 'Filament', 'ESP32 Boards'];

describe('DEFAULT_CATEGORY_TEMPLATES', () => {
  it('exports exactly the 5 expected category names', () => {
    const names = Object.keys(DEFAULT_CATEGORY_TEMPLATES).sort();
    expect(names).toEqual([...EXPECTED_CATEGORIES].sort());
  });

  it('has at least one parameter defined for each category', () => {
    for (const [name, schema] of Object.entries(DEFAULT_CATEGORY_TEMPLATES)) {
      expect(Object.keys(schema).length).toBeGreaterThan(0);
    }
  });

  it('every parameter has a valid type', () => {
    for (const [, schema] of Object.entries(DEFAULT_CATEGORY_TEMPLATES)) {
      for (const [key, def] of Object.entries(schema)) {
        expect(VALID_PARAMETER_TYPES).toContain(def.type);
      }
    }
  });

  it('options arrays, when present, are non-empty string arrays', () => {
    for (const [, schema] of Object.entries(DEFAULT_CATEGORY_TEMPLATES)) {
      for (const [, def] of Object.entries(schema)) {
        if (def.options !== undefined) {
          expect(Array.isArray(def.options)).toBe(true);
          expect(def.options.length).toBeGreaterThan(0);
          for (const opt of def.options) {
            expect(typeof opt).toBe('string');
          }
        }
      }
    }
  });

  describe('Resistors', () => {
    const schema = DEFAULT_CATEGORY_TEMPLATES['Resistors'];

    it('defines resistance, tolerance, power, and package fields', () => {
      expect(schema).toHaveProperty('resistance');
      expect(schema).toHaveProperty('tolerance');
      expect(schema).toHaveProperty('power');
      expect(schema).toHaveProperty('package');
    });

    it('tolerance options include common values', () => {
      expect(schema.tolerance.options).toContain('1%');
      expect(schema.tolerance.options).toContain('5%');
    });

    it('package options include standard SMD and THT sizes', () => {
      expect(schema.package.options).toContain('0402');
      expect(schema.package.options).toContain('THT');
    });
  });

  describe('Capacitors', () => {
    const schema = DEFAULT_CATEGORY_TEMPLATES['Capacitors'];

    it('defines capacitance, voltage, type, and package fields', () => {
      expect(schema).toHaveProperty('capacitance');
      expect(schema).toHaveProperty('voltage');
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('package');
    });

    it('type options include Ceramic and Electrolytic', () => {
      expect(schema.type.options).toContain('Ceramic');
      expect(schema.type.options).toContain('Electrolytic');
    });
  });

  describe('Sensors', () => {
    const schema = DEFAULT_CATEGORY_TEMPLATES['Sensors'];

    it('defines interface, voltage, and measurementType fields', () => {
      expect(schema).toHaveProperty('interface');
      expect(schema).toHaveProperty('voltage');
      expect(schema).toHaveProperty('measurementType');
    });

    it('interface options include I2C, SPI, UART, and Analog', () => {
      expect(schema.interface.options).toContain('I2C');
      expect(schema.interface.options).toContain('SPI');
      expect(schema.interface.options).toContain('UART');
      expect(schema.interface.options).toContain('Analog');
    });
  });

  describe('Filament', () => {
    const schema = DEFAULT_CATEGORY_TEMPLATES['Filament'];

    it('defines material, color, diameter, and weight fields', () => {
      expect(schema).toHaveProperty('material');
      expect(schema).toHaveProperty('color');
      expect(schema).toHaveProperty('diameter');
      expect(schema).toHaveProperty('weight');
    });

    it('material options include PLA and PETG', () => {
      expect(schema.material.options).toContain('PLA');
      expect(schema.material.options).toContain('PETG');
    });

    it('diameter options include standard sizes', () => {
      expect(schema.diameter.options).toContain('1.75mm');
      expect(schema.diameter.options).toContain('2.85mm');
    });
  });

  describe('ESP32 Boards', () => {
    const schema = DEFAULT_CATEGORY_TEMPLATES['ESP32 Boards'];

    it('defines mcuFamily, wifi, ble, usbNative, gpioCount, voltage, footprint fields', () => {
      expect(schema).toHaveProperty('mcuFamily');
      expect(schema).toHaveProperty('wifi');
      expect(schema).toHaveProperty('ble');
      expect(schema).toHaveProperty('usbNative');
      expect(schema).toHaveProperty('gpioCount');
      expect(schema).toHaveProperty('voltage');
      expect(schema).toHaveProperty('footprint');
    });

    it('wifi, ble, usbNative are boolean type', () => {
      expect(schema.wifi.type).toBe('boolean');
      expect(schema.ble.type).toBe('boolean');
      expect(schema.usbNative.type).toBe('boolean');
    });

    it('gpioCount is number type', () => {
      expect(schema.gpioCount.type).toBe('number');
    });

    it('mcuFamily options include ESP32 variants', () => {
      expect(schema.mcuFamily.options).toContain('ESP32');
      expect(schema.mcuFamily.options).toContain('ESP32-S3');
    });
  });

  it('templates are serializable to JSON (required for parameterSchema DB column)', () => {
    for (const [name, schema] of Object.entries(DEFAULT_CATEGORY_TEMPLATES)) {
      const serialized = JSON.stringify(schema);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(schema);
    }
  });

  it('category names are unique (no duplicates)', () => {
    const names = Object.keys(DEFAULT_CATEGORY_TEMPLATES);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});
