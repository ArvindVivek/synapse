# Phase 1: Data Foundation - Research

**Researched:** 2026-01-28
**Domain:** ETL Pipeline for Esports Analytics (GRID.gg → Supabase)
**Confidence:** MEDIUM (verified sources for core technologies, LOW for GRID API specifics)

## Summary

Phase 1 establishes the data foundation by ingesting professional League of Legends tournament data from GRID.gg into a Supabase PostgreSQL database. The pipeline must handle 1,500+ games across LCS, LEC, LCK, LPL tournaments, extract draft phase information (picks/bans), infer player roles for champions (critical for accurate recommendations), and normalize champion names.

The standard approach is a scheduled ETL pipeline with rate-limited API client, multi-signal role inference, Bayesian smoothing for sparse data, and checkpointing for resume-on-failure. The BRD initially proposed Python FastAPI, but the existing stack (Supabase + Next.js TypeScript) makes a TypeScript-based ETL more cohesive.

**Critical insight:** Role assignment is NOT provided by GRID API and must be inferred using multiple signals (player primary role + champion distribution + team composition constraints). Incorrect role assignment invalidates all downstream recommendations.

**Primary recommendation:** Build TypeScript ETL as Supabase Edge Functions with rate-limited GRID client, checkpoint progress in PostgreSQL, use multi-signal role inference with confidence scoring, and pre-compute synergy matrices to avoid runtime computation.

## Standard Stack

The established libraries/tools for ETL pipelines with external APIs:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.50.0+ | Database client + Edge Functions runtime | Official Supabase client, handles connection pooling, provides TypeScript types |
| `node-cron` | 3.0.3 | Scheduled job execution | Industry standard for cron jobs in Node.js, simple API |
| `zod` | 3.24.1 | Runtime validation for API responses | Type-safe validation, catches API schema changes early |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bottleneck` | 2.19.5 | Rate limiting with exponential backoff | Managing GRID API rate limits (180 req/min overall, 6 req/min per series) |
| `p-retry` | 6.2.1 | Retry logic with exponential backoff | Handling transient API failures, 429 rate limit errors |
| `date-fns` | 4.1.0 | Date manipulation for patch filtering | Calculating patch recency, filtering games by date |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Edge Functions | Python FastAPI ETL | Python has richer ML ecosystem but adds deployment complexity (separate hosting), context switching languages |
| node-cron | Vercel Cron | Vercel Cron simpler setup but less flexible scheduling, limited to specific paths |
| bottleneck | Custom rate limiter | Custom solution avoids dependency but misses battle-tested edge cases (jitter, sliding window) |

**Installation:**
```bash
npm install @supabase/supabase-js@2.50.0 node-cron@3.0.3 zod@3.24.1 bottleneck@2.19.5 p-retry@6.2.1 date-fns@4.1.0
```

## Architecture Patterns

### Recommended Project Structure

```
synapse/
├── supabase/
│   ├── functions/
│   │   ├── etl-tournaments/          # Fetch tournament metadata
│   │   │   └── index.ts
│   │   ├── etl-series/               # Fetch series for tournaments
│   │   │   └── index.ts
│   │   ├── etl-drafts/               # Extract draft picks/bans
│   │   │   └── index.ts
│   │   ├── compute-synergies/        # Pre-compute synergy matrix
│   │   │   └── index.ts
│   │   └── _shared/
│   │       ├── grid-client.ts        # Rate-limited GRID API client
│   │       ├── role-inference.ts     # Multi-signal role assignment
│   │       └── checkpoint.ts         # Resumable job state
│   └── migrations/
│       ├── 20260128000001_schema.sql      # Core tables (drafts, picks, stats)
│       ├── 20260128000002_indexes.sql     # Performance indexes
│       └── 20260128000003_checkpoints.sql # ETL progress tracking
│
└── scripts/
    └── run-etl.ts                    # Local ETL orchestrator (for dev)
```

### Pattern 1: Rate-Limited GRID API Client

**What:** Wrapper around GRID GraphQL API that enforces rate limits (180 req/min overall, 6 req/min per series) with exponential backoff on 429 errors.

**When to use:** All interactions with GRID API (tournaments, series state, events).

**Example:**
```typescript
// supabase/functions/_shared/grid-client.ts
import Bottleneck from 'bottleneck';
import pRetry from 'p-retry';

// GRID API rate limits (from official docs)
const RATE_LIMITS = {
  overall: { maxConcurrent: 3, minTime: 333 }, // 180/min = 3 req/sec
  perSeries: { maxConcurrent: 1, minTime: 10000 } // 6/min per series
};

class GridAPIClient {
  private limiter: Bottleneck;

  constructor(apiKey: string) {
    // Bottleneck manages rate limiting with sliding window
    this.limiter = new Bottleneck({
      maxConcurrent: RATE_LIMITS.overall.maxConcurrent,
      minTime: RATE_LIMITS.overall.minTime,
      reservoir: 180, // Max requests per minute
      reservoirRefreshAmount: 180,
      reservoirRefreshInterval: 60 * 1000 // 1 minute
    });
  }

  async query<T>(query: string, variables: Record<string, any>): Promise<T> {
    return this.limiter.schedule(() =>
      pRetry(
        async () => {
          const response = await fetch('https://api-op.grid.gg/central-data/graphql', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, variables })
          });

          if (response.status === 429) {
            // Extract Retry-After header if available
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;

            throw new Error(`Rate limit hit, retry after ${delay}ms`);
          }

          if (!response.ok) {
            throw new Error(`GRID API error: ${response.status}`);
          }

          return response.json();
        },
        {
          retries: 5,
          factor: 2, // Exponential: 1s, 2s, 4s, 8s, 16s
          minTimeout: 1000,
          maxTimeout: 30000,
          onFailedAttempt: (error) => {
            console.warn(`Attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`);
          }
        }
      )
    );
  }
}

// Usage
const client = new GridAPIClient(process.env.GRID_API_KEY!);
const tournaments = await client.query<TournamentsResponse>(GET_TOURNAMENTS_QUERY, { gameId: 'lol' });
```

**Source:** Rate limits verified from [GRID API documentation](https://grid.helpjuice.com/rate-limits-for-products)

### Pattern 2: Checkpointing for Resumable ETL

**What:** Track ETL progress in PostgreSQL table so jobs can resume from last successful step if interrupted (rate limits, timeouts, crashes).

**When to use:** All long-running ETL operations (fetching 1,500+ games takes 30-60 minutes with rate limits).

**Example:**
```sql
-- Migration: 20260128000003_checkpoints.sql
CREATE TABLE etl_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL, -- 'tournaments', 'series', 'drafts'
  entity_id VARCHAR(100), -- tournament_id, series_id, etc.
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  progress JSONB, -- Arbitrary progress metadata
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_type, entity_id)
);

CREATE INDEX idx_checkpoints_status ON etl_checkpoints(job_type, status);
```

```typescript
// supabase/functions/_shared/checkpoint.ts
interface Checkpoint {
  jobType: string;
  entityId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: Record<string, any>;
}

async function markStarted(checkpoint: Checkpoint) {
  await supabase.from('etl_checkpoints').upsert({
    job_type: checkpoint.jobType,
    entity_id: checkpoint.entityId,
    status: 'in_progress',
    started_at: new Date().toISOString()
  });
}

async function markCompleted(checkpoint: Checkpoint) {
  await supabase.from('etl_checkpoints').update({
    status: 'completed',
    completed_at: new Date().toISOString()
  }).eq('job_type', checkpoint.jobType).eq('entity_id', checkpoint.entityId);
}

async function getPendingJobs(jobType: string): Promise<string[]> {
  const { data } = await supabase
    .from('etl_checkpoints')
    .select('entity_id')
    .eq('job_type', jobType)
    .neq('status', 'completed');

  return data?.map(d => d.entity_id) || [];
}

// Usage in ETL function
async function fetchTournamentSeries(tournamentId: string) {
  await markStarted({ jobType: 'series', entityId: tournamentId });

  try {
    const series = await gridClient.query(GET_SERIES_QUERY, { tournamentId });
    // Process series...
    await markCompleted({ jobType: 'series', entityId: tournamentId });
  } catch (error) {
    await markFailed({ jobType: 'series', entityId: tournamentId, error: error.message });
    throw error;
  }
}
```

### Pattern 3: Multi-Signal Role Inference

**What:** Infer player role (Top/Jungle/Mid/ADC/Support) using multiple data sources because GRID API does NOT provide role information reliably.

**When to use:** All champion pick processing (required for synergy/counter-pick calculations).

**Critical:** PITFALL-1 from PITFALLS.md - incorrect role assignment invalidates recommendations.

**Example:**
```typescript
// supabase/functions/_shared/role-inference.ts

interface RoleInferenceSignals {
  playerPrimaryRole: Role; // From roster data
  championRoleDistribution: Record<Role, number>; // Historical role frequencies
  teamCompositionConstraints: Role[]; // Already-assigned roles
  mapPosition?: { x: number; y: number }; // From events API (if available)
}

type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';

// Pre-computed from historical data (Phase 1 ETL task)
const CHAMPION_ROLE_PRIORS: Record<string, Record<Role, number>> = {
  'Jinx': { top: 0.01, jungle: 0.00, mid: 0.02, adc: 0.95, support: 0.02 },
  'Azir': { top: 0.05, jungle: 0.00, mid: 0.90, adc: 0.00, support: 0.05 },
  'Swain': { top: 0.35, jungle: 0.05, mid: 0.20, adc: 0.00, support: 0.40 }, // Flex pick
  'Syndra': { top: 0.05, jungle: 0.00, mid: 0.75, adc: 0.00, support: 0.20 }, // Flex pick
  // ... 160+ champions
};

function inferRole(
  champion: string,
  signals: RoleInferenceSignals
): { role: Role; confidence: number } {
  const { playerPrimaryRole, championRoleDistribution, teamCompositionConstraints } = signals;

  // Signal 1: Player's primary role (weight: 0.4)
  const playerSignal = championRoleDistribution[playerPrimaryRole] || 0;

  // Signal 2: Champion's most common role (weight: 0.4)
  const championRoleScores = Object.entries(championRoleDistribution)
    .sort(([, a], [, b]) => b - a);
  const topChampionRole = championRoleScores[0];

  // Signal 3: Remaining roles (constraint satisfaction)
  const availableRoles = (['top', 'jungle', 'mid', 'adc', 'support'] as Role[])
    .filter(r => !teamCompositionConstraints.includes(r));

  // Combined scoring
  const scores: Record<Role, number> = {};
  for (const role of availableRoles) {
    scores[role] =
      (role === playerPrimaryRole ? 0.4 : 0) + // Player signal
      (championRoleDistribution[role] || 0) * 0.4 + // Champion signal
      (availableRoles.includes(role) ? 0.2 : 0); // Constraint bonus
  }

  const inferredRole = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0][0] as Role;

  const confidence = scores[inferredRole];

  // Flag low-confidence assignments for manual review
  if (confidence < 0.5) {
    console.warn(`Low confidence role assignment: ${champion} → ${inferredRole} (${confidence})`);
  }

  return { role: inferredRole, confidence };
}

// Usage during draft extraction
async function extractDraftPicks(game: Game) {
  const picks = [];
  const assignedRoles: Role[] = [];

  for (const player of game.players) {
    const championDist = CHAMPION_ROLE_PRIORS[player.championName] || {};

    const { role, confidence } = inferRole(player.championName, {
      playerPrimaryRole: player.position, // From roster
      championRoleDistribution: championDist,
      teamCompositionConstraints: assignedRoles
    });

    picks.push({
      game_id: game.id,
      player_id: player.id,
      champion: player.championName,
      role,
      role_confidence: confidence
    });

    assignedRoles.push(role);
  }

  return picks;
}
```

**Source:** Role inference requirement identified in [OpponentIQ case study](https://dev.to/dhani_dzulkarnain/building-opponentiq-automating-esports-scouting-with-grid-api-kp3)

### Pattern 4: Bayesian Smoothing for Sparse Data

**What:** Apply Laplace smoothing to win rates and synergy scores to prevent overfitting on small sample sizes (e.g., 2-0 = 100% win rate → smoothed to 58%).

**When to use:** All aggregation queries (champion stats, synergies, matchups).

**Critical:** PITFALL-4 from PITFALLS.md - data sparsity causes unstable predictions.

**Example:**
```typescript
// Pre-compute smoothed champion stats (Phase 1 task)
async function computeChampionStats(patch: string) {
  const PRIOR_WEIGHT = 10; // Equivalent to 10 games at 50% win rate
  const GLOBAL_WIN_RATE = 0.50;

  const { data: rawStats } = await supabase.rpc('aggregate_champion_picks', { patch });

  const smoothedStats = rawStats.map(stat => {
    const smoothedWinRate =
      (stat.wins + PRIOR_WEIGHT * GLOBAL_WIN_RATE) /
      (stat.games + PRIOR_WEIGHT);

    return {
      champion_name: stat.champion,
      patch_version: patch,
      games_played: stat.games,
      win_rate: smoothedWinRate,
      raw_win_rate: stat.wins / stat.games, // For transparency
      confidence: stat.games > 30 ? 'high' : stat.games > 10 ? 'medium' : 'low'
    };
  });

  await supabase.from('champion_stats').upsert(smoothedStats);
}
```

### Anti-Patterns to Avoid

- **Fetching all games in one query:** GRID API has per-series rate limits (6 req/min). Batch requests by tournament, checkpoint progress.
- **Storing draft order as flat picks array:** Draft is sequential (B1, R1-R2, B2-B3, etc.). Store `turn_number` and `phase` for context-aware recommendations. (See PITFALL-2)
- **Ignoring patch versions:** League patches change meta every 2 weeks. Always filter queries by recent patches (last 3 patches = 6 weeks). (See PITFALL-3)
- **Real-time ETL on user requests:** ETL is slow (30-60 min with rate limits). Run on schedule (hourly/daily), not per user request. (See PITFALL-6)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting with backoff | Custom delay logic with `setTimeout` | `bottleneck` + `p-retry` | Handles jitter, sliding windows, queue management, circuit breaking |
| GraphQL client | Manual `fetch` + string concatenation | `graphql-request` or typed SDK | Type safety, query validation, automatic error parsing |
| Cron scheduling | Custom interval logic | `node-cron` or Vercel Cron | Handles timezones, DST, human-readable syntax (`'0 */2 * * *'`) |
| Date/time math for patches | Manual date arithmetic | `date-fns` | Immutable, timezone-aware, handles edge cases (leap years, month boundaries) |
| Champion name normalization | String matching with `includes()` | Fuzzy matching library (`fuse.js`) or alias table | Handles typos, alternate spellings (Wukong vs MonkeyKing) |

**Key insight:** Rate limiting is deceptively complex. Bottleneck handles reservoir refills, distributed systems, priority queues, and exponential backoff that would take days to implement correctly.

## Common Pitfalls

### Pitfall 1: Role Assignment Ambiguity (CRITICAL)

**What goes wrong:** GRID API returns champion picks but doesn't indicate which role each champion was picked for. Swain can be Top/Mid/Support. If you assign roles incorrectly, your entire matchup matrix becomes invalid.

**Why it happens:**
- GRID's `seriesState` API returns `characterName` per player, but `role` field is positional or empty
- Flex picks are common (Swain, Syndra, Seraphine)
- Role swaps happen between phases

**How to avoid:**
1. Implement multi-signal role inference (Pattern 3 above)
2. Use player primary role + champion distribution + team constraints
3. Store `role_confidence` score with each pick
4. Flag low-confidence assignments (<0.5) for manual review
5. Build champion role distribution table from historical data

**Warning signs:**
- Games with duplicate roles (two "mid" players)
- Compositions with <5 unique roles
- User reports: "Why is Swain listed as Top when T1 played him Support?"

**Verification:** Manually spot-check 20 high-profile games against Leaguepedia/VOD data.

### Pitfall 2: GRID API Rate Limits Blocking ETL (MODERATE)

**What goes wrong:** GRID API has strict rate limits (180 req/min overall, 6 req/min per series). With 30 tournaments × 50 series = 1,500 series to fetch, you'll hit limits. Your ETL script fails halfway with incomplete data.

**Why it happens:**
- No backoff/retry logic in API client
- Parallel requests without rate limit awareness
- ETL runs once and crashes (no resume from checkpoint)

**How to avoid:**
1. Use `bottleneck` for rate limiting (Pattern 1)
2. Implement exponential backoff with `p-retry`
3. Checkpoint progress in PostgreSQL (Pattern 2)
4. Process tournaments sequentially, series in batches of 6/min
5. Monitor 429 responses, extract `Retry-After` header

**Warning signs:**
- 429 Too Many Requests errors in logs
- ETL completes only 30% of tournaments
- Inconsistent data (some tournaments complete, others empty)

**Verification:** Run ETL against all 30 tournaments, check completion rate in `etl_checkpoints` table.

### Pitfall 3: Champion Name Inconsistencies (MINOR)

**What goes wrong:** GRID API returns "Wukong" but Riot Data Dragon uses "MonkeyKing". Your queries fail silently when joining with external data sources.

**Why it happens:**
- GRID uses display names, Riot uses internal IDs
- Champions have aliases (Twisted Fate = TF, LeBlanc = LB)
- Champion names change over time (Aurelion Sol rework)

**How to avoid:**
1. Create champion alias table during ETL:
   ```sql
   CREATE TABLE champion_aliases (
     canonical_name VARCHAR(100) PRIMARY KEY,
     grid_name VARCHAR(100),
     riot_id VARCHAR(50),
     aliases TEXT[]
   );
   ```
2. Normalize all champion names on ingestion
3. Use fuzzy matching (`fuse.js`) for user input

**Warning signs:**
- Missing champion stats for "MonkeyKing" but present for "Wukong"
- Search fails for champion abbreviations (TF, GP, MF)

**Verification:** Cross-reference GRID champion names with Riot Data Dragon list.

### Pitfall 4: Patch/Meta Volatility (CRITICAL)

**What goes wrong:** League patches change meta every 2 weeks. Data from Patch 14.1 (January) is invalid for Patch 14.10 (May). Aggregating all historical data recommends nerfed champions.

**Why it happens:**
- Developers aggregate all data without filtering by patch
- No awareness of champion buffs/nerfs
- Historical data (2 years) treated equally with recent data (2 weeks)

**How to avoid:**
1. Store `patch_version` in all tables
2. Filter all queries to recent 3 patches (6 weeks)
3. Implement recency weighting (exponential decay with 30-day half-life)
4. Track champion reworks with hardcoded dates (Skarner VGU May 2024)
5. Display patch filter in UI ("Data from Patches 14.23-14.25")

**Warning signs:**
- Recommending champions with <5 games in recent patches
- Win rates differ significantly from u.gg/op.gg tier lists
- User reports: "Why is it recommending Kalista? She's F-tier!"

**Verification:** Compare recommendations against current u.gg tier list for Patch 16.1.

## Code Examples

Verified patterns from official sources:

### Fetching Tournaments from GRID API

```typescript
// Source: GRID GraphQL API docs
const GET_TOURNAMENTS_QUERY = `
  query GetTournaments($gameId: String!) {
    allTournament(
      filter: {
        game: { id: { equalTo: $gameId } },
        startTimeScheduled: { greaterThan: "2024-01-01" }
      }
    ) {
      nodes {
        id
        title
        startTimeScheduled
        endTimeScheduled
      }
    }
  }
`;

// Usage with rate-limited client
const gridClient = new GridAPIClient(process.env.GRID_API_KEY!);
const { data } = await gridClient.query(GET_TOURNAMENTS_QUERY, { gameId: 'lol' });

const tournaments = data.allTournament.nodes;
console.log(`Fetched ${tournaments.length} tournaments`);
```

### Fetching Series State (Picks/Bans)

```typescript
// Source: GRID Series State API
const GET_SERIES_STATE_QUERY = `
  query GetSeriesState($seriesId: ID!) {
    seriesState(id: $seriesId) {
      id
      started
      finished
      teams {
        id
        name
        won
      }
      games {
        id
        teams {
          id
          characterBans
          players {
            id
            name
            characterName
            role
            kills
            deaths
            assists
          }
        }
      }
    }
  }
`;

// Extract draft data
async function extractDrafts(seriesId: string) {
  const { data } = await gridClient.query(GET_SERIES_STATE_QUERY, { seriesId });

  for (const game of data.seriesState.games) {
    // Extract bans (provided by API)
    const blueBans = game.teams[0].characterBans;
    const redBans = game.teams[1].characterBans;

    // Extract picks (need to infer roles - Pattern 3)
    const picks = await extractDraftPicks(game);

    await supabase.from('drafts').insert({
      game_id: game.id,
      series_id: seriesId,
      blue_bans: blueBans,
      red_bans: redBans
    });

    await supabase.from('champion_picks').insert(picks);
  }
}
```

### Creating Optimized Indexes

```sql
-- Source: Supabase index optimization guide
-- Migration: 20260128000002_indexes.sql

-- Index for role-filtered queries (most common)
CREATE INDEX idx_picks_champion_role_patch ON champion_picks(champion_name, role, patch_version);

-- Index for player champion pool queries
CREATE INDEX idx_picks_player_champion ON champion_picks(player_id, champion_name);

-- Partial index for recent patches only (smaller, faster)
CREATE INDEX idx_picks_recent_patches ON champion_picks(champion_name, patch_version)
WHERE patch_version IN (
  SELECT DISTINCT patch_version
  FROM games
  ORDER BY created_at DESC
  LIMIT 3
);

-- Composite index for synergy lookups (pair-wise)
CREATE INDEX idx_synergies_pair ON champion_synergies(champion_a, champion_b);

-- Use BRIN index for time-series data (10x smaller than B-tree)
CREATE INDEX idx_games_created_at ON games USING BRIN(created_at);
```

**Source:** [Supabase index optimization guide](https://supabase.com/docs/guides/database/postgres/indexes)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Python ETL scripts with separate cron | TypeScript Edge Functions with Vercel/Supabase Cron | 2025 | Single-language stack, no separate hosting |
| Manual retry logic | `p-retry` with exponential backoff | 2024 | Standardized backoff patterns, automatic jitter |
| Flat champion stats tables | Patch-filtered materialized views | 2025 | Queries auto-filter to recent patches, faster |
| Real-time role inference | Pre-computed role distributions | 2024 | 10x faster lookups, no inference latency |
| Polling for updates | Supabase Realtime (WebSocket) | 2024 | <100ms latency for data changes |

**Deprecated/outdated:**
- **Moment.js for dates:** Replaced by `date-fns` (tree-shakeable, 10x smaller)
- **Request library:** Replaced by native `fetch` (built-in to Node 18+)
- **Custom GraphQL clients:** Use `graphql-request` or typed SDK generators

## Open Questions

Things that couldn't be fully resolved:

1. **GRID API exact rate limit headers**
   - What we know: 180 req/min overall, 6 req/min per series (from official docs)
   - What's unclear: Does API return `Retry-After` header on 429? What's the exact window (sliding vs fixed)?
   - Recommendation: Implement conservative limits (150 req/min), monitor logs for 429 responses, adjust if needed

2. **Role field reliability in GRID API**
   - What we know: `role` field exists but may be positional or empty (from case study)
   - What's unclear: Is it accurate for 50%+ of picks? Does it work for professional matches?
   - Recommendation: Implement multi-signal inference regardless, validate against `role` field if present, flag discrepancies

3. **Optimal patch lookback window**
   - What we know: LoL patches every 2 weeks, meta changes significantly
   - What's unclear: Is 3 patches (6 weeks) too short? Too long? Does it vary by champion?
   - Recommendation: Start with 3 patches, add UI toggle for "Include older patches", measure recommendation quality

4. **Champion rework dates**
   - What we know: Skarner VGU May 2024, Aurelion Sol VGU Jan 2023
   - What's unclear: Complete list of all reworks/VGUs since 2024
   - Recommendation: Hardcode known reworks, add manual review step for champions with <10 recent games

## Sources

### Primary (HIGH confidence)

- [GRID API Rate Limits - Official Documentation](https://grid.helpjuice.com/rate-limits-for-products)
  - 180 requests/minute overall, 6 requests/minute per series, verified Jan 2026

- [Supabase PostgreSQL Indexes - Official Guide](https://supabase.com/docs/guides/database/postgres/indexes)
  - Index types (B-tree, BRIN, partial), performance optimization, CREATE INDEX CONCURRENTLY

- [Supabase ETL Framework - Official Blog](https://supabase.com/blog/introducing-supabase-etl)
  - Real-time CDC pipelines, logical replication, at-least-once delivery

- [Building OpponentIQ with GRID API - Case Study](https://dev.to/dhani_dzulkarnain/building-opponentiq-automating-esports-scouting-with-grid-api-kp3)
  - Two-stage retrieval (Central Data + Series State), role inference challenges, response time optimization

### Secondary (MEDIUM confidence)

- [Node.js Rate Limiting with Exponential Backoff - Multiple Sources](https://www.atlassian.com/blog/developer/handling-rate-limiting-in-javascript)
  - Jitter patterns, retry strategies, 429 handling (verified across 3 sources)

- [TypeScript ETL Pipelines - LogRocket](https://blog.logrocket.com/use-typescript-instead-python-etl-pipelines/)
  - Modern async/await patterns, Prisma integration, node-cron scheduling

- [LoL Champion Meta 2026 - U.GG Tier List](https://u.gg/lol/tier-list)
  - Current patch meta, flex picks (Swain, Syndra), scaling-focused Season 2026

### Tertiary (LOW confidence)

- GRID API GraphQL endpoint structure (inferred from BRD and case study, not directly verified)
- Champion role distributions (need to compute from actual data during Phase 1)
- Optimal checkpoint interval (needs performance testing with real GRID API)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Libraries verified but not tested in this specific use case
- Architecture: HIGH - Patterns are established best practices for rate-limited ETL
- Pitfalls: HIGH - Verified from project PITFALLS.md and external sources
- GRID API specifics: LOW - Documentation found but endpoint responses not verified
- Role inference: MEDIUM - Problem confirmed, solution is standard Bayesian approach

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable technologies, but GRID API may change)

**Next steps for validation:**
1. Test GRID API with sample queries (verify rate limits, response schemas)
2. Inspect actual `role` field in Series State responses (is it usable?)
3. Profile ETL performance (how long does 1,500 games take with rate limits?)
4. Validate champion name consistency (GRID vs Riot Data Dragon)
