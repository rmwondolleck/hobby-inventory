# State Transitions

This document defines all valid state transitions for the hobby inventory system. These rules prevent invalid state changes and maintain data integrity.

**Related:** Issue #6 (Define statuses and state transitions)

## Overview

The system uses three separate state machines:

1. **Stock Status** - Tracks the physical state of inventory lots
2. **Project Status** - Tracks project lifecycle stages
3. **Allocation Status** - Tracks how parts are being used in projects

## Stock Status Transitions

Stock status applies to **Lots** and tracks the physical state and availability of inventory.

### States

- `in_stock` - Available for use, at or above expected quantity
- `low` - Below reorder threshold but still available
- `out` - Depleted, needs restock
- `reserved` - Allocated to a project but not yet physically installed
- `installed` - Physically installed/deployed in a project
- `lost` - Cannot be located
- `scrapped` - Damaged or disposed of, no longer usable

### Transition Table

| From State | Valid Transitions | Notes |
|------------|-------------------|-------|
| `in_stock` | `low`, `out`, `reserved`, `installed`, `lost`, `scrapped` | Normal operations; `out` when fully depleted |
| `low` | `in_stock`, `out`, `reserved`, `installed`, `lost`, `scrapped` | Can be restocked or consumed |
| `out` | `in_stock`, `low`, `scrapped` | Typically from restocking |
| `reserved` | `in_stock`, `installed`, `lost`, `scrapped` | Cancel reservation or deploy |
| `installed` | `in_stock`, `lost`, `scrapped` | Project returns parts or they're lost/damaged |
| `lost` | `in_stock`, `scrapped` | Found again or confirmed destroyed |
| `scrapped` | *(terminal state)* | Cannot transition out |

### Invalid Transitions

The following transitions are explicitly **not allowed**:

- `scrapped` → *(any state)* - Scrapped items are permanently removed
- `out` → `reserved` - Cannot reserve what doesn't exist
- `out` → `installed` - Cannot install what doesn't exist
- `installed` → `low` - Use `in_stock` as intermediate state
- `installed` → `out` - Use `in_stock` as intermediate state
- `lost` → `reserved` - Cannot reserve what's lost
- `lost` → `installed` - Cannot install what's lost

### Qualitative Stock Tracking

For bulk/cheap items (e.g., resistors, screws) where exact counts are impractical, use `quantityMode: "qualitative"`:

**Qualitative Levels:**
- `plenty` - Well stocked
- `low` - Running low, consider reordering
- `out` - None available

**Mapping to Stock Status:**
- `plenty` → `in_stock` status
- `low` → `low` status
- `out` → `out` status

Qualitative lots can still use other statuses like `reserved`, `installed`, `lost`, `scrapped` with appropriate transitions.

## Project Status Transitions

Project status tracks the lifecycle of projects that consume inventory.

### States

- `idea` - Concept phase, not started
- `planned` - Scoped and ready to begin
- `active` - Currently being worked on
- `deployed` - Complete and in use
- `retired` - No longer maintained/used

### Transition Table

| From State | Valid Transitions | Notes |
|------------|-------------------|-------|
| `idea` | `planned`, `retired` | Can be promoted or abandoned |
| `planned` | `active`, `retired` | Start work or cancel |
| `active` | `deployed`, `planned`, `retired` | Complete, pause, or abandon |
| `deployed` | `retired`, `active` | End of life or needs rework |
| `retired` | `active` | Revival/restoration |

### Invalid Transitions

- `idea` → `active` - Must plan before starting (use `planned` as intermediate)
- `idea` → `deployed` - Cannot skip development phases
- `planned` → `deployed` - Must be `active` before completion
- `retired` → `idea` - Use `active` or create new project instead
- `retired` → `planned` - Use `active` for revivals

## Allocation Status Transitions

Allocation status tracks how parts are being used within projects.

### States

- `reserved` - Earmarked for project but not yet used
- `in_use` - Being actively consumed/installed
- `deployed` - Permanently installed in completed project
- `recovered` - Returned to general stock

### Transition Table

| From State | Valid Transitions | Notes |
|------------|-------------------|-------|
| `reserved` | `in_use`, `recovered` | Start using or cancel reservation |
| `in_use` | `deployed`, `recovered` | Complete project or return to stock |
| `deployed` | `recovered` | Project decommissioned, parts salvaged |
| `recovered` | *(terminal state)* | Allocation is closed, parts back in stock |

### Invalid Transitions

- `reserved` → `deployed` - Must be `in_use` first
- `deployed` → `in_use` - Cannot revert to active development
- `recovered` → *(any state)* - Terminal state, create new allocation if needed

## Relationship Between Stock and Allocation Status

When a Lot is allocated to a Project:

1. Stock status typically becomes `reserved` or `installed`
2. An Allocation record is created with its own status
3. Both statuses coexist and track different aspects:
   - **Stock Status**: Physical location and availability
   - **Allocation Status**: Workflow within the project

**Example Flow:**
1. Lot status: `in_stock`, Allocation: *(none)*
2. Reserve for project → Lot: `reserved`, Allocation: `reserved`
3. Start installation → Lot: `reserved`, Allocation: `in_use`
4. Project complete → Lot: `installed`, Allocation: `deployed`
5. Project retired → Lot: `in_stock`, Allocation: `recovered`

## Validation Rules

When implementing state transitions in code:

```typescript
// Example validation function structure
function isValidTransition(
  entityType: 'stock' | 'project' | 'allocation',
  fromState: string,
  toState: string
): boolean {
  // Check transition table
  // Return true if valid, false if invalid
}
```

**Implementation Notes:**
- Use simple validation functions, not a full state machine library
- Validate transitions in API endpoints before database writes
- Return clear error messages for invalid transitions
- Log state changes in Event records for audit trail

## State Initialization

**Default States:**
- New Lot: `in_stock` (or `out` if quantity is 0)
- New Project: `idea`
- New Allocation: `reserved`

## Future Considerations

**Out of scope for MVP:**
- Automatic state transitions (e.g., low → out when quantity hits 0)
- Workflow triggers (e.g., send notification when project becomes `active`)
- Time-based state changes
- State machine visualization UI

These may be added in later epics if needed.
