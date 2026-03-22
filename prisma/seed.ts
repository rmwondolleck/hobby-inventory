/**
 * Prisma Seed Script
 * 
 * Run with: npx prisma db seed
 * 
 * This script populates the database with initial demo data.
 * See Issue #8 for full seed data requirements.
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORY_TEMPLATES } from '../src/lib/categories/defaults';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ============================================================================
  // Default Category Templates (from DEFAULT_CATEGORY_TEMPLATES)
  // ============================================================================
  console.log('Seeding default category templates...');

  for (const [name, schema] of Object.entries(DEFAULT_CATEGORY_TEMPLATES)) {
    const parameterSchema = JSON.stringify(schema);
    await prisma.category.upsert({
      where: { name },
      update: { parameterSchema },
      create: { name, parameterSchema },
    });
  }

  // ============================================================================
  // Categories
  // ============================================================================
  console.log('Creating categories...');
  
  const categories = [
    {
      name: 'Microcontrollers',
      parameterSchema: JSON.stringify({
        mcuFamily: { type: 'string', options: ['ESP32', 'ESP32-S2', 'ESP32-S3', 'ESP32-C3', 'ATmega', 'RP2040', 'STM32'] },
        wifi: { type: 'boolean' },
        ble: { type: 'boolean' },
        usbNative: { type: 'boolean' },
        gpioCount: { type: 'number' },
        voltage: { type: 'string', options: ['3.3V', '5V', '5V tolerant'] },
        flashMB: { type: 'number' },
      }),
    },
    {
      name: 'Sensors',
      parameterSchema: JSON.stringify({
        interface: { type: 'string', options: ['I2C', 'SPI', 'UART', 'Analog', 'Digital'] },
        voltage: { type: 'string' },
        measurementType: { type: 'string', options: ['Temperature', 'Humidity', 'Pressure', 'Light', 'Motion', 'Distance', 'Gas'] },
      }),
    },
    {
      name: 'Displays',
      parameterSchema: JSON.stringify({
        interface: { type: 'string', options: ['I2C', 'SPI', 'Parallel'] },
        resolution: { type: 'string' },
        size: { type: 'string' },
        type: { type: 'string', options: ['OLED', 'LCD', 'TFT', 'E-Paper'] },
        touch: { type: 'boolean' },
      }),
    },
    {
      name: 'Filament',
      parameterSchema: JSON.stringify({
        material: { type: 'string', options: ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'Nylon'] },
        color: { type: 'string' },
        diameter: { type: 'string', options: ['1.75mm', '2.85mm'] },
        weightG: { type: 'number' },
      }),
    },
    {
      name: 'Passive Components',
      parameterSchema: JSON.stringify({
        type: { type: 'string', options: ['Resistor', 'Capacitor', 'Inductor', 'Diode', 'LED'] },
        value: { type: 'string' },
        package: { type: 'string', options: ['0402', '0603', '0805', '1206', 'Through-hole'] },
        tolerance: { type: 'string' },
      }),
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }

  // ============================================================================
  // Locations
  // ============================================================================
  console.log('Creating locations...');

  const office = await prisma.location.upsert({
    where: { id: 'loc_office' },
    update: {},
    create: {
      id: 'loc_office',
      name: 'Office',
      path: 'Office',
    },
  });

  const shelfA = await prisma.location.upsert({
    where: { id: 'loc_shelf_a' },
    update: {},
    create: {
      id: 'loc_shelf_a',
      name: 'Shelf A',
      parentId: office.id,
      path: 'Office/Shelf A',
    },
  });

  const drawer1 = await prisma.location.upsert({
    where: { id: 'loc_drawer_1' },
    update: {},
    create: {
      id: 'loc_drawer_1',
      name: 'Drawer 1',
      parentId: shelfA.id,
      path: 'Office/Shelf A/Drawer 1',
      notes: 'Microcontrollers and dev boards',
    },
  });

  const drawer2 = await prisma.location.upsert({
    where: { id: 'loc_drawer_2' },
    update: {},
    create: {
      id: 'loc_drawer_2',
      name: 'Drawer 2',
      parentId: shelfA.id,
      path: 'Office/Shelf A/Drawer 2',
      notes: 'Sensors and displays',
    },
  });

  const filamentRack = await prisma.location.upsert({
    where: { id: 'loc_filament' },
    update: {},
    create: {
      id: 'loc_filament',
      name: 'Filament Rack',
      parentId: office.id,
      path: 'Office/Filament Rack',
    },
  });

  // ============================================================================
  // Parts
  // ============================================================================
  console.log('Creating parts...');

  const esp32 = await prisma.part.upsert({
    where: { id: 'part_esp32_wroom' },
    update: {},
    create: {
      id: 'part_esp32_wroom',
      name: 'ESP32-WROOM-32',
      category: 'Microcontrollers',
      manufacturer: 'Espressif',
      mpn: 'ESP32-WROOM-32',
      tags: JSON.stringify(['wifi', 'bluetooth', 'iot']),
      parameters: JSON.stringify({
        mcuFamily: 'ESP32',
        wifi: true,
        ble: true,
        usbNative: false,
        gpioCount: 34,
        voltage: '3.3V',
        flashMB: 4,
      }),
    },
  });

  const bme280 = await prisma.part.upsert({
    where: { id: 'part_bme280' },
    update: {},
    create: {
      id: 'part_bme280',
      name: 'BME280 Sensor Module',
      category: 'Sensors',
      manufacturer: 'Bosch',
      mpn: 'BME280',
      tags: JSON.stringify(['i2c', 'environment', 'weather']),
      parameters: JSON.stringify({
        interface: 'I2C',
        voltage: '3.3V',
        measurementType: 'Temperature',
      }),
      notes: 'Temperature, humidity, and pressure sensor',
    },
  });

  const oled = await prisma.part.upsert({
    where: { id: 'part_oled_128x64' },
    update: {},
    create: {
      id: 'part_oled_128x64',
      name: 'SSD1306 OLED Display',
      category: 'Displays',
      manufacturer: 'Generic',
      mpn: 'SSD1306-128x64',
      tags: JSON.stringify(['oled', 'i2c', 'display']),
      parameters: JSON.stringify({
        interface: 'I2C',
        resolution: '128x64',
        size: '0.96"',
        type: 'OLED',
        touch: false,
      }),
    },
  });

  const filamentPLA = await prisma.part.upsert({
    where: { id: 'part_pla_black' },
    update: {},
    create: {
      id: 'part_pla_black',
      name: 'PLA Filament - Black',
      category: 'Filament',
      manufacturer: 'Hatchbox',
      tags: JSON.stringify(['pla', '3dprinting']),
      parameters: JSON.stringify({
        material: 'PLA',
        color: 'Black',
        diameter: '1.75mm',
        weightG: 1000,
      }),
    },
  });

  // ============================================================================
  // Lots
  // ============================================================================
  console.log('Creating lots...');

  await prisma.lot.upsert({
    where: { id: 'lot_esp32_1' },
    update: {},
    create: {
      id: 'lot_esp32_1',
      partId: esp32.id,
      quantity: 5,
      quantityMode: 'exact',
      unit: 'pcs',
      status: 'in_stock',
      locationId: drawer1.id,
      source: JSON.stringify({
        type: 'amazon',
        seller: 'HiLetgo',
        url: 'https://amazon.com/dp/B0718T232Z',
        unitCost: 8.99,
        currency: 'USD',
        purchaseDate: '2024-01-15',
      }),
      receivedAt: new Date('2024-01-20'),
    },
  });

  await prisma.lot.upsert({
    where: { id: 'lot_bme280_1' },
    update: {},
    create: {
      id: 'lot_bme280_1',
      partId: bme280.id,
      quantity: 3,
      quantityMode: 'exact',
      unit: 'pcs',
      status: 'in_stock',
      locationId: drawer2.id,
      source: JSON.stringify({
        type: 'aliexpress',
        seller: 'Great Wall Electronics',
        unitCost: 2.50,
        currency: 'USD',
      }),
      receivedAt: new Date('2024-02-10'),
    },
  });

  await prisma.lot.upsert({
    where: { id: 'lot_oled_1' },
    update: {},
    create: {
      id: 'lot_oled_1',
      partId: oled.id,
      quantity: 10,
      quantityMode: 'exact',
      unit: 'pcs',
      status: 'in_stock',
      locationId: drawer2.id,
      source: JSON.stringify({
        type: 'aliexpress',
        unitCost: 3.00,
        currency: 'USD',
      }),
    },
  });

  await prisma.lot.upsert({
    where: { id: 'lot_pla_1' },
    update: {},
    create: {
      id: 'lot_pla_1',
      partId: filamentPLA.id,
      quantityMode: 'qualitative',
      qualitativeStatus: 'plenty',
      unit: 'spool',
      status: 'in_stock',
      locationId: filamentRack.id,
      source: JSON.stringify({
        type: 'amazon',
        seller: 'HATCHBOX',
        unitCost: 21.99,
        currency: 'USD',
      }),
    },
  });

  // ============================================================================
  // Projects
  // ============================================================================
  console.log('Creating projects...');

  await prisma.project.upsert({
    where: { id: 'proj_weather_station' },
    update: {},
    create: {
      id: 'proj_weather_station',
      name: 'Home Weather Station',
      status: 'active',
      tags: JSON.stringify(['iot', 'home-automation']),
      notes: 'ESP32-based weather station with OLED display',
      wishlistNotes: 'Need outdoor enclosure',
    },
  });

  await prisma.project.upsert({
    where: { id: 'proj_led_wall' },
    update: {},
    create: {
      id: 'proj_led_wall',
      name: 'LED Matrix Wall',
      status: 'idea',
      tags: JSON.stringify(['leds', 'art']),
      notes: 'Large LED matrix for office wall art',
    },
  });

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

