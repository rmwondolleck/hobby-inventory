# Hobby Inventory System

A Next.js-based inventory management system for tracking electronic components, maker supplies, and project materials.

## Features (MVP)

- **Parts Catalog**: Manage reusable part definitions with categories, parameters, and metadata
- **Stock Tracking**: Track lots with quantities, locations, and purchase sources
- **Location Hierarchy**: Organize physical storage (office > shelf > drawer > bin)
- **Project Allocation**: Reserve and track parts allocated to projects
- **Event History**: Light audit trail for stock mutations
- **Parameter Search**: Filter parts by category-specific parameters for compatibility

## Prerequisites

- Node.js >= 20.9.0 (required for Next.js 14+ and Prisma)
- npm or yarn

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

### 3. Initialize database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── health/        # Health check endpoint
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── ui/                # Reusable UI components
├── features/              # Feature modules
│   ├── parts/             # Parts management
│   ├── locations/         # Location management
│   ├── lots/              # Lot/stock management
│   └── projects/          # Project management
└── lib/                   # Shared utilities
    ├── db/                # Prisma client
    ├── types/             # TypeScript types
    └── utils/             # Helper functions

prisma/
└── schema.prisma          # Database schema

docs/
├── domain-model.md        # Entity definitions (Issue #5)
└── state-transitions.md   # Status rules (Issue #6)
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns service status and timestamp.

### Parts (Issue #9)

```
GET    /api/parts          # List parts
POST   /api/parts          # Create part
GET    /api/parts/[id]     # Get part
PATCH  /api/parts/[id]     # Update part
DELETE /api/parts/[id]     # Archive part
```

### Locations (Issue #10)

```
GET    /api/locations      # List/tree locations
POST   /api/locations      # Create location
GET    /api/locations/[id] # Get location
PATCH  /api/locations/[id] # Update location
DELETE /api/locations/[id] # Delete location
```

### Lots (Issue #11)

```
GET    /api/lots           # List lots
POST   /api/lots           # Create lot
GET    /api/lots/[id]      # Get lot
PATCH  /api/lots/[id]      # Update lot
POST   /api/lots/[id]/move # Move lot
```

### Projects (Issue #14)

```
GET    /api/projects       # List projects
POST   /api/projects       # Create project
GET    /api/projects/[id]  # Get project
PATCH  /api/projects/[id]  # Update project
DELETE /api/projects/[id]  # Archive project
```

### Allocations (Issue #15)

```
GET    /api/allocations           # List allocations
POST   /api/allocations           # Create allocation
PATCH  /api/allocations/[id]      # Update status
POST   /api/allocations/[id]/return # Return to stock
POST   /api/allocations/[id]/scrap  # Scrap allocation
```

## Database Commands

```bash
# Run migrations
npx prisma migrate dev

# Reset database (drops all data)
npm run db:reset

# Seed database with demo data
npm run db:seed

# Open Prisma Studio
npx prisma studio

# Generate Prisma Client
npx prisma generate
```

### Migration Rollback Strategy

Prisma migrations are forward-only by design. To rollback a migration:

**Option 1: Reset and replay (Development only)**
```bash
# Drop database and replay all migrations
npm run db:reset
```

**Option 2: Create a new migration to undo changes**
```bash
# Modify schema.prisma to reflect desired state
# Create new migration
npx prisma migrate dev --name rollback_feature_xyz
```

**Option 3: Restore from backup (Production)**
```bash
# Stop application
# Restore database from backup
# Run prisma migrate resolve to mark migrations
npx prisma migrate resolve --rolled-back 20260313140508_migration_name
```

**Best Practices:**
- Test migrations in development before production
- Back up production database before migrations
- Use `npx prisma migrate deploy` in production (not `dev`)
- Keep migrations small and reversible when possible
- Document breaking changes in migration comments

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## Issue Tracker

See [GitHub Issues](https://github.com/rmwondolleck/hobby-inventory/issues) for the full MVP backlog.

### Epics

1. **Foundation** (#1) - Domain model, statuses, skeleton, migrations
2. **Inventory Core** (#2) - Parts, locations, lots, events, search
3. **Projects & Compatibility** (#3) - Projects, allocations, parameters
4. **Intake & Usability** (#4) - Manual intake, CSV import, UI

## License

MIT
