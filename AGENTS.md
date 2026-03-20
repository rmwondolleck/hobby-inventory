# AGENTS.md — Hobby Inventory System

Next.js 16 (App Router) + Prisma (SQLite) inventory tracker for maker/electronic components.

## Key Commands

```bash
npm run dev            # Start dev server (http://localhost:3000)
npm test               # Run Jest suite (Node env by default)
npm run test:coverage  # Jest with coverage
npm run type-check     # tsc --noEmit (no build output)
npm run lint           # ESLint over src/
npm run db:migrate     # prisma migrate dev
npm run db:seed        # Seed from prisma/seed.ts
npm run db:studio      # Prisma Studio GUI
```

## Architecture

### Layer layout
| Layer | Path | Role |
|---|---|---|
| Pages (Server) | `src/app/[domain]/page.tsx` | Metadata + render feature client component |
| Feature UI | `src/features/[domain]/components/` | All client-side logic, forms, tables |
| API Routes | `src/app/api/[domain]/route.ts` | Prisma queries, validation, event writes |
| Shared lib | `src/lib/` | Types, state machines, events, csv, import, utils |
| DB singleton | `src/lib/db/index.ts` | Single `PrismaClient` via `globalForPrisma` |
| API client | `src/lib/api/client.ts` | Typed fetch wrapper used by all feature components |

Pages are thin server components; all interactivity lives in `src/features/`. Example: `src/app/parts/page.tsx` renders `<PartsListClient />` from `src/features/parts/components/`.

## Critical Data Patterns

### JSON-in-SQLite
`tags`, `parameters`, and `source` fields are stored as JSON **strings** in SQLite. Always deserialise with `safeParseJson()` from `@/lib/utils` when reading, and `JSON.stringify()` when writing.

```typescript
// reading
tags: safeParseJson<string[]>(part.tags, [])
// writing
tags: JSON.stringify(body.tags ?? [])
```

### Computed stock fields
`totalQuantity`, `availableQuantity`, `reservedQuantity` etc. are **not stored** — they are computed at read time by `computeStockFields()` in `src/app/api/parts/_stock.ts`. Only `in_stock` lots count toward totals; qualitative lots return `qualitativeStatuses[]` instead.

### Location hierarchy
Locations store a pre-computed `path` string (e.g. `"Office/Shelf A/Drawer 2"`). Filtering lots by location uses a **path-prefix query** to include all children automatically (see `src/app/api/lots/route.ts`).

## State Machines

Three state machines defined in `src/lib/state-transitions.ts` (spec in `docs/state-transitions.md`):

- **StockStatus** (`Lot.status`): `in_stock | low | out | reserved | installed | lost | scrapped` — `scrapped` is terminal.
- **ProjectStatus**: `idea → planned → active → deployed → retired`
- **AllocationStatus**: `reserved | in_use | deployed | recovered`

Always call `isValidStockTransition(from, to)` before mutating `Lot.status`.

## Event Sourcing

Every stock mutation (quantity change, move, allocation) must write an audit record via `createEvent()` from `src/lib/events/`. Events are immutable and append-only (`Event` model has no `updatedAt`).

## Testing Conventions

- Default Jest environment is **Node** (API route tests).
- Component tests must add `/** @jest-environment jsdom */` at the top of the file.
- Tests live in `__tests__/` subdirectories co-located with the source they test.

## Import Pipeline

CSV bulk-import flows through: `parseCSV` → `csvRowsToRecords` (in `src/lib/csv/`) → `planImport` (in `src/lib/import/`) → `POST /api/import/validate` (dry-run plan) → `POST /api/import/execute`. Supported types: `parts`, `lots`, `locations`.

## Planning → GitHub Issues

Use `.github/prompts/plan-to-issues.prompt.md` to transcribe a finished plan document into GitHub Epics / Feature Issues / Sub-Issues via the GitHub MCP. Attach the plan file in Copilot Chat and invoke the prompt — it handles the full creation sequence (epic → features → sub-issues → linking → epic checklist).

The three-tier hierarchy:
- **Epic** → `.github/ISSUE_TEMPLATE/epic.yml` — milestone grouping; label `epic`
- **Feature Issue** → `.github/ISSUE_TEMPLATE/feature-issue.yml` — scoped feature; labels `api|backend|db|frontend`
- **Sub-Issue** → `.github/ISSUE_TEMPLATE/sub-issue.yml` — single task; label `sub-issue`; Steps format mirrors `docs/templates/plan-prompt.md`

Plan files follow the convention `plan-epic<N>-<feature-slug>.prompt.md` at repo root.

## Docs to Read First

- `docs/domain-model.md` — canonical entity definitions and JSON examples
- `docs/state-transitions.md` — all valid status transitions
- `prisma/schema.prisma` — ground truth for DB shape

