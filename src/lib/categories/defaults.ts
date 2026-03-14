import type { ParameterDefinition } from '@/lib/types';

/** Built-in parameter templates for common part categories */
export const DEFAULT_CATEGORY_TEMPLATES: Record<string, Record<string, ParameterDefinition>> = {
  'ESP32 Boards': {
    mcuFamily: { type: 'string', options: ['ESP32', 'ESP32-S2', 'ESP32-S3', 'ESP32-C3'] },
    wifi: { type: 'boolean' },
    ble: { type: 'boolean' },
    usbNative: { type: 'boolean' },
    gpioCount: { type: 'number' },
    voltage: { type: 'string', options: ['3.3V', '5V tolerant'] },
    footprint: { type: 'string' },
  },
  'Sensors': {
    interface: { type: 'string', options: ['I2C', 'SPI', 'UART', 'Analog'] },
    voltage: { type: 'string' },
    measurementType: { type: 'string' },
  },
  'Filament': {
    material: { type: 'string', options: ['PLA', 'PETG', 'ABS', 'TPU'] },
    color: { type: 'string' },
    diameter: { type: 'string', options: ['1.75mm', '2.85mm'] },
    weight: { type: 'string' },
  },
  'Resistors': {
    resistance: { type: 'string' },
    tolerance: { type: 'string', options: ['1%', '5%', '10%'] },
    power: { type: 'string', options: ['0.125W', '0.25W', '0.5W', '1W'] },
    package: { type: 'string', options: ['0402', '0603', '0805', '1206', 'THT'] },
  },
  'Capacitors': {
    capacitance: { type: 'string' },
    voltage: { type: 'string' },
    type: { type: 'string', options: ['Ceramic', 'Electrolytic', 'Tantalum', 'Film'] },
    package: { type: 'string', options: ['0402', '0603', '0805', '1206', 'THT'] },
  },
};
