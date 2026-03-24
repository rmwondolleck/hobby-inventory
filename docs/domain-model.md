# Hobby Inventory - Domain Model

**Version:** 1.0  
**Status:** Locked for MVP  
**Last Updated:** 2026-03-24

## Overview

This document defines the core domain model for the Hobby Inventory system. All entities, relationships, and field definitions herein are the single source of truth for database schema, API contracts, and UI implementation.

## Entity Relationship Diagram

```
┌─────────────┐
│    Part     │
│             │
└──────┬──────┘
       │ 1:N
       │
       ▼
┌─────────────┐         ┌──────────────┐
│    Lot      │─────────│   Location   │
│             │  N:1    │              │
└──────┬──────┘         └──────┬───────┘
       │                       │
       │ 1:N                   │ 1:N
       │                       │ (parent-child)
       ▼                       │
┌─────────────┐                │
│   Event     │                │
│  (history)  │                │
└─────────────┘                ▼
                        ┌──────────────┐
┌─────────────┐         │   Location   │
│  Project    │         │   (parent)   │
│             │         └──────────────┘
└──────┬──────┘
       │ 1:N
       │
       ▼
┌─────────────┐
│ Allocation  │─────────┐
│             │   N:1   │
└─────────────┘         │
       ▲                │
       │                │
       └────────────────┘
              Lot
```

## Core Entities

### 1. Part

**Definition**: A reusable catalog entry representing a component type (e.g., "ESP32-WROOM-32", "M3 Bolt 20mm").

**Purpose**: Serves as the master catalog for all purchasable/usable components.

**Required Fields:**
- `id` (string/uuid): Unique identifier
- `name` (string): Human-readable name
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last modification timestamp

**Optional Fields:**
- `category` (string): Grouping/classification (e.g., "Microcontrollers", "Fasteners")
- `categoryId` (String?): Foreign key to Category (parameter template)
- `manufacturer` (string): Brand/maker
- `mpn` (string): Manufacturer Part Number
- `tags` (string[]): Flexible labels for filtering
- `notes` (string): Freeform text for specs, usage notes
- `parameters` (json): Technical specs as key-value pairs
- `archivedAt` (datetime): Soft-delete timestamp

**Relationships:**
- `Part → Lot` (1:N): A part can have multiple purchased lots
- `Part → Category` (N:1): A part optionally belongs to one category template

**JSON Example:**
```json
{
  "id": "prt_9k2m4n8p",
  "name": "ESP32-WROOM-32 Development Board",
  "category": "Microcontrollers",
  "manufacturer": "Espressif",
  "mpn": "ESP32-WROOM-32",
  "tags": ["wifi", "bluetooth", "iot"],
  "notes": "3.3V logic, 38-pin DIP package",
  "parameters": {
    "voltage": "3.3V",
    "flash": "4MB",
    "ram": "520KB",
    "wifi": "802.11 b/g/n"
  },
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z",
  "archivedAt": null
}
```

---

### 2. Lot

**Definition**: A specific purchased batch of a part with quantity, source, and cost tracking.

**Purpose**: Tracks physical inventory instances. One part can have multiple lots from different purchases.

**Required Fields:**
- `id` (string/uuid): Unique identifier
- `partId` (string): Foreign key to Part
- `quantity` (number): Current available quantity
- `quantityMode` (enum: "exact" | "qualitative"): Precision level
- `status` (string): Current state (e.g., "in_stock", "low", "out", "reserved", "installed", "lost", "scrapped")
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last modification timestamp

**Optional Fields:**
- `unit` (string): Measurement unit (e.g., "pcs", "meters", "grams")
- `locationId` (string): Current storage location
- `source` (json): Purchase details
  - `type` (string): "purchase" | "donation" | "salvage"
  - `seller` (string): Vendor name
  - `url` (string): Product page
  - `orderRef` (string): Order number
  - `unitCost` (number): Price per unit
  - `currency` (string): ISO code (e.g., "USD")
  - `purchaseDate` (date): When acquired
- `receivedAt` (datetime): When physically received
- `notes` (string): Storage conditions, batch notes

**Relationships:**
- `Lot → Part` (N:1): Each lot belongs to one part
- `Lot → Location` (N:1): Current storage location
- `Lot → Allocation` (1:N): Can be allocated to multiple projects
- `Lot → Event` (1:N): History of changes

**JSON Example:**
```json
{
  "id": "lot_x7y3q2k9",
  "partId": "prt_9k2m4n8p",
  "quantity": 8,
  "quantityMode": "exact",
  "unit": "pcs",
  "status": "in_stock",
  "locationId": "loc_shelf_a_bin_3",
  "source": {
    "type": "purchase",
    "seller": "AliExpress",
    "url": "https://aliexpress.com/item/123456",
    "orderRef": "AE-2026-0142",
    "unitCost": 3.50,
    "currency": "USD",
    "purchaseDate": "2026-01-10"
  },
  "receivedAt": "2026-01-14T14:20:00Z",
  "notes": "Keep in anti-static bag",
  "createdAt": "2026-01-15T09:00:00Z",
  "updatedAt": "2026-02-10T16:45:00Z"
}
```

---

### 3. Location

**Definition**: Physical storage hierarchy (e.g., Office → Shelf A → Drawer 2 → Bin C).

**Purpose**: Enables nested organizational structure for finding parts.

**Required Fields:**
- `id` (string/uuid): Unique identifier
- `name` (string): Location label
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last modification timestamp

**Optional Fields:**
- `parentId` (string): Foreign key to parent location (null for root)
- `path` (string): Computed breadcrumb path (e.g., "/office/shelf-a/drawer-2")
- `notes` (string): Description, access instructions

**Relationships:**
- `Location → Location` (1:N): Parent-child hierarchy
- `Location → Lot` (1:N): Lots stored at this location

**JSON Example (Parent):**
```json
{
  "id": "loc_office",
  "name": "Office",
  "parentId": null,
  "path": "/office",
  "notes": "Main workspace",
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-01-10T08:00:00Z"
}
```

**JSON Example (Child):**
```json
{
  "id": "loc_shelf_a_bin_3",
  "name": "Bin 3",
  "parentId": "loc_shelf_a_drawer_2",
  "path": "/office/shelf-a/drawer-2/bin-3",
  "notes": "Small plastic container, red lid",
  "createdAt": "2026-01-10T08:15:00Z",
  "updatedAt": "2026-01-10T08:15:00Z"
}
```

---

### 4. Project

**Definition**: A build, repair, or installation where parts are allocated or consumed.

**Purpose**: Groups allocations to track what parts are "spoken for" or installed.

**Required Fields:**
- `id` (string/uuid): Unique identifier
- `name` (string): Project title
- `status` (string): Current state (e.g., "planning", "active", "completed", "archived")
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last modification timestamp

**Optional Fields:**
- `notes` (string): Description, goals, progress notes
- `tags` (string[]): Categories or labels
- `archivedAt` (datetime): Soft-delete timestamp

**Relationships:**
- `Project → Allocation` (1:N): Parts reserved/used for this project

**JSON Example:**
```json
{
  "id": "prj_smart_door_lock",
  "name": "Smart Door Lock v2",
  "status": "active",
  "notes": "Upgrading to ESP32 for better WiFi range. Target completion: March 2026.",
  "tags": ["iot", "home-automation", "security"],
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-03-05T14:30:00Z",
  "archivedAt": null
}
```

---

### 5. Allocation

**Definition**: Links a lot to a project with quantity and state tracking.

**Purpose**: Reserves or tracks parts committed to a project without physically moving them yet.

**Required Fields:**
- `id` (string/uuid): Unique identifier
- `lotId` (string): Foreign key to Lot
- `projectId` (string): Foreign key to Project
- `quantity` (number): Amount allocated
- `status` (string): State (e.g., "reserved", "in_use", "deployed", "recovered")
- `createdAt` (datetime): Creation timestamp
- `updatedAt` (datetime): Last modification timestamp

**Optional Fields:**
- `notes` (string): Installation location, condition notes

**Relationships:**
- `Allocation → Lot` (N:1): Each allocation draws from one lot
- `Allocation → Project` (N:1): Each allocation belongs to one project

**JSON Example:**
```json
{
  "id": "alloc_k8m2p3x7",
  "lotId": "lot_x7y3q2k9",
  "projectId": "prj_smart_door_lock",
  "quantity": 2,
  "status": "deployed",
  "notes": "Used for main controller and backup unit",
  "createdAt": "2026-02-05T11:00:00Z",
  "updatedAt": "2026-02-20T16:00:00Z"
}
```

---

### 6. Event

**Definition**: Immutable record of stock mutations (purchases, moves, allocations, consumption).

**Purpose**: Audit trail for inventory changes. Never updated, only inserted.

**Required Fields:**
- `id` (string/uuid): Unique identifier
- `lotId` (string): Foreign key to Lot
- `type` (string): Event type (e.g., "purchase", "move", "allocate", "consume", "return")
- `delta` (number): Quantity change (+ for additions, - for reductions)
- `createdAt` (datetime): When event occurred

**Optional Fields:**
- `fromLocationId` (string): Previous location (for moves)
- `toLocationId` (string): New location (for moves)
- `projectId` (string): Related project (for allocations/returns)
- `notes` (string): Context or reason
- `userId` (string): Who performed action (for future multi-user support)

**Relationships:**
- `Event → Lot` (N:1): Each event affects one lot
- `Event → Location` (N:1 optional): For location changes
- `Event → Project` (N:1 optional): For project-related events

**JSON Example (Purchase):**
```json
{
  "id": "evt_n3k8m2x9",
  "lotId": "lot_x7y3q2k9",
  "type": "purchase",
  "delta": 10,
  "fromLocationId": null,
  "toLocationId": "loc_shelf_a_bin_3",
  "projectId": null,
  "notes": "Initial purchase from AliExpress",
  "createdAt": "2026-01-15T09:00:00Z",
  "userId": null
}
```

**JSON Example (Allocation):**
```json
{
  "id": "evt_p7q4x3k2",
  "lotId": "lot_x7y3q2k9",
  "type": "allocate",
  "delta": -2,
  "fromLocationId": null,
  "toLocationId": null,
  "projectId": "prj_smart_door_lock",
  "notes": "Allocated for Smart Door Lock project",
  "createdAt": "2026-02-05T11:00:00Z",
  "userId": null
}
```

---

## Relationship Summary

| Relationship | Type | Description |
|-------------|------|-------------|
| Part → Lot | 1:N | One part can have multiple purchased lots |
| Part → Category | N:1 | A part optionally belongs to one category (parameter template) |
| Lot → Part | N:1 | Each lot belongs to exactly one part |
| Lot → Location | N:1 | Each lot is stored at one current location |
| Location → Lot | 1:N | A location can contain multiple lots |
| Location → Location | 1:N | Parent-child hierarchy for nested storage |
| Project → Allocation | 1:N | A project can have multiple allocations |
| Allocation → Project | N:1 | Each allocation belongs to one project |
| Allocation → Lot | N:1 | Each allocation draws from one lot |
| Lot → Allocation | 1:N | A lot can be allocated to multiple projects |
| Lot → Event | 1:N | A lot's history is tracked via events |
| Event → Lot | N:1 | Each event affects one lot |

---

## Field Conventions

### Identifiers
- Format: `{entity_prefix}_{random_alphanumeric}`
- Examples: `prt_`, `lot_`, `loc_`, `prj_`, `alloc_`, `evt_`
- UUIDs are also acceptable

### Timestamps
- ISO 8601 format with timezone: `YYYY-MM-DDTHH:mm:ssZ`
- Required: `createdAt`, `updatedAt`
- Optional: `archivedAt`, `receivedAt`

### Enums
- `quantityMode`: "exact", "qualitative"
- `status` (Lot): "in_stock", "low", "out", "reserved", "installed", "lost", "scrapped"
- `status` (Project): "planning", "active", "completed", "archived"
- `status` (Allocation): "reserved", "in_use", "deployed", "recovered"
- `type` (Event): "purchase", "move", "allocate", "consume", "return"
- `type` (Source): "purchase", "donation", "salvage"

### JSON Fields
- `parameters` (Part): Flexible key-value pairs for specs
- `source` (Lot): Structured purchase information
- Use strings for keys, support strings, numbers, booleans for values

### Arrays
- `tags`: Array of strings for flexible categorization
- Empty array `[]` is valid, null is not

---

## Design Decisions

### Why separate Part and Lot?
- **Part** is the catalog/template (what you can buy)
- **Lot** is the physical inventory (what you actually have)
- This allows tracking different purchase batches with different costs, sources, and locations

### Why immutable Events?
- Creates an audit trail that can't be tampered with
- Enables replaying history to debug quantity discrepancies
- Future-proofs for undo/rollback features

### Why hierarchical Locations?
- Real storage is hierarchical (room → furniture → drawer → container)
- Enables breadcrumb navigation in UI
- Path field speeds up queries and display

### Why separate Allocation from Event?
- Allocations are mutable (can return parts, change quantity)
- Events are immutable (history)
- Allocations track current project state, Events track history

### Why is Category a parameter template, not a schema enforcer?

> For a single-user hobby system, schema enforcement adds friction without meaningful benefit. The real value is UX: pre-populating the parameter editor with the keys common to a category. `Part.parameters` remains free-form — users can add, remove, or rename any key at any time.

---

## Out of Scope (MVP)

The following are **intentionally excluded** from the MVP:
- User/tenant models (single-user system)
- Supplier APIs or automated ordering
- Distributor sync (Mouser, Digi-Key)
- OCR for datasheet parsing
- Multi-currency conversions (store as entered)
- Inventory value calculations (future reporting feature)
- Barcode/QR generation
- Image attachments

---

## Migration Path

This domain model will be implemented as:
1. Prisma schema (`prisma/schema.prisma`) - See issue #6
2. API routes (`src/app/api/{entity}/route.ts`)
3. TypeScript types (`src/lib/types.ts`)
4. UI components (`src/features/{entity}/`)

---

## Validation Rules

### Part
- `name` required, min 1 char, max 255 chars
- `mpn` max 100 chars
- `category` max 100 chars

### Lot
- `quantity` must be non-negative
- `quantityMode` must be "exact" or "qualitative"
- `status` required
- `unitCost` if present, must be non-negative

### Location
- `name` required, min 1 char, max 100 chars
- `parentId` cannot reference self
- Circular parent references not allowed

### Project
- `name` required, min 1 char, max 255 chars
- `status` required

### Allocation
- `quantity` must be positive
- `quantity` cannot exceed available lot quantity
- `status` required

### Event
- `delta` cannot be zero
- `type` required
- Immutable - no updates or deletes allowed

---

## Questions & Decisions Log

**Q: Should Parts have a SKU field?**  
A: No. `mpn` (manufacturer part number) serves this purpose. User can add custom SKU in `parameters` if needed.

**Q: How to handle consumed/installed parts?**  
A: Allocation status tracks this. `deployed` = permanently installed in a completed project. Event type "consume" also records it.

**Q: Can a Lot belong to multiple Locations?**  
A: No. A lot is atomic - stored in one place. To split across locations, create separate lots.

**Q: What if I want to track individual serial numbers?**  
A: Create one Lot per serialized item with quantity=1. Add serial to `notes` or `parameters`.

---

**End of Document**
