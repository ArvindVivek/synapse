---
phase: 01-data-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, grid-api, bottleneck, p-retry, zod, typescript]

# Dependency graph
requires:
  - phase: 00-roadmap
    provides: Project structure and phase planning
provides:
  - Complete PostgreSQL schema with 10 tables for esports data
  - Rate-limited GRID API client with exponential backoff
  - Supabase clients for browser and server contexts
  - Type-safe database types matching schema
affects: [01-02-etl, 01-03-champion-data, 02-analytics]

# Tech tracking
tech-stack:
  added:
    - "@supabase/supabase-js@2.50.0"
    - "@supabase/ssr@0.5.2"
    - "bottleneck@2.19.5"
    - "p-retry@6.2.1"
    - "zod@3.24.1"
  patterns:
    - "Rate limiting with Bottleneck (180 req/min)"
    - "Exponential backoff with p-retry (5 retries, factor 2)"
    - "Runtime validation with Zod schemas"
    - "Supabase SSR pattern for Next.js 16"

key-files:
  created:
    - "supabase/migrations/20260128000001_schema.sql"
    - "supabase/migrations/20260128000002_indexes.sql"
    - "supabase/functions/_shared/types.ts"
    - "supabase/functions/_shared/grid-client.ts"
    - "lib/grid/queries.ts"
    - "lib/supabase/client.ts"
    - "lib/supabase/server.ts"
    - "lib/supabase/middleware.ts"
    - "middleware.ts"
    - ".env.local.example"
  modified: []

key-decisions:
  - "Use Bottleneck for rate limiting instead of custom solution"
  - "Store role_confidence scores for multi-signal role inference"
  - "Add etl_checkpoints table for resumable ETL jobs"
  - "Use Zod for runtime validation of GRID API responses"

patterns-established:
  - "Database migrations in supabase/migrations/ with timestamp prefixes"
  - "Shared Edge Function utilities in supabase/functions/_shared/"
  - "TypeScript Database type for full Supabase type safety"
  - "Environment variables documented in .env.local.example"

# Metrics
duration: 6min
completed: 2026-01-29
---

# Phase 1 Plan 1: Data Foundation Summary

**PostgreSQL schema with 10 tables, rate-limited GRID API client (180 req/min), and type-safe Supabase clients for Next.js SSR**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-01-29T09:11:15Z
- **Completed:** 2026-01-29T09:17:40Z
- **Tasks:** 3
- **Files modified:** 13
- **Commits:** 3 task commits

## Accomplishments

- Complete database schema with teams, players, tournaments, series, games, drafts, champion_picks, champions, champion_stats, and etl_checkpoints tables
- Performance indexes for role-filtered queries, patch filtering, and synergy lookups
- Rate-limited GRID API client with Bottleneck (180 req/min) and exponential backoff using p-retry
- Zod schemas for validating GRID API responses (tournaments, series state, picks/bans)
- Supabase clients configured for browser, server, and middleware contexts with full type safety
- Environment variables documented for Supabase and GRID API setup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase PostgreSQL schema with all required tables** - `f969303` (feat)
2. **Task 2: Implement rate-limited GRID API client with exponential backoff** - `6d7f9a1` (feat)
3. **Task 3: Set up Supabase client for browser and server contexts** - `40bd9d4` (feat)

## Files Created/Modified

### Database Schema
- `supabase/migrations/20260128000001_schema.sql` - Core schema with 10 tables, foreign keys, CHECK constraints, updated_at triggers
- `supabase/migrations/20260128000002_indexes.sql` - 10 performance indexes for common query patterns

### TypeScript Types
- `supabase/functions/_shared/types.ts` - Database types matching schema (TeamRow, PlayerRow, etc.) with Database type for Supabase client

### GRID API Client
- `supabase/functions/_shared/grid-client.ts` - GridAPIClient class with Bottleneck rate limiting, p-retry exponential backoff, Zod validation
- `lib/grid/queries.ts` - GraphQL query definitions for tournaments, series, series state, team rosters

### Supabase Clients
- `lib/supabase/client.ts` - Browser client using createBrowserClient
- `lib/supabase/server.ts` - Server client using createServerClient with Next.js cookies
- `lib/supabase/middleware.ts` - Middleware client for auth token refresh
- `middleware.ts` - Next.js middleware for session management

### Configuration
- `.env.local.example` - Environment variable documentation (4 vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GRID_API_KEY)

## Decisions Made

**1. Use Bottleneck for rate limiting**
- Rationale: Battle-tested library handling reservoir refills, jitter, sliding windows, and exponential backoff edge cases
- Alternative considered: Custom rate limiter with setTimeout
- Outcome: Bottleneck provides robust rate limiting (180 req/min) with minimal code

**2. Store role_confidence scores in champion_picks**
- Rationale: Role inference is probabilistic (flex picks like Swain, Syndra), need to flag low-confidence assignments
- Implementation: DECIMAL(3,2) field storing 0.00-1.00 confidence
- Outcome: Enables manual review of <0.5 confidence picks, validates role inference quality

**3. Add etl_checkpoints table for resumable ETL**
- Rationale: GRID API rate limits mean ETL takes 30-60 min; crashes/timeouts require resume capability
- Implementation: Track job_type, entity_id, status, progress JSONB
- Outcome: ETL can resume from last successful checkpoint, preventing data loss

**4. Use Zod for GRID API response validation**
- Rationale: Catch API schema changes early, provide runtime type safety
- Implementation: TournamentsResponseSchema, SeriesStateResponseSchema with nested validation
- Outcome: Parse errors surface immediately vs. silent data corruption

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript target mismatch with Zod**
- Issue: tsconfig target ES2017 but Zod uses private identifiers (ES2015+)
- Resolution: skipLibCheck: true in tsconfig allows compilation; Next.js build succeeds
- Impact: No action needed - standard Next.js configuration handles this

**Next.js middleware deprecation warning**
- Issue: Next.js 16 shows warning about "middleware" → "proxy" convention change
- Resolution: Acknowledged; migration to proxy.ts can be done in future refactor
- Impact: No breaking change - middleware.ts continues to work

## User Setup Required

**External services require manual configuration.** The following environment variables must be set:

### Supabase Setup
1. Create project at https://supabase.com/dashboard
2. Navigate to Project Settings → API
3. Copy required values:
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - service_role key (keep secret)

### GRID API Setup
1. Register at GRID Partner Portal
2. Navigate to API Keys section
3. Generate API key
4. Copy to `GRID_API_KEY`

### Verification
After setting environment variables:
```bash
# Copy template
cp .env.local.example .env.local

# Edit with your values
# Then verify build works:
npm run build
```

## Next Phase Readiness

**Ready for Phase 1 Plan 2 (ETL Pipeline):**
- Database schema complete with all tables and indexes
- GRID API client ready for tournament/series fetching
- Supabase clients configured for data insertion
- Type safety wired through entire stack

**No blockers.** ETL implementation can begin immediately.

**Recommendation for next plan:**
1. Implement ETL functions for tournaments → series → drafts pipeline
2. Use GridAPIClient with checkpointing pattern from RESEARCH.md
3. Apply multi-signal role inference for champion picks

---
*Phase: 01-data-foundation*
*Completed: 2026-01-29*
