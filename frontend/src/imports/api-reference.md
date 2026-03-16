# Hobby Inventory — API Reference

**Version:** 1.0  
**Purpose:** Complete API contract for Figma Make front-end integration  
**Last Updated:** 2026-03-16

---

## Connecting Figma Make to the Real API

The backend is a fully implemented Next.js API. **Connect Figma Make directly to the real endpoints** — do not use mocks. Because Next.js serves both the front end and the API from the same origin (`http://localhost:3000`), there are no CORS issues or auth tokens required for local development.

### Quick Start

```bash
# Clone and install
npm install

# Copy environment file
cp .env.example .env.local

# Initialize and seed database
npx prisma migrate dev --name init
npx prisma db seed

# Start the dev server (API + UI on same origin)
npm run dev
```

All API routes are available at `http://localhost:3000/api/...`.

### Base URL

```
http://localhost:3000
```

### Common Headers

All requests that include a body must send:

```
Content-Type: application/json
```

No authentication header is required.

### Common Error Response Format

All error responses return JSON in this shape:

```json
{ "error": "Human-readable error message" }
```

### HTTP Status Code Reference

| Code | Meaning |
|------|---------|
| `200` | OK — successful `GET`, `PATCH`, or archive/soft-delete |
| `201` | Created — successful `POST` |
| `204` | No Content — successful hard `DELETE` (no body) |
| `400` | Bad Request — invalid input, missing required fields, or malformed JSON |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate name, already archived, or blocked by child records |
| `422` | Unprocessable Entity — invalid state transition or insufficient stock |
| `500` | Internal Server Error — database or unexpected server error |

---

## Health

### `GET /api/health`

Returns service status.

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-16T15:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Parts

Parts are catalog entries — abstract component definitions, not physical stock.

### `GET /api/parts`

List parts with optional filtering and pagination.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | `50` | Max results (max 500) |
| `offset` | integer | `0` | Pagination offset |
| `search` | string | — | Full-text search across name, manufacturer, MPN, and notes |
| `category` | string | — | Exact category name filter |
| `archived` | `"true"` \| `"false"` | — | Include/exclude archived parts |
| `parameters.*` | string | — | Filter by parameter value, e.g. `parameters.voltage=3.3V` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "prt_9k2m4n8p",
      "name": "ESP32-WROOM-32",
      "category": "Microcontrollers",
      "manufacturer": "Espressif",
      "mpn": "ESP32-WROOM-32D",
      "tags": ["wifi", "bluetooth", "iot"],
      "notes": "Dual-core, 240MHz, 4MB flash",
      "parameters": { "cores": 2, "voltage": "3.3V", "ble": true },
      "archivedAt": null,
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/parts`

Create a new part.

**Request body:**
```json
{
  "name": "ESP32-WROOM-32",
  "category": "Microcontrollers",
  "manufacturer": "Espressif",
  "mpn": "ESP32-WROOM-32D",
  "tags": ["wifi", "bluetooth"],
  "notes": "Dual-core",
  "parameters": { "voltage": "3.3V", "cores": 2 }
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | ✅ | string | Non-empty |
| `category` | ❌ | string \| null | |
| `manufacturer` | ❌ | string \| null | |
| `mpn` | ❌ | string \| null | Manufacturer Part Number |
| `tags` | ❌ | string[] | Defaults to `[]` |
| `notes` | ❌ | string \| null | |
| `parameters` | ❌ | object | Defaults to `{}` |

**Response `201`:** Full part object (same shape as list item above).

---

### `GET /api/parts/[id]`

Get a single part with all its lots.

**Response `200`:**
```json
{
  "data": {
    "id": "prt_9k2m4n8p",
    "name": "ESP32-WROOM-32",
    "category": "Microcontrollers",
    "manufacturer": "Espressif",
    "mpn": "ESP32-WROOM-32D",
    "tags": ["wifi"],
    "notes": null,
    "parameters": {},
    "archivedAt": null,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "lots": [
      {
        "id": "lot_abc123",
        "quantity": 10,
        "quantityMode": "exact",
        "qualitativeStatus": null,
        "unit": "pcs",
        "status": "in_stock",
        "source": { "seller": "DigiKey", "url": "https://digikey.com/...", "unitCost": 3.50, "currency": "USD" },
        "receivedAt": "2026-02-15T00:00:00.000Z",
        "notes": null,
        "createdAt": "2026-03-01T12:00:00.000Z",
        "updatedAt": "2026-03-01T12:00:00.000Z",
        "location": { "id": "loc_xyz", "name": "Drawer 2", "path": "Office/Shelf A/Drawer 2" },
        "allocations": []
      }
    ]
  }
}
```

**Errors:** `404` if part not found.

---

### `PATCH /api/parts/[id]`

Partially update a part. All fields are optional.

**Request body:** Any subset of `name`, `category`, `manufacturer`, `mpn`, `tags`, `notes`, `parameters`.

**Response `200`:** Full updated part object.  
**Errors:** `400` invalid fields, `404` not found.

---

### `DELETE /api/parts/[id]`

Soft-archive a part (sets `archivedAt`). Does not delete physical lots.

**Response `200`:** Archived part object with `archivedAt` set.  
**Errors:** `404` not found, `409` already archived.

---

### `GET /api/parts/[id]/events`

Get all events across all lots of this part.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "evt_001",
      "lotId": "lot_abc123",
      "type": "received",
      "delta": 10,
      "projectId": null,
      "fromLocationId": null,
      "toLocationId": "loc_xyz",
      "notes": null,
      "createdAt": "2026-03-01T12:00:00.000Z"
    }
  ],
  "total": 5
}
```

Event `type` values: `created` | `received` | `moved` | `allocated` | `installed` | `returned` | `lost` | `scrapped` | `edited`

---

## Locations

Locations form an unlimited-depth tree hierarchy (e.g., Building → Room → Shelf → Drawer → Bin).

### `GET /api/locations`

List locations, optionally as a tree.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `tree` | `"true"` \| `"false"` | `false` | Return hierarchical tree structure |
| `q` | string | — | Search by name, path, or notes |
| `limit` | integer | `50` | Max results (max 500) |
| `offset` | integer | `0` | Pagination offset |

**Response `200` (flat list):**
```json
{
  "data": [
    {
      "id": "loc_xyz",
      "name": "Drawer 2",
      "parentId": "loc_shelf_a",
      "path": "Office/Shelf A/Drawer 2",
      "notes": "Small components only",
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

**Response `200` (tree, `?tree=true`):** Same location fields plus a `children` array nested recursively.

---

### `POST /api/locations`

Create a new location node.

**Request body:**
```json
{
  "name": "Drawer 2",
  "parentId": "loc_shelf_a",
  "notes": "Small components only"
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | ✅ | string | Non-empty |
| `parentId` | ❌ | string \| null | Must exist if provided |
| `notes` | ❌ | string \| null | |

**Response `201`:** Full location object with auto-generated `path`.  
**Errors:** `400` invalid fields, `404` parent not found.

---

### `GET /api/locations/[id]`

Get a location with its children and contents.

**Response `200`:**
```json
{
  "data": {
    "id": "loc_xyz",
    "name": "Drawer 2",
    "parentId": "loc_shelf_a",
    "path": "Office/Shelf A/Drawer 2",
    "notes": null,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "children": [
      { "id": "loc_bin_a", "name": "Bin A", "parentId": "loc_xyz", "path": "Office/Shelf A/Drawer 2/Bin A", "notes": null, "createdAt": "...", "updatedAt": "..." }
    ],
    "lots": [
      {
        "id": "lot_abc123",
        "quantity": 10,
        "quantityMode": "exact",
        "qualitativeStatus": null,
        "unit": "pcs",
        "status": "in_stock",
        "createdAt": "...",
        "updatedAt": "...",
        "part": { "id": "prt_9k2m4n8p", "name": "ESP32-WROOM-32", "category": "Microcontrollers" }
      }
    ]
  }
}
```

---

### `PATCH /api/locations/[id]`

Partially update a location. Moving to a new parent cascades path updates to all descendants.

**Request body:** Any subset of `name`, `parentId`, `notes`.

**Response `200`:** Full updated location object.  
**Errors:** `400` cycle detected or self-reference, `404` not found or parent not found.

---

### `DELETE /api/locations/[id]`

Hard-delete a location node.

**Response `204`:** No body.  
**Errors:** `404` not found, `409` location has children or contains lots.

---

## Lots

Lots are physical batches of a Part stored at a Location. Each lot tracks quantity (exact count or qualitative level) and a stock status.

### Stock status values

| Value | Meaning |
|-------|---------|
| `in_stock` | Available, at expected level |
| `low` | Below threshold but still available |
| `out` | Depleted, needs restock |
| `reserved` | Allocated to a project, not yet installed |
| `installed` | Physically installed in a project |
| `lost` | Cannot be located |
| `scrapped` | Damaged or disposed — terminal state |

### `GET /api/lots`

List lots with filtering and pagination.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | `50` | Max results (max 500) |
| `offset` | integer | `0` | Pagination offset |
| `q` | string | — | Search in part name, MPN, notes, source, location name |
| `status` | string | — | Comma-separated status values, e.g. `in_stock,low` |
| `locationId` | string | — | Filter by location and all its children |
| `projectId` | string | — | Filter by allocations to a project |
| `partId` | string | — | Filter by part |
| `source.seller` | string | — | Filter by source seller name |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "lot_abc123",
      "partId": "prt_9k2m4n8p",
      "quantity": 10,
      "quantityMode": "exact",
      "qualitativeStatus": null,
      "unit": "pcs",
      "status": "in_stock",
      "locationId": "loc_xyz",
      "source": { "seller": "DigiKey", "url": "https://digikey.com/...", "unitCost": 3.50, "currency": "USD" },
      "receivedAt": "2026-02-15T00:00:00.000Z",
      "notes": null,
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z",
      "part": { "id": "prt_9k2m4n8p", "name": "ESP32-WROOM-32", "category": "Microcontrollers", "mpn": "ESP32-WROOM-32D" },
      "location": { "id": "loc_xyz", "name": "Drawer 2", "path": "Office/Shelf A/Drawer 2" }
    }
  ],
  "total": 28,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/lots`

Create a new lot. Automatically records a `received` event.

**Request body:**
```json
{
  "partId": "prt_9k2m4n8p",
  "quantityMode": "exact",
  "quantity": 10,
  "unit": "pcs",
  "status": "in_stock",
  "locationId": "loc_xyz",
  "source": { "seller": "DigiKey", "url": "https://digikey.com/...", "unitCost": 3.50, "currency": "USD" },
  "receivedAt": "2026-02-15T00:00:00.000Z",
  "notes": null
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `partId` | ✅ | string | Must exist |
| `quantityMode` | ❌ | `"exact"` \| `"qualitative"` | Defaults to `"exact"` |
| `quantity` | ✅ for exact | integer ≥ 0 | Required when `quantityMode` is `"exact"` |
| `qualitativeStatus` | ✅ for qualitative | `"plenty"` \| `"low"` \| `"out"` | Required when `quantityMode` is `"qualitative"` |
| `unit` | ❌ | string \| null | e.g. `"pcs"`, `"m"`, `"g"` |
| `status` | ❌ | stock status | Defaults to `"in_stock"` |
| `locationId` | ❌ | string \| null | Must exist if provided |
| `source` | ❌ | object \| null | See source object shape below |
| `receivedAt` | ❌ | ISO-8601 string \| null | |
| `notes` | ❌ | string \| null | |

**Source object shape:**
```json
{
  "seller": "DigiKey",
  "url": "https://digikey.com/...",
  "unitCost": 3.50,
  "currency": "USD"
}
```
All source fields are optional. Common `seller` values: `"Amazon"`, `"AliExpress"`, `"eBay"`, `"DigiKey"`, `"Mouser"`, `"LCSC"`, `"Local"`, `"Other"`.

**Response `201`:** Full lot object.  
**Errors:** `400` invalid fields, `404` part or location not found, `422` invalid qualitative status.

---

### `GET /api/lots/[id]`

Get a single lot with its part, location, allocations, and events.

**Response `200`:**
```json
{
  "data": {
    "id": "lot_abc123",
    "partId": "prt_9k2m4n8p",
    "quantity": 10,
    "quantityMode": "exact",
    "qualitativeStatus": null,
    "unit": "pcs",
    "status": "in_stock",
    "locationId": "loc_xyz",
    "source": {},
    "receivedAt": null,
    "notes": null,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z",
    "part": { "id": "prt_9k2m4n8p", "name": "ESP32-WROOM-32", "category": "Microcontrollers" },
    "location": { "id": "loc_xyz", "name": "Drawer 2", "path": "Office/Shelf A/Drawer 2" },
    "allocations": [ /* allocation objects */ ],
    "events": [ /* event objects */ ]
  }
}
```

---

### `PATCH /api/lots/[id]`

Update a lot's metadata or status. Status changes are validated against the state machine.

**Request body:** Any subset of:

| Field | Type | Notes |
|-------|------|-------|
| `quantity` | integer | Only valid when `quantityMode` is `"exact"` |
| `quantityMode` | `"exact"` \| `"qualitative"` | |
| `qualitativeStatus` | `"plenty"` \| `"low"` \| `"out"` \| null | |
| `unit` | string \| null | |
| `status` | stock status | Validated against current status; returns `422` for invalid transition |
| `locationId` | string \| null | Must exist if non-null |
| `receivedAt` | ISO-8601 string \| null | |
| `source` | object | |
| `notes` | string \| null | |

**Response `200`:** Full updated lot object.  
**Errors:** `400` invalid fields, `404` lot or location not found, `422` invalid status transition.

---

### `POST /api/lots/[id]/move`

Relocate a lot to a different storage location. Records a `moved` event.

**Request body:**
```json
{
  "locationId": "loc_new_drawer",
  "notes": "Reorganised shelf"
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `locationId` | ✅ | string \| null | Target location (null to clear) |
| `notes` | ❌ | string \| null | |

**Response `200`:** Full updated lot object.  
**Errors:** `400` missing `locationId`, `404` lot or location not found.

---

### `GET /api/lots/[id]/events`

Get all events for a lot, newest first.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "evt_001",
      "lotId": "lot_abc123",
      "type": "moved",
      "delta": null,
      "projectId": null,
      "fromLocationId": "loc_old",
      "toLocationId": "loc_xyz",
      "notes": null,
      "createdAt": "2026-03-10T09:00:00.000Z"
    }
  ],
  "total": 3
}
```

---

## Projects

Projects are build/repair/installation goals that consume inventory.

### Project status values

| Value | Meaning |
|-------|---------|
| `idea` | Early concept, not yet planned |
| `planned` | Planned but not started |
| `active` | Currently in progress |
| `deployed` | Completed and deployed |
| `retired` | Abandoned or archived |

### `GET /api/projects`

List projects with filtering and pagination.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | `50` | Max results (max 500) |
| `offset` | integer | `0` | Pagination offset |
| `search` | string | — | Search in name, notes, and tags |
| `status` | string | — | Exact status filter |
| `tags` | string | — | Comma-separated; all listed tags must be present (AND logic) |
| `includeArchived` | `"true"` \| `"false"` | `false` | Include retired/archived projects |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "prj_001",
      "name": "Home Automation Hub",
      "status": "active",
      "tags": ["home-automation", "esp32"],
      "notes": "Central MQTT broker for the house",
      "wishlistNotes": "Still need 3x relay modules",
      "archivedAt": null,
      "createdAt": "2026-02-01T12:00:00.000Z",
      "updatedAt": "2026-03-10T12:00:00.000Z",
      "allocationCount": 4,
      "allocationsByStatus": { "reserved": 2, "in_use": 1, "deployed": 1, "recovered": 0 }
    }
  ],
  "total": 7,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/projects`

Create a new project.

**Request body:**
```json
{
  "name": "Home Automation Hub",
  "status": "idea",
  "tags": ["home-automation"],
  "notes": "Central MQTT broker",
  "wishlistNotes": "Need relay modules"
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | ✅ | string | Non-empty |
| `status` | ❌ | project status | Defaults to `"idea"` |
| `tags` | ❌ | string[] | Defaults to `[]` |
| `notes` | ❌ | string \| null | |
| `wishlistNotes` | ❌ | string \| null | Parts still needed |

**Response `201`:** Full project object.

---

### `GET /api/projects/[id]`

Get a project with all its allocations grouped by status.

**Response `200`:**
```json
{
  "data": {
    "id": "prj_001",
    "name": "Home Automation Hub",
    "status": "active",
    "tags": ["home-automation"],
    "notes": null,
    "wishlistNotes": null,
    "archivedAt": null,
    "createdAt": "...",
    "updatedAt": "...",
    "allocationsByStatus": {
      "reserved": [
        {
          "id": "alc_001",
          "projectId": "prj_001",
          "lotId": "lot_abc123",
          "quantity": 2,
          "status": "reserved",
          "notes": null,
          "createdAt": "...",
          "updatedAt": "...",
          "lot": {
            "id": "lot_abc123",
            "quantity": 10,
            "quantityMode": "exact",
            "qualitativeStatus": null,
            "unit": "pcs",
            "status": "reserved",
            "part": { "id": "prt_9k2m4n8p", "name": "ESP32-WROOM-32", "category": "Microcontrollers" },
            "location": { "id": "loc_xyz", "name": "Drawer 2", "path": "Office/Shelf A/Drawer 2" }
          }
        }
      ],
      "in_use": [],
      "deployed": [],
      "recovered": []
    }
  }
}
```

---

### `PATCH /api/projects/[id]`

Partially update a project. Status changes are validated against the state machine.

**Request body:** Any subset of `name`, `status`, `tags`, `notes`, `wishlistNotes`.

**Response `200`:** Full updated project object.  
**Errors:** `400` invalid fields, `404` not found, `422` invalid status transition.

---

### `DELETE /api/projects/[id]`

Soft-archive a project (sets `archivedAt`, status → `"retired"`).

**Response `200`:** Archived project object.  
**Errors:** `404` not found, `409` already archived.

---

### `GET /api/projects/[id]/events`

Get all events linked to this project, newest first.

**Response `200`:**
```json
{
  "data": [ /* event objects */ ],
  "total": 3
}
```

---

## Allocations

Allocations link a Lot to a Project and track how those parts are being used.

### Allocation status values

| Value | Meaning |
|-------|---------|
| `reserved` | Held for the project, not yet used |
| `in_use` | Currently being used in the build |
| `deployed` | Permanently installed |
| `recovered` | Returned to stock — terminal state |

### `GET /api/allocations`

List allocations with filtering.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | `50` | Max results (max 500) |
| `offset` | integer | `0` | Pagination offset |
| `lotId` | string | — | Filter by lot |
| `projectId` | string | — | Filter by project |
| `status` | string | — | Comma-separated status values |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "alc_001",
      "projectId": "prj_001",
      "lotId": "lot_abc123",
      "quantity": 2,
      "status": "reserved",
      "notes": null,
      "createdAt": "...",
      "updatedAt": "...",
      "lot": {
        "id": "lot_abc123",
        "quantity": 10,
        "quantityMode": "exact",
        "qualitativeStatus": null,
        "unit": "pcs",
        "status": "reserved",
        "part": { "id": "prt_9k2m4n8p", "name": "ESP32-WROOM-32", "category": "Microcontrollers" },
        "location": { "id": "loc_xyz", "name": "Drawer 2", "path": "Office/Shelf A/Drawer 2" }
      },
      "project": { "id": "prj_001", "name": "Home Automation Hub", "status": "active" }
    }
  ],
  "total": 4,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/allocations`

Reserve a lot for a project. Records an `allocated` event.

**Request body:**
```json
{
  "lotId": "lot_abc123",
  "projectId": "prj_001",
  "quantity": 2,
  "notes": "For the main board"
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `lotId` | ✅ | string | Must exist |
| `projectId` | ✅ | string | Must exist |
| `quantity` | ✅ for exact lots | positive integer | Must not exceed available stock |
| `notes` | ❌ | string \| null | |

**Response `201`:** Full allocation object.  
**Errors:** `400` missing fields or invalid quantity, `404` lot or project not found, `422` insufficient available stock.

> **Available quantity** = `lot.quantity` − sum of `quantity` across allocations with status `reserved`, `in_use`, or `deployed`.

---

### `GET /api/allocations/[id]`

Get a single allocation.

**Response `200`:** Full allocation object (same shape as list item).  
**Errors:** `404` not found.

---

### `PATCH /api/allocations/[id]`

Update allocation status or notes. Status transitions are validated.

**Request body:** Any subset of:

| Field | Type | Notes |
|-------|------|-------|
| `status` | allocation status | Validated against current status; `422` for invalid transition |
| `notes` | string \| null | |

**Valid transitions:**
- `reserved` → `in_use`, `recovered`
- `in_use` → `deployed`, `recovered`
- `deployed` → `recovered`
- `recovered` → *(terminal, no transitions)*

**Response `200`:** Full updated allocation object.  
**Errors:** `400` invalid status, `404` not found, `422` invalid transition.

---

### `POST /api/allocations/[id]/return`

Return an allocation to stock. Changes status to `recovered` and records a `returned` event. No request body needed.

**Response `200`:** Full allocation object with `status: "recovered"`.  
**Errors:** `404` not found, `422` allocation already `recovered` or `scrapped`.

---

### `POST /api/allocations/[id]/scrap`

Scrap an allocation. Changes status to `recovered`, permanently reduces lot quantity by the allocated amount, and records a `scrapped` event. No request body needed.

**Response `200`:** Full allocation object.  
**Errors:** `404` not found, `422` allocation already `recovered`.

---

## Categories

Categories group parts and define their shared parameter schemas.

### `GET /api/categories`

List categories, optionally including built-in default templates.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | `50` | Max results (max 500) |
| `offset` | integer | `0` | Pagination offset |
| `includeDefaults` | `"true"` \| `"false"` | `true` | Include built-in default category templates |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "cat_001",
      "name": "Microcontrollers",
      "parameterSchema": {
        "cores": { "type": "number", "label": "CPU Cores" },
        "voltage": { "type": "string", "label": "Operating Voltage" }
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "defaults": [
    {
      "id": null,
      "name": "Resistors",
      "parameterSchema": {
        "resistance": { "type": "string", "label": "Resistance" },
        "wattage": { "type": "string", "label": "Power Rating" },
        "tolerance": { "type": "string", "label": "Tolerance" }
      },
      "createdAt": null,
      "updatedAt": null,
      "isDefault": true
    }
  ],
  "total": 3,
  "limit": 50,
  "offset": 0
}
```

---

### `POST /api/categories`

Create a new category.

**Request body:**
```json
{
  "name": "Microcontrollers",
  "parameterSchema": {
    "cores": { "type": "number", "label": "CPU Cores" }
  }
}
```

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | ✅ | string | Must be unique |
| `parameterSchema` | ❌ | object | If omitted and name matches a default, uses that schema |

**Response `201`:** Full category object.  
**Errors:** `400` invalid fields, `409` name already exists.

---

### `GET /api/categories/[id]`

Get a single category.

**Response `200`:** Full category object.  
**Errors:** `404` not found.

---

### `PATCH /api/categories/[id]`

Partially update a category.

**Request body:** Any subset of `name`, `parameterSchema`.

**Response `200`:** Full updated category object.  
**Errors:** `400` no valid fields, `404` not found, `409` name conflict.

---

## Events

Events are immutable audit log entries. They are auto-created by the API; you cannot create or modify them directly.

### `GET /api/events`

List all events with advanced filtering.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | `50` | Max results (max 200) |
| `offset` | integer | `0` | Pagination offset |
| `lotId` | string | — | Filter by lot |
| `partId` | string | — | Filter by part (across all its lots) |
| `projectId` | string | — | Filter by project |
| `type` | string | — | Event type filter |
| `since` | ISO-8601 | — | Events created at or after this time |
| `until` | ISO-8601 | — | Events created at or before this time |

Valid `type` values: `created` | `received` | `moved` | `allocated` | `installed` | `returned` | `lost` | `scrapped` | `edited`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "evt_001",
      "lotId": "lot_abc123",
      "type": "received",
      "delta": 10,
      "projectId": null,
      "fromLocationId": null,
      "toLocationId": "loc_xyz",
      "notes": null,
      "createdAt": "2026-03-01T12:00:00.000Z"
    }
  ],
  "total": 50,
  "limit": 50,
  "offset": 0
}
```

**Errors:** `400` invalid `limit`/`offset` or `type`, `404` referenced part or lot not found.

---

## Inventory Match

### `GET /api/inventory/match`

Find parts and available lots matching category and parameter criteria. Used to power the part-search step of the allocation flow.

**Query parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `category` | string | **Required** | Category name to search within |
| `availability` | `"any"` \| `"available"` \| `"in_stock_only"` | `"available"` | Stock availability filter |
| `projectId` | string | — | Exclude lots already allocated to this project |
| `parameters.*` | string | — | Parameter value filters, e.g. `parameters.voltage=3.3V` |

**Availability modes:**
- `any` — All statuses except `lost` and `scrapped`
- `available` — Excludes `out`, `lost`, `scrapped`
- `in_stock_only` — Only `in_stock` and `low`

**Response `200`:**
```json
{
  "matches": [
    {
      "part": {
        "id": "prt_9k2m4n8p",
        "name": "ESP32-WROOM-32",
        "category": "Microcontrollers",
        "manufacturer": "Espressif",
        "mpn": "ESP32-WROOM-32D",
        "parameters": { "cores": 2, "voltage": "3.3V" },
        "tags": ["wifi", "bluetooth"]
      },
      "lots": [
        {
          "id": "lot_abc123",
          "available": 8,
          "total": 10,
          "quantityMode": "exact",
          "qualitativeStatus": null,
          "unit": "pcs",
          "status": "in_stock",
          "location": "Office/Shelf A/Drawer 2",
          "allocations": [
            { "projectId": "prj_001", "quantity": 2, "status": "reserved" }
          ]
        }
      ],
      "totalAvailable": 8
    }
  ],
  "total": 1,
  "message": "1 part found"
}
```

**Errors:** `400` missing or empty `category` or invalid `availability`, `500` database error.

---

## Import

### `POST /api/import/validate`

Validate a CSV file without persisting any data. Returns per-row validation results.

**Request body:**
```json
{
  "type": "parts",
  "csv": "name,category,manufacturer\nESP32,Microcontrollers,Espressif"
}
```

| Field | Required | Type | Values |
|-------|----------|------|--------|
| `type` | ✅ | string | `"parts"` \| `"lots"` \| `"locations"` |
| `csv` | ✅ | string | CSV content as text |

**Response `200`:**
```json
{
  "data": {
    "type": "parts",
    "rows": [
      {
        "rowNumber": 2,
        "status": "ok",
        "errors": [],
        "warnings": [],
        "parsed": { "name": "ESP32", "category": "Microcontrollers", "manufacturer": "Espressif" }
      }
    ],
    "errorCount": 0,
    "warningCount": 0,
    "summary": "2 rows: 2 valid, 0 errors, 0 warnings"
  }
}
```

Row `status` values: `"ok"` | `"error"` | `"warning"`

**Errors:** `400` invalid JSON, missing fields, or unparseable CSV.

---

### `POST /api/import/execute`

Execute a CSV import. Validates first — returns `422` if any rows have errors.

**Request body:** Same as `POST /api/import/validate`.

**Response `201`:**
```json
{
  "data": {
    "type": "parts",
    "created": 2,
    "updated": 0,
    "skipped": 1,
    "failed": 0,
    "errors": []
  }
}
```

**Errors:** `400` invalid request, `422` validation errors present (re-validate and fix before re-submitting).

---

### `GET /api/import/templates/[type]`

Download a blank CSV template with correct column headers.

**Path parameter `type`:** `"parts"` | `"lots"` | `"locations"`

**Response `200`:** CSV file download.

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="import-template-parts.csv"
```

**Column headers by type:**

| Type | Columns |
|------|---------|
| `parts` | `name`, `category`, `manufacturer`, `mpn`, `tags`, `notes` |
| `lots` | `partName`, `partMpn`, `quantity`, `unit`, `locationPath`, `seller`, `sourceUrl`, `unitCost`, `currency`, `purchaseDate`, `notes` |
| `locations` | `path`, `notes` |

**Errors:** `404` invalid type.

---

## Recommended Figma Make Integration Strategy

Because the backend already exists and every endpoint is fully implemented and tested, **connect Figma Make directly to the real API**. There is no benefit to building mocks that would later need to be replaced.

### Setup for Figma Make

1. Run the dev server (`npm run dev`) — it starts on `http://localhost:3000`
2. Point all Figma Make API calls to `http://localhost:3000/api/...`
3. Seed the database (`npx prisma db seed`) so there is realistic data to display in the UI
4. No authentication is required — all endpoints are open

### Suggested development order

Build and connect screens in this order to unlock data progressively:

1. **Locations** (`GET /api/locations?tree=true`) — needed by nearly every other screen
2. **Parts list** (`GET /api/parts`) — the catalog foundation
3. **Lots list** (`GET /api/lots`) — the main inventory view
4. **Intake form** (`POST /api/parts`, `POST /api/lots`) — the primary data entry path
5. **Part detail** (`GET /api/parts/[id]`) — links to lots
6. **Lot detail** (`GET /api/lots/[id]`) — links to events and allocations
7. **Projects list/detail** (`GET /api/projects`, `GET /api/projects/[id]`)
8. **Allocation flow** (`POST /api/allocations`, `PATCH /api/allocations/[id]`)
9. **Import wizard** (`POST /api/import/validate`, `POST /api/import/execute`)
10. **Labels page** (no API — renders from existing lot/location data)
