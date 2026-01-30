# Synapse ETL Setup Guide

## ✅ What's Been Completed

### 1. Database Schema (3-Tier Architecture)
All migrations have been created and copied to `lumina/supabase/migrations/`:
- ✅ `20260128000001_schema.sql` - Core tables (tournaments, teams, players, series, games, drafts, champion_picks)
- ✅ `20260128000002_indexes.sql` - Performance indexes
- ✅ `20260128000003_champion_aliases.sql` - Champion reference data
- ✅ `20260129000001_event_tables.sql` - Event + Analysis tables (20+ tables for detailed game events)

**Schema Safety**: All migrations only CREATE new tables in the `synapse` schema. They will NOT affect lumina's data in the `public` schema.

### 2. ETL Scripts
- ✅ [grid-client.ts](scripts/etl/grid-client.ts) - GRID API client with file download support
- ✅ [role-inference.ts](scripts/etl/role-inference.ts) - Champion role inference
- ✅ [event-processor.ts](scripts/etl/event-processor.ts) - Event file parser (750+ lines)
- ✅ [etl-lol.ts](scripts/etl/etl-lol.ts) - Main ETL script
- ✅ [.env.local](scripts/etl/.env.local) - Local environment configuration
- ✅ [package.json](scripts/etl/package.json) - Dependencies including adm-zip

### 3. Documentation
- ✅ [README.md](scripts/etl/README.md) - Complete usage guide with data architecture diagram

## 🚀 Next Steps to Run Full ETL

### Step 1: Apply Database Migrations

The migrations have been copied to `lumina/supabase/migrations/`. Apply them using one of these methods:

**Option A: Restart Supabase** (recommended, auto-applies new migrations)
```bash
cd lumina
supabase stop
supabase start
```

**Option B: Manual SQL Execution** (if you can't restart)
```bash
# Connect to your local database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Then run:
\i lumina/supabase/migrations/20260128000001_schema.sql
\i lumina/supabase/migrations/20260128000002_indexes.sql
\i lumina/supabase/migrations/20260128000003_champion_aliases.sql
\i lumina/supabase/migrations/20260129000001_event_tables.sql
```

**Option C: Use Supabase CLI**
```bash
cd lumina
supabase db reset  # This will reapply all migrations from scratch
```

### Step 2: Install ETL Dependencies

```bash
cd synapse/scripts/etl
pnpm install
```

This will install:
- `@supabase/supabase-js` - Database client
- `bottleneck` - Rate limiting
- `p-retry` - Retry logic
- `adm-zip` - Event file decompression
- `dotenv` - Environment variables
- `zod` - Validation

### Step 3: Run the Full ETL

```bash
cd synapse/scripts/etl

# Full ETL (all regions, all tournaments)
pnpm etl

# Or filter by region
pnpm etl:lck   # Korea only
pnpm etl:lec   # Europe only
pnpm etl:lcs   # North America only
pnpm etl:lpl   # China only
pnpm etl:lta   # Latin America only

# Or test with limited data first
pnpm etl:test  # First 3 series only
```

### Expected ETL Output

The ETL will process:
- **28 tournaments** across 5 regions (LCK, LCS, LEC, LPL, LTA)
- **Hundreds of series** from 2024-2025
- **Thousands of games** with picks, bans, and champion data
- **Players and teams** with role assignments

Current ETL Phase (Tier 1):
- ✅ Tournaments, teams, players (metadata)
- ✅ Series, games, drafts (match results)
- ✅ Champion picks with role inference
- ⏳ Event processing (Phase 2 - requires integration)

### Step 4: Verify Data

Check the `synapse` schema in your database:

```sql
-- See what was imported
SELECT COUNT(*) FROM synapse.tournaments;
SELECT COUNT(*) FROM synapse.series;
SELECT COUNT(*) FROM synapse.games;
SELECT COUNT(*) FROM synapse.champion_picks;

-- Example query: Top picked champions
SELECT
  champion_name,
  role,
  COUNT(*) as picks
FROM synapse.champion_picks
GROUP BY champion_name, role
ORDER BY picks DESC
LIMIT 10;
```

## 📊 Data Architecture

```
GRID.gg APIs
     │
     ├─ Central Data API ──→ tournaments, teams, series
     ├─ Series State API ──→ games, players, picks, bans
     └─ File Download API ──→ event timeline files (Phase 2)
           │
           ▼
    synapse schema (isolated from lumina)
           ├─ RAW DATA (7 tables)
           ├─ EVENT DATA (8 tables) - Ready but not yet populated
           └─ ANALYSIS (5 tables) - Ready for future analytics
```

## 🔄 Phase 2: Event Processing (Future)

The schema and event processor are ready for detailed game events:
- Kill events with positions and bounties
- Objective captures (dragons, baron, towers)
- Item purchases and builds
- Ward placement/destruction
- Gold/XP tracking
- Position snapshots

To enable this, the ETL needs integration to:
1. Download event JSONL files for each series
2. Parse events using EventProcessor
3. Insert into event tables

## ⚠️ Important Notes

- **Schema Isolation**: All synapse data is in the `synapse` schema, completely separate from lumina's `public` schema
- **No Data Loss**: Migrations only CREATE tables, never DROP or ALTER existing ones
- **Rate Limiting**: GRID API is limited to 40 requests/min - ETL handles this automatically
- **Dry Run**: Use `--dry-run` flag to test without database writes
- **Idempotent**: ETL uses UPSERT, safe to re-run on same data

## 🐛 Troubleshooting

**"Missing env vars" error**
- Check `.env.local` exists in `scripts/etl/`
- Verify `GRID_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are set

**"Connection refused" to Supabase**
- Ensure Supabase is running: `cd lumina && supabase status`
- Check URL is `http://127.0.0.1:54321`

**"Table does not exist" error**
- Apply migrations first (see Step 1 above)

**API rate limit errors**
- Normal during large ETL runs, the client will automatically retry
- Use `--series-limit=N` to process smaller batches

## 📁 File Structure

```
synapse/
├── supabase/migrations/        # Database migrations (copied to lumina/)
├── scripts/etl/
│   ├── grid-client.ts          # GRID API client
│   ├── role-inference.ts       # Champion role inference
│   ├── event-processor.ts      # Event file parser
│   ├── etl-lol.ts             # Main ETL script
│   ├── package.json            # Dependencies
│   ├── .env.local             # Environment config
│   └── README.md               # Usage documentation
└── SETUP.md                    # This file
```

## 🎯 Quick Start (TL;DR)

```bash
# 1. Apply migrations
cd lumina && supabase db reset

# 2. Install dependencies
cd ../synapse/scripts/etl && pnpm install

# 3. Run test ETL
pnpm etl:test

# 4. Run full ETL
pnpm etl
```

That's it! Your League of Legends data will be flowing into the `synapse` schema. 🎮
