# Architecture Patterns: Real-Time Draft Assistant

**Domain:** Esports Analytics (League of Legends Draft System)
**Researched:** 2026-01-28
**Confidence:** MEDIUM (based on general real-time analytics patterns, needs verification with GRID.gg API specifics)

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  Next.js App (Vercel Edge)                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Draft UI     │  │ Recommendations│  │ Analytics    │          │
│  │ (React)      │  │ Display        │  │ Dashboard    │          │
│  └──────┬───────┘  └───────┬──────┘  └──────┬───────┘          │
│         │                   │                 │                   │
│         └───────────────────┼─────────────────┘                   │
│                             │                                     │
│                    ┌────────▼────────┐                           │
│                    │  State Manager  │                           │
│                    │  - Draft State  │                           │
│                    │  - Pick/Ban Seq │                           │
│                    │  - Team Comps   │                           │
│                    └────────┬────────┘                           │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  API LAYER        │
                    │  (Next.js API     │
                    │   Routes)         │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                      │
┌───────▼──────┐    ┌────────▼────────┐    ┌───────▼──────┐
│ Recommendation│    │ Draft Simulator │    │ Cache Layer  │
│ Engine        │    │ Engine          │    │ (Redis/      │
│ (Edge Fn)     │    │ (Edge Fn)       │    │  Supabase)   │
└───────┬───────┘    └────────┬────────┘    └───────┬──────┘
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  DATA LAYER       │
                    │  Supabase         │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │ PostgreSQL  │  │
                    │  │ - Champions │  │
                    │  │ - Stats     │  │
                    │  │ - Synergies │  │
                    │  │ - Players   │  │
                    │  └─────────────┘  │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │ Realtime    │  │
                    │  │ (WebSocket) │  │
                    │  └─────────────┘  │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  ETL PIPELINE     │
                    │  (Vercel Cron +   │
                    │   Edge Functions) │
                    │                   │
                    │  ┌─────────────┐  │
                    │  │ GRID.gg     │  │
                    │  │ API Client  │  │
                    │  └─────────────┘  │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  EXTERNAL DATA    │
                    │  GRID.gg APIs     │
                    └───────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With | Interface |
|-----------|---------------|-------------------|-----------|
| **Draft UI** | User interaction, pick/ban visualization | State Manager, API Layer | React props/events |
| **State Manager** | Draft state (20-step sequence), undo/redo, validation | Draft UI, API Layer | React Context/Zustand |
| **API Layer** | Request routing, auth, rate limiting | All client components, Edge Functions | REST/tRPC |
| **Recommendation Engine** | AI-powered pick suggestions, counter-picks, synergy scoring | Draft Simulator, Cache Layer, Data Layer | Edge Function API |
| **Draft Simulator** | What-if analysis, win prediction, team composition validation | Recommendation Engine, Data Layer | Edge Function API |
| **Cache Layer** | Hot data (champion stats, synergy matrices, meta tier lists) | Recommendation Engine, Draft Simulator | Key-value store |
| **Data Layer (Supabase)** | Persistent storage, real-time subscriptions | API Layer, Edge Functions | SQL + Realtime API |
| **ETL Pipeline** | Data ingestion from GRID.gg, transformation, normalization | GRID.gg APIs, Data Layer | Scheduled jobs |
| **GRID.gg Client** | API integration, rate limiting, error handling | GRID.gg APIs, ETL Pipeline | HTTP client |

## Data Flow Patterns

### 1. Draft Simulation Flow (User-Initiated)

```
User Action (Pick/Ban)
  → State Manager (local state update)
  → API Layer (/api/draft/simulate)
  → Draft Simulator (Edge Function)
      ├─→ Cache Layer (check for precomputed data)
      ├─→ Data Layer (fetch champion stats, synergies)
      └─→ Recommendation Engine (score options)
  ← Response (top 5 picks + win predictions)
  ← State Manager (update recommendations)
  ← UI Update (render suggestions)

Time budget: <200ms for interactive feel
```

### 2. ETL Data Ingestion Flow (Scheduled)

```
Vercel Cron (hourly/daily)
  → ETL Pipeline (Edge Function)
  → GRID.gg API Client
      ├─→ /matches endpoint (recent pro matches)
      ├─→ /champions endpoint (champion data)
      └─→ /players endpoint (player pools)
  → Transform & Normalize
      ├─→ Calculate synergy matrices
      ├─→ Update champion win rates
      ├─→ Derive meta tier lists
      └─→ Extract player champion pools
  → Data Layer (bulk upsert)
  → Cache Layer (invalidate stale data)
  → Supabase Realtime (notify connected clients)

Time budget: <5min for full refresh
```

### 3. Real-Time Update Flow (Data Change)

```
ETL Pipeline completes
  → Data Layer (Supabase row updated)
  → Supabase Realtime (broadcast change)
  → Client Subscription (WebSocket)
  → State Manager (invalidate local cache)
  → UI Update (show "New data available" banner)
  → User Action (refresh)
  → Re-fetch recommendations

Alternative: Polling (fallback if WebSocket fails)
  → Client polls /api/version every 30s
  → Compare version hash
  → If changed, re-fetch data
```

### 4. Initial Page Load Flow

```
User navigates to /draft
  → Next.js SSR (Vercel Edge)
  → Fetch static data (champion list, meta tiers)
  → Render initial HTML
  → Hydrate React app
  → Establish Supabase Realtime connection
  → Load user preferences (saved drafts, favorite champions)
  → Ready for interaction

Time budget: <1s for FCP, <2s for TTI
```

## State Management Strategy

### Draft State (Critical Path)

**Requirements:**
- 20-step pick/ban sequence (blue ban, red ban, blue pick, etc.)
- Each step has: champion_id, team, action_type, timestamp
- Undo/redo support
- Validation (can't pick banned champions, can't pick same champion twice)
- Persistence (save draft mid-session)

**Recommended Pattern: Reducer + Command Pattern**

```typescript
// State structure
interface DraftState {
  id: string;
  steps: DraftStep[];
  currentStep: number;
  teams: {
    blue: { picks: Champion[], bans: Champion[] };
    red: { picks: Champion[], bans: Champion[] };
  };
  metadata: {
    tournament: string;
    patch: string;
    createdAt: Date;
  };
}

// Command pattern for undo/redo
type DraftCommand =
  | { type: 'PICK', team: Team, champion: Champion }
  | { type: 'BAN', team: Team, champion: Champion }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// Reducer ensures valid state transitions
function draftReducer(state: DraftState, command: DraftCommand): DraftState {
  // Validate command against current state
  // Apply state transition
  // Return new immutable state
}
```

**Storage:**
- **In-memory:** Zustand/Redux for active draft (fast access)
- **Local storage:** Auto-save every action (persist on refresh)
- **Supabase:** Save completed drafts (share/analyze later)

### Recommendation Cache (Performance Critical)

**Hot data that changes infrequently:**
- Champion base stats (patch updates only)
- Synergy matrices (recalculated daily)
- Player champion pools (updated after tournaments)
- Meta tier lists (updated weekly)

**Caching Strategy:**

| Data Type | Update Frequency | Cache Location | TTL | Invalidation |
|-----------|-----------------|----------------|-----|--------------|
| Champion stats | Per patch (~2 weeks) | Supabase + Browser Cache | 7 days | Patch release |
| Synergy matrices | Daily | Supabase + Redis | 1 day | ETL completion |
| Player pools | Weekly | Supabase | 7 days | Tournament end |
| Meta tiers | Weekly | Supabase + Browser Cache | 3 days | Manual refresh |
| Match history | Hourly | Supabase | 1 hour | ETL completion |

**Implementation:**

```typescript
// Multi-tier cache
class DataCache {
  // L1: Browser memory (instant)
  private memoryCache = new Map<string, CacheEntry>();

  // L2: Browser localStorage (fast)
  private localCache = localStorage;

  // L3: Supabase (network, but CDN-backed)
  private supabase = createClient();

  async get<T>(key: string): Promise<T | null> {
    // Check L1
    if (this.memoryCache.has(key)) return this.memoryCache.get(key)!.data;

    // Check L2
    const localData = this.localCache.getItem(key);
    if (localData) {
      const entry = JSON.parse(localData);
      if (entry.expiresAt > Date.now()) {
        this.memoryCache.set(key, entry); // Promote to L1
        return entry.data;
      }
    }

    // Check L3
    const { data } = await this.supabase.from('cache').select('*').eq('key', key).single();
    if (data && data.expires_at > new Date()) {
      this.set(key, data.value, data.ttl); // Populate L1+L2
      return data.value;
    }

    return null;
  }
}
```

## Real-Time Update Patterns

### Option 1: Supabase Realtime (Recommended)

**Pros:**
- Built-in WebSocket connection
- Automatic reconnection
- Row-level subscriptions
- Low latency (<100ms)

**Cons:**
- Supabase-specific (vendor lock-in)
- Connection limits on free tier

**Use Case:** Primary real-time channel for data updates

```typescript
// Subscribe to meta tier updates
const channel = supabase
  .channel('meta-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'meta_tiers'
  }, (payload) => {
    // Invalidate cache, show notification
  })
  .subscribe();
```

### Option 2: Server-Sent Events (SSE)

**Pros:**
- HTTP-based (firewall-friendly)
- Automatic reconnection
- One-way server→client (sufficient for updates)

**Cons:**
- Next.js API routes don't support streaming on Vercel Edge (need Node.js runtime)
- Connection limits

**Use Case:** Fallback if WebSocket blocked

```typescript
// API route (Node.js runtime)
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ version: Date.now() })}\n\n`);
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### Option 3: Polling (Fallback)

**Pros:**
- Simple, no persistent connection
- Works everywhere

**Cons:**
- Higher latency
- Increased load on API

**Use Case:** Fallback if Realtime/SSE unavailable

```typescript
// Poll version endpoint every 30s
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await fetch('/api/version');
    if (data.version > localVersion) {
      showUpdateNotification();
    }
  }, 30000);

  return () => clearInterval(interval);
}, [localVersion]);
```

**Recommendation:** Use Supabase Realtime as primary, polling as fallback.

### Hybrid Approach (Best)

```typescript
// Detect connection status, choose strategy
const useRealtimeSync = () => {
  const [syncStrategy, setSyncStrategy] = useState<'realtime' | 'polling'>('realtime');

  useEffect(() => {
    // Try Supabase Realtime
    const channel = supabase.channel('test');

    const timeout = setTimeout(() => {
      // If not connected in 5s, fall back to polling
      if (channel.state !== 'joined') {
        setSyncStrategy('polling');
      }
    }, 5000);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        setSyncStrategy('realtime');
      }
    });

    return () => {
      clearTimeout(timeout);
      channel.unsubscribe();
    };
  }, []);

  return syncStrategy;
};
```

## Component Build Order

Based on dependencies, suggested phased approach:

### Phase 1: Data Foundation
**Build first (no dependencies):**
1. **Data Layer Schema** - Supabase tables (champions, stats, synergies, players)
2. **GRID.gg Client** - API integration wrapper
3. **Cache Layer** - Multi-tier cache implementation

**Why first:** Everything depends on data infrastructure

### Phase 2: ETL Pipeline
**Build second (depends on Phase 1):**
4. **ETL Pipeline** - Data ingestion from GRID.gg
5. **Data Transformations** - Synergy calculation, meta derivation

**Why second:** Need data before building features

### Phase 3: Core Draft Logic
**Build third (depends on Phase 1):**
6. **Draft State Manager** - 20-step sequence, validation
7. **Draft Simulator** - Team composition analysis
8. **Recommendation Engine** - Pick scoring logic

**Why third:** Core business logic layer

### Phase 4: API Layer
**Build fourth (depends on Phase 3):**
9. **API Routes** - Expose draft simulator + recommendations
10. **Edge Functions** - Deploy compute-heavy logic to edge

**Why fourth:** API wraps business logic

### Phase 5: Client UI
**Build fifth (depends on Phase 4):**
11. **Draft UI Components** - Pick/ban visualization
12. **Recommendations Display** - Show AI suggestions
13. **Real-time Sync** - Supabase Realtime integration

**Why last:** UI consumes API

### Parallel Tracks

Can be built in parallel with main track:
- **Analytics Dashboard** (depends on Data Layer only)
- **Authentication** (depends on Supabase only)
- **User Preferences** (depends on Data Layer only)

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 100K users |
|---------|--------------|--------------|---------------|
| **Database queries** | Direct Supabase | Add connection pooling | Read replicas, sharding |
| **Recommendation engine** | Compute on-demand | Cache popular drafts | Precompute common scenarios |
| **Real-time connections** | Supabase Realtime | Supabase Realtime | Custom WebSocket server |
| **ETL pipeline** | Single Edge Function | Parallel workers | Streaming ETL, incremental updates |
| **Cache hit rate** | 70% (cold start) | 90% (warm cache) | 95% (precomputed matrices) |
| **API rate limits** | GRID.gg free tier | GRID.gg paid tier | Negotiate enterprise plan |

### Performance Budgets

**Critical path (draft simulation):**
- State update: <16ms (60fps)
- API call: <200ms (p95)
- Recommendation engine: <150ms (p95)
- Database query: <50ms (p95)

**Non-critical (ETL):**
- Full data refresh: <5min
- Synergy recalculation: <2min
- Meta tier derivation: <30s

## Patterns to Follow

### Pattern 1: Optimistic UI Updates
**What:** Update UI immediately, reconcile with server later
**When:** User picks/bans champions (can validate locally)
**Example:**
```typescript
function useDraftAction() {
  const [draft, setDraft] = useState<DraftState>();

  async function pickChampion(champion: Champion) {
    // Optimistic update
    const optimisticDraft = applyPick(draft, champion);
    setDraft(optimisticDraft);

    try {
      // Server validation
      const validated = await api.draft.validate(optimisticDraft);
      setDraft(validated);
    } catch (error) {
      // Rollback on error
      setDraft(draft);
      showError('Invalid pick');
    }
  }

  return { draft, pickChampion };
}
```

### Pattern 2: Stale-While-Revalidate
**What:** Serve cached data immediately, update in background
**When:** Non-critical data (meta tiers, champion stats)
**Example:**
```typescript
async function getMetaTiers() {
  // Serve stale data immediately
  const cached = await cache.get('meta-tiers');
  if (cached) return cached;

  // Fetch fresh data in background
  const fresh = await db.from('meta_tiers').select('*');
  cache.set('meta-tiers', fresh, 3600); // 1 hour TTL

  return fresh;
}
```

### Pattern 3: Request Deduplication
**What:** Collapse multiple identical requests into one
**When:** Multiple components request same data
**Example:**
```typescript
const pendingRequests = new Map<string, Promise<any>>();

async function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fetcher();
  pendingRequests.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
}
```

### Pattern 4: Circuit Breaker for GRID.gg API
**What:** Prevent cascading failures from external API
**When:** GRID.gg API is down or rate-limited
**Example:**
```typescript
class GridAPIClient {
  private failureCount = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 min

  async fetch(endpoint: string) {
    // Circuit open (too many failures)
    if (this.failureCount >= this.threshold) {
      if (Date.now() - this.lastFailure < this.timeout) {
        throw new Error('Circuit breaker open');
      }
      // Try again after timeout
      this.failureCount = 0;
    }

    try {
      const response = await fetch(`https://api.grid.gg${endpoint}`);
      this.failureCount = 0; // Reset on success
      return response;
    } catch (error) {
      this.failureCount++;
      this.lastFailure = Date.now();
      throw error;
    }
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: N+1 Queries in Recommendation Engine
**What:** Fetching champion stats one at a time in a loop
**Why bad:** 160+ champions = 160+ database queries, 5-10s latency
**Instead:** Batch fetch all champion stats in single query

```typescript
// BAD
async function getRecommendations(draft: Draft) {
  const scores = [];
  for (const champion of allChampions) {
    const stats = await db.from('champion_stats').eq('id', champion.id).single(); // N+1
    scores.push(score(stats, draft));
  }
  return scores;
}

// GOOD
async function getRecommendations(draft: Draft) {
  const allStats = await db.from('champion_stats').select('*'); // Single query
  const scores = allStats.map(stats => score(stats, draft));
  return scores;
}
```

### Anti-Pattern 2: Storing Computed Data in Frontend State
**What:** Storing synergy matrices, win predictions in React state
**Why bad:** Large objects (160x160 matrix = 25K entries), slow re-renders
**Instead:** Store in IndexedDB, reference by key in state

```typescript
// BAD
const [synergyMatrix, setSynergyMatrix] = useState<number[][]>(/* 160x160 array */);

// GOOD
const [synergyMatrixKey, setSynergyMatrixKey] = useState<string>('patch-14.1');
const synergies = useSynergyMatrix(synergyMatrixKey); // Lazy load from IndexedDB
```

### Anti-Pattern 3: Real-Time Updates for Everything
**What:** Broadcasting every database change to all clients
**Why bad:** Overwhelming clients with irrelevant updates, increased bandwidth
**Instead:** Selective subscriptions (only meta_tiers and champion_stats)

```typescript
// BAD - Subscribe to all tables
supabase.channel('all').on('*', handleChange);

// GOOD - Subscribe to relevant tables only
supabase.channel('meta').on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'meta_tiers'
}, handleMetaUpdate);
```

### Anti-Pattern 4: Running ETL in API Routes
**What:** Triggering GRID.gg API calls in response to user actions
**Why bad:** Slow response times, rate limit exhaustion, cascading failures
**Instead:** Use scheduled Vercel Cron, decouple data ingestion from user requests

```typescript
// BAD - User action triggers ETL
app.post('/api/draft', async (req) => {
  await updateFromGridAPI(); // 10s+ delay
  return generateRecommendations(req.body);
});

// GOOD - ETL runs on schedule
// vercel.json
{
  "crons": [{
    "path": "/api/etl",
    "schedule": "0 * * * *" // Every hour
  }]
}
```

### Anti-Pattern 5: Mutable Draft State
**What:** Mutating draft state object directly
**Why bad:** Breaks undo/redo, causes React render bugs, makes debugging hard
**Instead:** Immutable updates with spread operator or Immer

```typescript
// BAD
function pickChampion(draft: Draft, champion: Champion) {
  draft.steps.push({ type: 'pick', champion }); // Mutation
  return draft;
}

// GOOD
function pickChampion(draft: Draft, champion: Champion): Draft {
  return {
    ...draft,
    steps: [...draft.steps, { type: 'pick', champion }]
  };
}
```

## Technology-Specific Considerations

### Next.js on Vercel

**Edge vs Node.js Runtime:**
- **Edge Functions:** Fast cold starts (<50ms), global distribution, but limited to 1MB response size
- **Node.js Runtime:** Slower cold starts (~1s), regional, but supports streaming, longer execution

**Recommendation:**
- Use Edge for: API routes, recommendation engine, draft simulator (fast, stateless)
- Use Node.js for: ETL pipeline (long-running), SSE endpoints (streaming)

### Supabase Realtime Limits

**Free tier:**
- 200 concurrent connections
- 2M realtime messages/month

**Scaling strategy:**
1. Use broadcast (not presence) for one-way updates
2. Batch updates (send meta version, client fetches full data)
3. Upgrade to Pro tier at 1K+ concurrent users

### GRID.gg API Rate Limits

**Unknown specifics, but assume:**
- ~100 requests/hour on free tier
- ~1000 requests/hour on paid tier

**Mitigation:**
1. Batch requests (use multi-entity endpoints)
2. Cache aggressively (stale data acceptable for analytics)
3. Implement exponential backoff
4. Monitor rate limit headers, adjust ETL frequency

## Open Questions

**Needs verification:**
1. GRID.gg API rate limits (unknown, not publicly documented)
2. GRID.gg API response schemas (need to inspect actual responses)
3. Supabase Edge Function cold start times (claimed <50ms, needs measurement)
4. Optimal synergy matrix calculation algorithm (NxM complexity, needs profiling)

**Needs phase-specific research:**
1. **ETL Phase:** GRID.gg API pagination, error handling, data quality
2. **Recommendation Phase:** AI model hosting (local vs API), inference time
3. **Deployment Phase:** Vercel Edge Function memory limits, execution time limits

## Sources

**Confidence Note:** This architecture is synthesized from general knowledge of:
- Real-time analytics system patterns
- Next.js/Vercel architecture best practices (as of Jan 2025 training data)
- Supabase Realtime capabilities (as of Jan 2025 training data)
- Draft simulation state management patterns

**LOW confidence areas requiring verification:**
- GRID.gg API specifics (not in training data, needs official docs)
- Vercel Edge Function limits in 2026 (may have changed since training)
- Supabase Realtime connection limits on current pricing tiers

**Recommended verification:**
1. Inspect GRID.gg API documentation for rate limits, schemas
2. Check Vercel Edge Function current limits (execution time, memory, response size)
3. Verify Supabase Realtime connection limits on free/pro tiers
4. Prototype cache layer to measure hit rates

**Note:** Architecture patterns are sound based on established real-time system design principles, but technology-specific details may need updating based on current documentation.
