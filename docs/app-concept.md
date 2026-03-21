# Hobby Inventory — Application Concept & UI/UX Specification

**Version:** 1.0  
**Purpose:** Figma Make bootstrap — design reference for a modern, reactive UI/UX  
**Last Updated:** 2026-03-16

---

## 1. Concept Overview

**Hobby Inventory** is a single-user, local-first inventory management application designed for makers, electronics hobbyists, and DIY enthusiasts. It solves the common problem of losing track of purchased components, forgetting where things are stored, and duplicating purchases because a part's location or availability was unknown.

The application tracks the full lifecycle of a physical component from purchase to project use:
- **What do I have?** → Parts catalog with specifications and metadata
- **How many and where?** → Stock lots with quantities and hierarchical storage locations
- **What is it for?** → Projects with material allocations and status tracking
- **What happened to it?** → Immutable event history for audit trails

### Target User

A solo maker or hobbyist who:
- Works from a home workshop, office, or shared makerspace
- Maintains a collection of hundreds to thousands of electronic components, fasteners, and consumables
- Runs multiple concurrent projects (robots, home automation, repairs, etc.)
- Values speed of data entry over exhaustive data richness
- Is comfortable with a technical UI — clear labels, data density, minimal hand-holding

### Design Principles

1. **Speed first** — Intake and lookup should be fast. Favor keyboard-friendly forms, typeahead search, and minimal required fields.
2. **Data density over whitespace** — This is a power-user tool. Tables, compact cards, and inline editing are preferred over wizard-style flows.
3. **Reactive and live** — UI state should update instantly on mutation (optimistic updates). No full page reloads.
4. **Dark mode by default** — Workshops and late-night projects call for a dark, low-glare interface.
5. **Mobile-aware but desktop-first** — The primary use case is at a desk with a keyboard; mobile should be usable for quick lookups.

---

## 2. Information Architecture

### Primary Navigation

The app uses a persistent left-side navigation rail (desktop) or bottom tab bar (mobile) with these top-level sections:

| Icon | Label | Description |
|------|-------|-------------|
| ⚡ | **Intake** | Quick-add new parts and stock |
| 📦 | **Parts** | Browse and manage the parts catalog |
| 🗂 | **Lots** | View and manage stock quantities |
| 📍 | **Locations** | Manage physical storage hierarchy |
| 🔧 | **Projects** | Track build projects and allocations |
| ⬆️ | **Import** | Bulk import from CSV |

A global **search bar** (cmd+K / ctrl+K) provides instant cross-entity lookup across parts, lots, and locations.

### Page Hierarchy

```
/ (Dashboard)
├── /intake                  Quick-add form
├── /parts                   Parts list
│   └── /parts/[id]          Part detail + lot summary
├── /lots                    Lots list with filters
│   └── /lots/[id]           Lot detail + event history
├── /locations               Location tree
│   └── /locations/[id]      Location detail + contents
├── /projects                Projects list
│   └── /projects/[id]       Project detail + allocations
└── /import                  CSV import wizard
```

---

## 3. Core Entities & Their UI Representations

### 3.1 Part (Catalog Entry)

A **Part** is a reusable definition — the abstract component, not the physical stock. Think of it as a row in a supplier catalog.

**Key fields for display:**
- `name` — Primary label (always shown)
- `category` — Chip/badge (e.g., "Microcontrollers", "Resistors")
- `manufacturer` + `mpn` — Secondary label (e.g., "Espressif · ESP32-WROOM-32")
- `tags` — Tag chips (used for filtering)
- `parameters` — Key-value pairs of technical specs (e.g., `voltage: 3.3V`, `package: SOIC-8`)
- `notes` — Freeform markdown-rendered text
- `archivedAt` — If set, show "Archived" badge and dim the row

**Part list view:** Compact data table with search/filter by name, category, tags, and parameters. Supports inline creation from the table.

**Part detail view:** Full-page card with:
- Header: name, category badge, manufacturer/MPN
- Parameters section: rendered as a structured key-value grid
- Tags: editable chip list
- Notes: rendered as formatted text
- Related lots: embedded mini-table of all lots for this part

### 3.2 Lot (Physical Stock)

A **Lot** is a physical batch of a specific Part sitting in a specific Location. A single Part can have many Lots (e.g., bought from different suppliers, stored in different drawers).

**Key fields for display:**
- `part` — Linked part name (always shown)
- `quantity` / `qualitativeStatus` — The stock level; displayed differently based on `quantityMode`:
  - **Exact mode:** Numeric quantity with +/- controls (e.g., `47`)
  - **Qualitative mode:** Status chip (`Plenty` / `Low` / `Out`)
- `status` — Stock status badge (see status colors below)
- `location` — Breadcrumb path (e.g., `Office / Shelf A / Drawer 2`)
- `source` — Where it was purchased (supplier name + optional URL)
- `receivedAt` — Purchase date
- `notes` — Freeform

**Stock status color coding:**

| Status | Color | Meaning |
|--------|-------|---------|
| `in_stock` | Green | Available |
| `low` | Amber | Below threshold |
| `out` | Red | Depleted |
| `reserved` | Blue | Allocated to a project |
| `installed` | Purple | Physically installed in project |
| `lost` | Orange | Cannot be located |
| `scrapped` | Gray | Disposed of |

**Lot list view:** Filterable table with columns for Part, Quantity, Status, Location, and Source. Key filters: status, location, part category.

**Lot detail view:**
- Header: Part name, current status badge
- Quantity card: shows current count or qualitative level with action buttons (Adjust, Move, Allocate, Scrap)
- Location card: current location breadcrumb with Move action
- Source card: supplier info
- Allocations section: list of active allocations for this lot
- Event timeline: chronological history of changes

### 3.3 Location (Storage Hierarchy)

Locations form a tree structure representing the physical storage hierarchy (e.g., Building → Room → Furniture → Shelf → Bin). Depth is unlimited.

**Key fields for display:**
- `name` — Node label (e.g., "Drawer 2", "Bin C")
- `path` — Full breadcrumb path (e.g., `Office / Shelf A / Drawer 2`)
- `parentId` — Tree parent (for hierarchy navigation)
- `notes` — Freeform description

**Location tree view:** Collapsible tree navigator with drag-to-rearrange (future). Each node shows the count of lots stored within it (including nested children).

**Location detail view:**
- Header: name and full path breadcrumb
- Contents: paginated list of lots currently stored here
- Children: list of sub-locations with counts
- Notes

### 3.4 Project

A **Project** is a build, repair, or installation goal that may consume inventory. Projects track what parts have been reserved or used.

**Project lifecycle (status flow):**

```
idea → planned → active → deployed → retired
         ↑__________↑          ↑
         (back-planning)    (reactivation)
```

**Key fields for display:**
- `name` — Project title
- `status` — Lifecycle status badge
- `tags` — Tag chips (e.g., "robotics", "home-automation")
- `notes` — Project description (freeform)
- `wishlistNotes` — Parts still needed (freeform)

**Project status color coding:**

| Status | Color |
|--------|-------|
| `idea` | Slate/Gray |
| `planned` | Blue |
| `active` | Green |
| `deployed` | Purple |
| `retired` | Muted/Dim |

**Project list view:** Card grid or table with status filter tabs (All / Active / Planned / Deployed / Archived). Each card shows name, status badge, allocation count, and tag chips.

**Project detail view:**
- Header: name, status badge with transition actions (e.g., "Mark Active", "Deploy", "Retire")
- Allocations section: table of allocated lots with their quantities and allocation statuses
- Wishlist notes: rendered text block
- Tags and notes

### 3.5 Allocation (Project ↔ Lot Link)

An **Allocation** is the bridge between a Project and a Lot. It tracks how many units of a lot have been reserved for and used in a project.

**Allocation lifecycle:**

```
reserved → in_use → deployed → recovered
     ↘_____________↗
      (direct recovery)
```

**Key fields for display:**
- `lot` → `part.name` — What part
- `project.name` — Which project
- `quantity` — How many units
- `status` — Allocation status badge
- `notes` — Freeform

**Allocation status color coding:**

| Status | Color |
|--------|-------|
| `reserved` | Blue |
| `in_use` | Amber |
| `deployed` | Green |
| `recovered` | Gray |

### 3.6 Event (Audit Trail)

Events are immutable log entries that record every change to a lot's stock. They are read-only in the UI.

**Event types and their display:**

| Type | Description | Display |
|------|-------------|---------|
| `created` | Lot first added | Green "+" badge |
| `adjusted` | Quantity changed | Delta indicator (e.g., `+10`, `-3`) |
| `moved` | Location changed | Arrow from → to |
| `allocated` | Reserved for project | Link icon |
| `returned` | Returned from project | Return icon |
| `scrapped` | Marked as scrapped | Trash icon |
| `status_changed` | Status transition only | Status diff badge |

**Event timeline:** Vertical timeline component, newest first, showing actor (system), timestamp, event type icon, and a human-readable description.

---

## 4. Key User Flows

### 4.1 Quick Intake (Primary Daily Flow)

**Goal:** Add a newly received part to the inventory as fast as possible.

**Entry point:** `/intake` — accessible from nav and a global "+" floating action button.

**Steps:**

1. **Part lookup / create**
   - Typeahead search field searches existing parts by name, MPN, or tags
   - If found: select and continue to step 2
   - If not found: inline creation form expands with fields: Name (required), Category, Manufacturer, MPN, Tags
   - Form should support scanning a barcode/MPN directly into the search field

2. **Location selection**
   - Collapsible tree picker or breadcrumb search
   - Recent locations shown as quick-select chips for speed
   - "New location" inline creation option

3. **Quantity entry**
   - Toggle: Exact count vs. Qualitative (Plenty / Low / Out)
   - For exact: number input with +/- stepper
   - For qualitative: segmented control (Plenty / Low / Out)

4. **Source metadata (optional)**
   - Supplier dropdown: Amazon / AliExpress / eBay / DigiKey / Mouser / LCSC / Local / Other
   - Optional URL field
   - Optional purchase date picker

5. **Submit**
   - "Add to Inventory" primary button
   - Success: brief toast notification, form resets for next entry
   - Quick-repeat: "Add another lot for this part" link on success

**UI pattern:** Single-column stacked form with progressive disclosure (source section collapsed by default). Large touch targets for the quantity controls.

---

### 4.2 Find a Part and Check Stock

**Goal:** Quickly answer "Do I have X and where is it?"

**Steps:**

1. Use global search (cmd+K) or navigate to `/parts`
2. Type part name, MPN, or tag — results update live
3. Select part → Part detail page
4. "Lots" section shows all stock, grouped by location with quantities and status badges
5. Click a lot → Lot detail page for full info and actions

**UI pattern:** Instant search with debounce (150ms). Results show part name + category chip + "N lots in stock" count. Empty state: "No parts found — add one via Intake."

---

### 4.3 Allocate Parts to a Project

**Goal:** Reserve specific lots for an active project.

**Steps:**

1. Navigate to `/projects/[id]` (project must be in `planned` or `active` status)
2. Click "+ Allocate Parts"
3. Search for a part by name/MPN/tags
4. Matching lots are shown with their location, quantity, and status
5. Select a lot, specify quantity to reserve
6. Confirm → Allocation created (`reserved` status), lot status changes to `reserved`
7. Allocation appears in project's allocation table

**UI pattern:** Modal or side-drawer with a two-step flow (search part → select lot + qty). Inline validation prevents over-allocation.

---

### 4.4 Move a Lot to a New Location

**Goal:** Update where a lot is physically stored after reorganizing.

**Steps:**

1. Navigate to lot detail or find lot in the lots table
2. Click "Move" action on the lot
3. Location picker opens (same tree/search picker as intake)
4. Select destination location
5. Confirm → Lot's location is updated, a `moved` event is recorded

**UI pattern:** Compact action modal. "Move" button visible on lot rows in tables (not just detail view).

---

### 4.5 Bulk Import via CSV

**Goal:** Quickly populate the inventory from a spreadsheet.

**Steps:**

1. Navigate to `/import`
2. Select import type: Locations / Parts / Lots (segmented control or tabs)
3. Download CSV template for reference
4. Upload a filled CSV file
5. Validation step: table preview showing parsed rows, with inline error highlighting for invalid rows
6. Review: count of valid rows, list of errors with row numbers
7. Confirm → Execute import, show success/failure summary

**UI pattern:** Multi-step wizard (Select → Upload → Validate → Review → Done). Progress stepper at top. Error rows highlighted in red with tooltip explanation. "Fix errors and re-upload" option keeps the wizard open.

---


## 5. UI Component Inventory

The following reusable components should be designed:

### Navigation & Layout
- **App Shell** — Left nav rail (desktop), bottom tab bar (mobile), header with global search
- **Breadcrumb** — Path display for locations (e.g., `Office / Shelf A / Drawer 2`)
- **Page Header** — Title, subtitle, primary action button(s)

### Data Display
- **Data Table** — Sortable, filterable, paginated table with row actions. Supports inline editing.
- **Status Badge** — Color-coded pill for stock/project/allocation statuses
- **Quantity Display** — Numeric or qualitative (Plenty/Low/Out) with visual indicator
- **Tag Chip** — Small removable/clickable label for tags
- **Event Timeline** — Vertical chronological event log
- **Part Card** — Compact card showing part name, category, MPN, and lot count
- **Lot Card** — Compact card showing part name, quantity, location, and status
- **Project Card** — Card with name, status badge, allocation count, and tags
- **Key-Value Grid** — For displaying part parameters
- **Empty State** — Illustrated placeholder for empty lists with a call-to-action

### Forms & Inputs
- **Typeahead Search** — Instant search with dropdown results and keyboard navigation
- **Location Picker** — Tree-based picker with search, recent selections, and inline create
- **Quantity Input** — Numeric stepper OR qualitative segmented control (toggle between modes)
- **Tag Input** — Chip-style multi-value input with autocomplete from existing tags
- **Parameter Editor** — Dynamic key-value pair form for part parameters
- **CSV Uploader** — Drag-and-drop file upload with validation preview

### Actions & Feedback
- **Action Menu** — "..." overflow menu for table row actions
- **Confirmation Modal** — For destructive or irreversible actions (scrap, archive, delete)
- **Side Drawer / Panel** — Slide-in panel for create/edit forms without leaving the current page
- **Toast Notifications** — Brief success/error/info messages (non-blocking, auto-dismiss)
- **Progress Stepper** — Multi-step wizard indicator for import flow
- **Inline Validation** — Real-time field-level error messages in forms

---

## 6. Status & State Machine Summary

The UI must respect three state machines and only offer valid next-state transitions as actions.

### Stock Status (Lots)

```
in_stock ──► low ──► out
   │          │       │
   ▼          ▼       ▼
reserved   reserved  (restock only)
   │
   ▼
installed ──► in_stock (returned)
```

Terminal state: `scrapped` (no actions available; row is dimmed)

**Available actions per status:**

| Current Status | Available Actions |
|---------------|-------------------|
| `in_stock` | Adjust Qty, Move, Allocate, Scrap |
| `low` | Adjust Qty, Move, Allocate, Scrap |
| `out` | Adjust Qty, Scrap |
| `reserved` | Cancel Reservation, Mark Installed, Scrap |
| `installed` | Mark Returned, Scrap |
| `lost` | Mark Found, Scrap |
| `scrapped` | *(no actions)* |

### Project Status

| Current Status | Available Actions |
|---------------|-------------------|
| `idea` | Mark Planned, Retire |
| `planned` | Mark Active, Retire |
| `active` | Mark Deployed, Back to Planned, Retire |
| `deployed` | Reactivate, Retire |
| `retired` | Reactivate |

### Allocation Status

| Current Status | Available Actions |
|---------------|-------------------|
| `reserved` | Mark In Use, Return to Stock |
| `in_use` | Mark Deployed, Return to Stock |
| `deployed` | Return to Stock |
| `recovered` | *(no actions)* |

---

## 7. Design Direction

### Visual Style

- **Mode:** Dark by default with a light mode toggle
- **Palette:**
  - Background: near-black (`#0F1117` or similar)
  - Surface: dark card (`#1A1D27`)
  - Border: subtle separator (`#2A2D3A`)
  - Primary accent: Electric blue (`#3B82F6`) for interactive elements
  - Success: Green (`#22C55E`)
  - Warning: Amber (`#F59E0B`)
  - Danger: Red (`#EF4444`)
  - Muted: Gray (`#6B7280`) for archived/inactive items
- **Typography:** Clean sans-serif (Inter or similar); monospace for IDs, MPNs, and quantities
- **Icons:** Consistent icon set (Heroicons or Lucide); 20px in tables, 24px in headers

### Interaction Patterns

- **Hover actions:** Row-level action buttons appear on table row hover (not visible by default to reduce visual noise)
- **Keyboard navigation:** Full keyboard support; data tables navigable with arrow keys
- **Inline editing:** Common fields (name, quantity, notes) editable inline with click-to-edit; no separate edit page required for simple changes
- **Optimistic updates:** UI updates immediately on action; rolls back with error toast if the API call fails
- **Loading states:** Skeleton loaders for initial page load; spinner overlays for in-flight mutations

### Responsive Breakpoints

- **Desktop (≥1280px):** Full layout — left nav rail, multi-column content, side drawers
- **Tablet (768px–1279px):** Collapsed nav with icon-only rail; single-column content
- **Mobile (<768px):** Bottom tab navigation; full-screen modals instead of side drawers; simplified tables (hide secondary columns)

---

## 8. API Integration

The backend is fully implemented — **connect Figma Make to the real endpoints, not mocks**. The Next.js dev server (`npm run dev`, default port 3000) serves both the UI and the API from the same origin, so no CORS configuration is needed.

**Base URL:** `http://localhost:3000`  
**Auth:** None required  
**Content-Type:** `application/json` for all request bodies  
**Seed data:** Run `npx prisma db seed` to populate realistic sample data before designing

See **[docs/api-reference.md](./api-reference.md)** for the complete API contract — every endpoint with its exact request/response shapes, query parameters, status codes, and validation rules.

### Endpoint overview

| Resource | Endpoints |
|----------|-----------|
| Parts | `GET/POST /api/parts` · `GET/PATCH/DELETE /api/parts/[id]` · `GET /api/parts/[id]/events` |
| Lots | `GET/POST /api/lots` · `GET/PATCH /api/lots/[id]` · `POST /api/lots/[id]/move` · `GET /api/lots/[id]/events` |
| Locations | `GET/POST /api/locations` · `GET/PATCH/DELETE /api/locations/[id]` |
| Projects | `GET/POST /api/projects` · `GET/PATCH/DELETE /api/projects/[id]` · `GET /api/projects/[id]/events` |
| Allocations | `GET/POST /api/allocations` · `GET/PATCH /api/allocations/[id]` · `POST /api/allocations/[id]/return` · `POST /api/allocations/[id]/scrap` |
| Events | `GET /api/events` |
| Categories | `GET/POST /api/categories` · `GET/PATCH /api/categories/[id]` |
| Import | `POST /api/import/validate` · `POST /api/import/execute` · `GET /api/import/templates/[type]` |
| Inventory | `GET /api/inventory/match` |
| Health | `GET /api/health` |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| **Part** | A catalog entry defining an abstract component (e.g., "ESP32-WROOM-32"). Not tied to a physical item. |
| **Lot** | A physical batch of a Part stored in a Location with a tracked quantity or qualitative level. |
| **Location** | A node in the storage hierarchy (room → shelf → drawer → bin). Unlimited depth. |
| **Project** | A build, repair, or installation goal that consumes inventory. |
| **Allocation** | A reservation linking a Lot to a Project with a tracked quantity and usage status. |
| **Event** | An immutable audit log entry recording a change to a Lot's stock (quantity, location, status). |
| **Category** | A grouping for Parts that defines a shared parameter schema (e.g., "Resistors" with resistance, wattage, tolerance). |
| **MPN** | Manufacturer Part Number — the supplier's unique identifier for a component. |
| **Qualitative mode** | Lot tracking without exact counts — uses Plenty / Low / Out instead of a number. |
| **Exact mode** | Lot tracking with a precise numeric quantity. |
