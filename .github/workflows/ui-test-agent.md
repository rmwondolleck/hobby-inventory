---
description: Writes and runs Playwright E2E UI tests against the Next.js app, reports results
on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: "Pull request number to test (0 = run against main)"
        required: false
        type: number
        default: 0
      scope:
        description: "Test scope: all, navigation, parts, lots, projects, locations, intake, import"
        required: false
        type: string
        default: "all"
timeout-minutes: 45
permissions:
  contents: read
  pull-requests: read
  issues: read
  actions: read
tools:
  edit:
  bash: true
  playwright:
  github:
    toolsets: [default]
safe-outputs:
  create-pull-request:
    max: 1
  add-comment:
    target: "*"
    max: 5
  noop:
network:
  allowed:
    - defaults
    - node
    - playwright
    - "binaries.prisma.sh"
    - "checkpoint.prisma.io"
steps:
  - name: Install Playwright browsers
    run: npx playwright install --with-deps chromium
---

# UI Test Agent

You are a specialized Playwright E2E testing agent for a **Next.js 16 hobby inventory app** that uses SQLite (Prisma), shadcn/ui components, and Tailwind CSS.

Your job is to write Playwright UI tests, run them headless, and report results.

## Project Context

This is a hobby inventory management app. Key details:

- **Framework**: Next.js 16 (App Router) with React 19, TypeScript, Tailwind CSS v4
- **UI library**: shadcn/ui (Radix primitives + CVA) — components in `src/components/ui/`
- **Database**: SQLite via Prisma — schema at `prisma/schema.prisma`, seed at `prisma/seed.ts`
- **Layout**: `AppShell` sidebar with navigation links (Dashboard, Intake, Parts, Lots, Locations, Projects, Import, Labels)
- **API**: RESTful routes at `/api/*` (parts, lots, projects, locations, allocations, categories, events, import)

### Page Structure

| Route | Type | Key Elements |
|---|---|---|
| `/` | Dashboard | Quick-link cards to each section |
| `/parts` | Client list | Search input, `FilterSidebar`, `PartCard` grid |
| `/parts/[id]` | Detail | Part name, category, tags, parameters, lots table |
| `/lots` | Server list | `LotCard` grid, `LotFilterForm` (status/part/location/seller) |
| `/lots/[id]` | Detail | Lot info, `LotActionsPanel` (Move, Adjust, Allocate, Scrap) |
| `/projects` | Client list | `ProjectCard` grid with status badges and tag chips |
| `/projects/[id]` | Detail | Project info, allocated lots table |
| `/locations` | Client list | Location tree with children, Print Labels button |
| `/locations/[id]` | Detail | Location info, lots stored here |
| `/intake` | Form | Mode toggle (new part / existing part), part fields, quantity, location picker |
| `/import` | Form | File upload, entity type selector, dry-run warning |
| `/print/labels` | Print view | QR code labels for parts/lots/locations |

### Seeded Test Data

The database is seeded (via `prisma/seed.ts`) with realistic demo data including:
- Categories (Microcontrollers, Resistors, Capacitors, Connectors, etc.)
- Locations (Office, Shelf A, Drawer 1, etc.)
- Parts (ESP32-S3 DevKit, various components)
- Lots with quantities and statuses
- Projects with allocations

## Your Task

**Scope**: `${{ github.event.inputs.scope }}`
**PR**: `${{ github.event.inputs.pr_number }}`

### Step 1: Check Out the Right Branch

If a PR number is provided (non-zero), check out the PR branch:

```bash
# If PR number is provided, fetch and checkout the PR branch
PR_NUM=${{ github.event.inputs.pr_number }}
if [ "$PR_NUM" != "0" ] && [ -n "$PR_NUM" ]; then
  gh pr checkout "$PR_NUM"
fi
```

### Step 2: Set Up the Environment

Reset the database to a clean seeded state and install dependencies:

```bash
npm install
npx prisma migrate reset --force
```

### Step 3: Initialize Playwright (if not already configured)

Check if `playwright.config.ts` exists. If not, create it:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,          // SQLite can't handle parallel writes
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

Create the `e2e/` directory if it doesn't exist.

### Step 4: Write E2E Tests

Based on the **scope** input, write tests for the requested areas. If scope is `all`, write tests for every area below. Each test file goes in the `e2e/` directory.

Follow these guidelines:

#### General Testing Patterns

- **Use `data-slot` and `aria-*` attributes** from shadcn/ui components as selectors when available
- **Use `getByRole`, `getByText`, `getByLabel`** — prefer accessible selectors over CSS classes
- **Wait for network-idle** or specific content before asserting — the app fetches data client-side
- **Each test should be independent** — don't rely on state from previous tests
- **Use descriptive test names** that explain the user flow being tested

#### `e2e/navigation.spec.ts` — AppShell Sidebar Navigation

Test that the sidebar renders all 8 navigation links and each one navigates to the correct page:

1. Load `/` — verify the sidebar is visible with "Hobby Inventory" branding
2. For each nav item (Dashboard, Intake, Parts, Lots, Locations, Projects, Import, Labels):
   - Click the link in the sidebar
   - Assert the URL changes to the correct path
   - Assert the page heading or key content renders
3. Verify the active link is visually highlighted (has the active CSS class)
4. Verify the global search input is present in the sidebar

#### `e2e/parts.spec.ts` — Parts List & Detail

1. Navigate to `/parts` — assert the "Parts" heading renders
2. Wait for parts to load — verify at least one `PartCard` renders with seed data
3. Verify the search input is present and functional:
   - Type a search term (e.g., "ESP32") — assert the list filters
   - Clear the search — assert all parts reappear
4. Click a part card — assert navigation to `/parts/[id]`
5. On the detail page, verify: part name, category badge, tags, and parameters section render

#### `e2e/lots.spec.ts` — Lots List & Filtering

1. Navigate to `/lots` — assert "Lots" heading renders
2. Wait for lots to load — verify `LotCard` components render with quantity and status badges
3. Test the `LotFilterForm`:
   - Filter by status — assert the lot list updates
   - Clear filters — assert all lots reappear
4. Click a lot card — assert navigation to `/lots/[id]`
5. On the detail page, verify the action buttons are present (Move, Adjust Qty, etc.)

#### `e2e/projects.spec.ts` — Projects List & Detail

1. Navigate to `/projects` — assert "Projects" heading renders
2. Verify `ProjectCard` components render with seed data (project name, status badge, tags)
3. Click a project card — verify detail page renders with project info and allocations table

#### `e2e/locations.spec.ts` — Locations Tree

1. Navigate to `/locations` — assert "Locations" heading renders
2. Verify seed locations render (look for known names from seed data)
3. Verify the "Print Labels" button is present and not disabled
4. Click a location — verify it navigates to `/locations/[id]` detail page

#### `e2e/intake.spec.ts` — Intake Form

1. Navigate to `/intake` — assert "Quick Add" heading renders
2. Verify the form renders with:
   - Mode toggle (new part vs. existing part)
   - Part name input
   - Category dropdown
   - Quantity input
   - Location picker
3. Test form validation — submit empty form, verify error messages appear
4. Fill in valid data for a new part and submit — verify success message appears

#### `e2e/import.spec.ts` — Import Page

1. Navigate to `/import` — assert "CSV Import" heading renders
2. Verify the import order warning banner is visible ("Recommended order: locations → parts → lots")
3. Verify the form renders with entity type selector and file upload area

### Step 5: Run the Tests

```bash
npx playwright test --reporter=list 2>&1 | head -200
```

If tests fail:
1. Read the failure output carefully
2. Fix the test — adjust selectors, add waits, fix assertions
3. Re-run only the failing file: `npx playwright test e2e/<file>.spec.ts`
4. Repeat until all tests pass

### Step 6: Report Results

**If a PR number was provided** (non-zero), add a comment to that PR with results:

```yaml
---
add-comment:
  target: ${{ github.event.inputs.pr_number }}
  body: |
    ## 🎭 Playwright UI Test Results

    **Scope**: $scope
    **Status**: ✅ All passed / ❌ X failures

    | Suite | Tests | Passed | Failed |
    |-------|-------|--------|--------|
    | navigation | N | N | 0 |
    | parts | N | N | 0 |
    | ... | ... | ... | ... |

    <details><summary><b>Test Output</b></summary>

    ```
    [paste test output here]
    ```

    </details>
---
```

**If no PR number** (running against main), create a PR with the new test files:

```yaml
---
create-pull-request:
  title: "Add Playwright UI tests"
  body: |
    ## Playwright E2E UI Tests

    Adds automated UI tests covering: [list of scopes tested]

    ### Test Results
    [summary of test run]
  base: main
---
```

**If all tests pass and the test files already exist with no changes needed**, use `noop`:

```yaml
---
noop:
  message: "All Playwright UI tests already exist and pass. No changes needed."
---
```

## Guidelines

- **Do NOT modify application code** — only create/edit files in `e2e/` and `playwright.config.ts`
- **Prefer resilient selectors** — use text content, roles, and labels over brittle CSS selectors
- **Handle loading states** — use `waitForResponse`, `waitForSelector`, or `expect().toBeVisible()` with timeouts
- **Keep tests fast** — avoid unnecessary `waitForTimeout()` sleeps; wait for specific conditions instead
- **SQLite concurrency** — set `fullyParallel: false` since SQLite doesn't support concurrent writes
- **Test against seed data** — read `prisma/seed.ts` to know what data to assert against
- **Use filesystem-safe timestamps** in any output filenames: `YYYY-MM-DD-HH-MM-SS` (no colons)


