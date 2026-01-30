# Phase 3: Draft State Machine - Research

**Researched:** 2026-01-30
**Domain:** Real-time draft state management, turn-based game validation
**Confidence:** HIGH

## Summary

Phase 3 requires implementing a real-time draft state machine that enforces League of Legends professional draft rules with proper turn sequencing, ban phase modeling, side selection, validation, and API endpoints achieving <200ms response times.

**Key Discovery:** In 2026, LoL esports introduced the "First Selection" system, fundamentally changing how side selection and draft order work. Teams now choose EITHER side (blue/red) OR pick order (first/second), with the opponent getting the remaining option. This creates new strategic depth and reduces historical blue side advantage.

**Primary recommendation:** Implement draft state machine using Zustand for client state + Supabase Broadcast for real-time sync, avoiding heavyweight state machine libraries (XState) in favor of simple turn-based validation with guard functions. Pre-compute analytics queries to achieve <200ms API responses.

## Standard Stack

The established libraries/tools for real-time draft state management:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.2 | Client state management | Minimal boilerplate (1.2kb), Immer middleware for immutable updates, perfect for turn-based state |
| Supabase Realtime | Latest (cloud) | Real-time sync via WebSocket | 6-28ms median latency, 224K msgs/sec throughput, Broadcast channels for ephemeral draft updates |
| @supabase/supabase-js | 2.50.0 (installed) | Supabase client library | Official client with TypeScript support, handles auth/realtime/database |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.24.1 (installed) | Runtime validation | Validate draft actions, turn transitions, API payloads |
| Immer | 11.0.0 | Immutable state updates | Use with Zustand middleware for clean state mutations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | Redux Toolkit | Redux adds 11kb bundle + boilerplate; overkill for draft state |
| Zustand | XState | XState adds complexity + 50kb bundle; better for complex multi-step flows, too heavy for 20-turn sequence |
| Supabase Broadcast | Socket.io | Would require separate WebSocket server deployment, more complexity |
| Supabase Broadcast | Polling | Higher latency (1000ms vs 50ms), wasteful for real-time updates |

**Installation:**
```bash
# Already installed in package.json
npm install zustand@5.0.2 immer@11.0.0
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── draft/
│   ├── [id]/
│   │   ├── page.tsx              # Server Component: fetch initial state
│   │   └── draft-simulator.tsx   # Client Component: real-time UI
│   ├── new/
│   │   └── page.tsx              # Create draft with team/side selection
│   └── actions.ts                # Server Actions for mutations
├── api/
│   └── draft/
│       └── [id]/
│           └── route.ts          # GET draft state, recommendations
store/
└── draft-store.ts                # Zustand store with state machine logic
lib/
├── draft/
│   ├── state-machine.ts          # Turn sequencing, validation guards
│   ├── turn-order.ts             # LoL professional draft order (2026 rules)
│   └── validators.ts             # Illegal action detection
└── supabase/
    ├── client.ts                 # Client-side Supabase
    └── server.ts                 # Server-side Supabase
```

### Pattern 1: Draft State Machine (Zustand + Immer)
**What:** Centralized draft state with immutable updates via Immer middleware
**When to use:** All draft state mutations (picks, bans, turn progression)
**Example:**
```typescript
// store/draft-store.ts
// Source: Zustand + Immer pattern from https://github.com/pmndrs/zustand
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type DraftPhase = 'ban1' | 'pick1' | 'ban2' | 'pick2' | 'complete'
type DraftSide = 'blue' | 'red'

interface DraftState {
  // State
  draftId: string | null
  blueBans: string[]
  redBans: string[]
  bluePicks: Array<{ champion: string; role: string; pickOrder: number }>
  redPicks: Array<{ champion: string; role: string; pickOrder: number }>
  currentPhase: DraftPhase
  currentTurn: number // 1-20
  selectedSide: DraftSide | null // Which side user controls

  // Computed
  availableChampions: () => string[]
  isUserTurn: () => boolean

  // Actions
  initializeDraft: (id: string, side: DraftSide, initialState?: any) => void
  addPick: (champion: string, role: string) => void
  addBan: (champion: string) => void
  resetDraft: () => void
}

export const useDraftStore = create<DraftState>()(
  immer((set, get) => ({
    draftId: null,
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: [],
    currentPhase: 'ban1',
    currentTurn: 1,
    selectedSide: null,

    availableChampions: () => {
      const state = get()
      const bannedChampions = new Set([...state.blueBans, ...state.redBans])
      const pickedChampions = new Set([
        ...state.bluePicks.map(p => p.champion),
        ...state.redPicks.map(p => p.champion)
      ])
      return ALL_CHAMPIONS.filter(c => !bannedChampions.has(c) && !pickedChampions.has(c))
    },

    isUserTurn: () => {
      const state = get()
      const turnSide = getCurrentTurnSide(state.currentTurn)
      return turnSide === state.selectedSide
    },

    initializeDraft: (id, side, initialState) =>
      set((state) => {
        state.draftId = id
        state.selectedSide = side
        if (initialState) {
          state.blueBans = initialState.blueBans || []
          state.redBans = initialState.redBans || []
          state.bluePicks = initialState.bluePicks || []
          state.redPicks = initialState.redPicks || []
          state.currentTurn = initialState.currentTurn || 1
          state.currentPhase = initialState.currentPhase || 'ban1'
        }
      }),

    addPick: (champion, role) =>
      set((state) => {
        const turnSide = getCurrentTurnSide(state.currentTurn)
        const pickOrder = calculatePickOrder(state.currentTurn)

        if (turnSide === 'blue') {
          state.bluePicks.push({ champion, role, pickOrder })
        } else {
          state.redPicks.push({ champion, role, pickOrder })
        }

        state.currentTurn += 1
        state.currentPhase = determinePhase(state.currentTurn)
      }),

    addBan: (champion) =>
      set((state) => {
        const turnSide = getCurrentTurnSide(state.currentTurn)

        if (turnSide === 'blue') {
          state.blueBans.push(champion)
        } else {
          state.redBans.push(champion)
        }

        state.currentTurn += 1
        state.currentPhase = determinePhase(state.currentTurn)
      }),

    resetDraft: () =>
      set((state) => {
        state.blueBans = []
        state.redBans = []
        state.bluePicks = []
        state.redPicks = []
        state.currentTurn = 1
        state.currentPhase = 'ban1'
      })
  }))
)
```

### Pattern 2: Turn Order and Phase Detection
**What:** Pure functions that define LoL professional draft sequence
**When to use:** Computing current turn's side/action, detecting phase transitions
**Example:**
```typescript
// lib/draft/turn-order.ts
// Based on 2026 LoL professional draft rules

type TurnAction = 'ban' | 'pick'
type TurnSide = 'blue' | 'red'

interface TurnInfo {
  turnNumber: number
  side: TurnSide
  action: TurnAction
  phase: DraftPhase
  pickOrder?: number // 1-10 for picks only
}

// LoL Professional Draft Order (20 turns total)
// Ban Phase 1 (6 turns): B-ban, R-ban, B-ban, R-ban, B-ban, R-ban
// Pick Phase 1 (6 turns): B1, R1, R2, B2, B3, R3
// Ban Phase 2 (4 turns): R-ban, B-ban, R-ban, B-ban
// Pick Phase 2 (4 turns): R4, B4, B5, R5
const DRAFT_SEQUENCE: TurnInfo[] = [
  // Ban Phase 1 (3 bans per side)
  { turnNumber: 1, side: 'blue', action: 'ban', phase: 'ban1' },
  { turnNumber: 2, side: 'red', action: 'ban', phase: 'ban1' },
  { turnNumber: 3, side: 'blue', action: 'ban', phase: 'ban1' },
  { turnNumber: 4, side: 'red', action: 'ban', phase: 'ban1' },
  { turnNumber: 5, side: 'blue', action: 'ban', phase: 'ban1' },
  { turnNumber: 6, side: 'red', action: 'ban', phase: 'ban1' },

  // Pick Phase 1 (snake: B1, R1-R2, B2-B3, R3)
  { turnNumber: 7, side: 'blue', action: 'pick', phase: 'pick1', pickOrder: 1 },
  { turnNumber: 8, side: 'red', action: 'pick', phase: 'pick1', pickOrder: 2 },
  { turnNumber: 9, side: 'red', action: 'pick', phase: 'pick1', pickOrder: 3 },
  { turnNumber: 10, side: 'blue', action: 'pick', phase: 'pick1', pickOrder: 4 },
  { turnNumber: 11, side: 'blue', action: 'pick', phase: 'pick1', pickOrder: 5 },
  { turnNumber: 12, side: 'red', action: 'pick', phase: 'pick1', pickOrder: 6 },

  // Ban Phase 2 (2 bans per side)
  { turnNumber: 13, side: 'red', action: 'ban', phase: 'ban2' },
  { turnNumber: 14, side: 'blue', action: 'ban', phase: 'ban2' },
  { turnNumber: 15, side: 'red', action: 'ban', phase: 'ban2' },
  { turnNumber: 16, side: 'blue', action: 'ban', phase: 'ban2' },

  // Pick Phase 2 (snake continues: R4, B4-B5, R5)
  { turnNumber: 17, side: 'red', action: 'pick', phase: 'pick2', pickOrder: 7 },
  { turnNumber: 18, side: 'blue', action: 'pick', phase: 'pick2', pickOrder: 8 },
  { turnNumber: 19, side: 'blue', action: 'pick', phase: 'pick2', pickOrder: 9 },
  { turnNumber: 20, side: 'red', action: 'pick', phase: 'pick2', pickOrder: 10 },
]

export function getCurrentTurnInfo(turnNumber: number): TurnInfo {
  if (turnNumber < 1 || turnNumber > 20) {
    throw new Error(`Invalid turn number: ${turnNumber}. Must be 1-20.`)
  }
  return DRAFT_SEQUENCE[turnNumber - 1]
}

export function getCurrentTurnSide(turnNumber: number): TurnSide {
  return getCurrentTurnInfo(turnNumber).side
}

export function getCurrentTurnAction(turnNumber: number): TurnAction {
  return getCurrentTurnInfo(turnNumber).action
}

export function determinePhase(turnNumber: number): DraftPhase {
  if (turnNumber > 20) return 'complete'
  return getCurrentTurnInfo(turnNumber).phase
}

export function calculatePickOrder(turnNumber: number): number | undefined {
  return getCurrentTurnInfo(turnNumber).pickOrder
}
```

### Pattern 3: Validation Guards
**What:** Pure predicate functions that prevent illegal draft actions
**When to use:** Before any pick/ban mutation, validate legality
**Example:**
```typescript
// lib/draft/validators.ts
// Guard pattern from state machine best practices

interface ValidationResult {
  valid: boolean
  error?: string
}

export function canPickChampion(
  champion: string,
  draftState: DraftState
): ValidationResult {
  // Guard 1: Champion must be available (not banned)
  const isBanned = [...draftState.blueBans, ...draftState.redBans].includes(champion)
  if (isBanned) {
    return { valid: false, error: `${champion} is banned` }
  }

  // Guard 2: Champion must not be already picked
  const isPicked = [
    ...draftState.bluePicks.map(p => p.champion),
    ...draftState.redPicks.map(p => p.champion)
  ].includes(champion)
  if (isPicked) {
    return { valid: false, error: `${champion} is already picked` }
  }

  // Guard 3: Must be a pick phase
  const currentAction = getCurrentTurnAction(draftState.currentTurn)
  if (currentAction !== 'pick') {
    return { valid: false, error: `Current turn is ban phase, not pick phase` }
  }

  // Guard 4: Turn must not exceed 20
  if (draftState.currentTurn > 20) {
    return { valid: false, error: 'Draft is complete' }
  }

  return { valid: true }
}

export function canBanChampion(
  champion: string,
  draftState: DraftState
): ValidationResult {
  // Guard 1: Must be a ban phase
  const currentAction = getCurrentTurnAction(draftState.currentTurn)
  if (currentAction !== 'ban') {
    return { valid: false, error: `Current turn is pick phase, not ban phase` }
  }

  // Guard 2: Champion must not be already banned
  const isBanned = [...draftState.blueBans, ...draftState.redBans].includes(champion)
  if (isBanned) {
    return { valid: false, error: `${champion} is already banned` }
  }

  // Guard 3: Turn must not exceed 20
  if (draftState.currentTurn > 20) {
    return { valid: false, error: 'Draft is complete' }
  }

  return { valid: true }
}

export function validateDraftAction(
  action: 'pick' | 'ban',
  champion: string,
  draftState: DraftState
): ValidationResult {
  if (action === 'pick') {
    return canPickChampion(champion, draftState)
  } else {
    return canBanChampion(champion, draftState)
  }
}
```

### Pattern 4: Supabase Realtime Broadcast Integration
**What:** Ephemeral real-time updates via Broadcast channels (not database changes)
**When to use:** Draft pick/ban actions that need instant sync across clients
**Example:**
```typescript
// app/draft/[id]/draft-simulator.tsx
// Source: Supabase Broadcast pattern from https://supabase.com/docs/guides/realtime/broadcast
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDraftStore } from '@/store/draft-store'

export default function DraftSimulator({ initialState, draftId }: Props) {
  const supabase = createClient()
  const { initializeDraft, addPick, addBan } = useDraftStore()

  useEffect(() => {
    initializeDraft(draftId, initialState.selectedSide, initialState)

    // Subscribe to Broadcast channel for real-time updates
    const channel = supabase
      .channel(`draft:${draftId}`)
      .on('broadcast', { event: 'pick' }, (payload) => {
        // Instant update: no database lag
        addPick(payload.champion, payload.role)
      })
      .on('broadcast', { event: 'ban' }, (payload) => {
        addBan(payload.champion)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [draftId])

  const handlePick = async (champion: string, role: string) => {
    const draftState = useDraftStore.getState()

    // Validate before sending
    const validation = canPickChampion(champion, draftState)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    // Optimistic update
    addPick(champion, role)

    // Broadcast to other clients (50-100ms latency)
    await channel.send({
      type: 'broadcast',
      event: 'pick',
      payload: { champion, role, timestamp: Date.now() }
    })

    // Optional: Persist to database (for history)
    await fetch(`/api/draft/${draftId}/pick`, {
      method: 'POST',
      body: JSON.stringify({ champion, role })
    })
  }

  return (
    <div>
      {/* Draft UI */}
    </div>
  )
}
```

### Pattern 5: API Route Optimization for <200ms Response
**What:** Pre-computed analytics + indexed queries + caching
**When to use:** GET /api/draft/[id] endpoint that returns recommendations
**Example:**
```typescript
// app/api/draft/[id]/route.ts
// Based on Vercel optimization best practices

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const draftId = params.id

  // Target: <200ms response time
  const startTime = Date.now()

  // Strategy 1: Single query with joins (not multiple round-trips)
  const { data: draft, error } = await supabase
    .from('synapse.drafts')
    .select(`
      *,
      blue_team:synapse.teams!blue_team_id(*),
      red_team:synapse.teams!red_team_id(*)
    `)
    .eq('id', draftId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  // Strategy 2: Pre-computed recommendations (not real-time calculation)
  // These are computed in Phase 2 and stored in database
  const { data: recommendations } = await supabase
    .rpc('get_draft_recommendations', {
      p_draft_id: draftId,
      p_current_turn: draft.current_turn
    })

  const elapsed = Date.now() - startTime

  return NextResponse.json({
    draft,
    recommendations,
    meta: {
      responseTime: elapsed // Monitor performance
    }
  }, {
    headers: {
      'Cache-Control': 'private, max-age=10' // 10s cache for active drafts
    }
  })
}

// Supabase RPC function (defined in migration)
// CREATE OR REPLACE FUNCTION get_draft_recommendations(
//   p_draft_id UUID,
//   p_current_turn INT
// )
// RETURNS TABLE(champion TEXT, score DECIMAL, reasoning TEXT)
// LANGUAGE plpgsql
// AS $$
// BEGIN
//   -- Pre-computed synergy/matchup scores from Phase 2
//   RETURN QUERY
//   SELECT cs.champion_name, cs.score, cs.reasoning
//   FROM synapse.champion_recommendations cs
//   WHERE cs.context = 'draft'
//   ORDER BY cs.score DESC
//   LIMIT 5;
// END;
// $$;
```

### Anti-Patterns to Avoid

- **Heavy State Machine Libraries (XState):** Adds 50kb bundle + complexity for simple 20-turn sequence. Use plain functions instead.
- **Database Changes for Real-time:** Supabase Postgres Changes have 150-300ms latency. Use Broadcast (50-100ms) for live updates.
- **Real-time Analytics Calculation:** Computing synergies/matchups on each turn adds 500-2000ms. Pre-compute in Phase 2.
- **Multiple API Round-trips:** Each fetch adds 50-100ms. Use single query with joins and RPC functions.
- **Client-side Turn Validation Only:** Always validate server-side to prevent cheating/bugs.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Immutable state updates | Manual object spreading | Immer middleware | Deeply nested state causes bugs; Immer handles it safely |
| WebSocket connections | Socket.io server | Supabase Realtime Broadcast | Requires separate server deployment; Supabase is managed |
| State machine library | Custom FSM class | Plain functions + Zustand | 20-turn sequence is simple; XState is overkill (50kb) |
| Real-time database sync | Manual polling | Supabase Postgres Changes | Polling wastes resources; Postgres Changes are built-in |
| Turn order calculation | Array lookups | Pre-defined turn sequence | Draft order never changes; hardcode it once |

**Key insight:** Draft state is simple turn-based logic (20 turns, 2 actions). Heavy abstractions (XState, Redux Saga) add complexity without benefits. Zustand + plain validation functions are sufficient.

## Common Pitfalls

### Pitfall 1: Treating Draft as Stateless (PITFALL-2 from PITFALLS.md)
**What goes wrong:** Recommending counter-picks on Blue 1 (first turn) when no enemy picks exist yet. Demo looks strategically nonsensical.
**Why it happens:** Not modeling turn context; treating draft as "pick 5 champions" instead of sequential 20-turn state machine.
**How to avoid:**
  1. Model draft as explicit state machine with currentTurn (1-20) and currentPhase
  2. Compute turn side/action using DRAFT_SEQUENCE lookup table
  3. Context-aware recommendations: early picks favor flex, late picks favor counters
  4. Always check turn number before returning recommendations
**Warning signs:**
  - Recommendations don't change based on turn number
  - Suggesting "counter Sejuani" when Sejuani isn't picked yet
  - Ban recommendations during pick phase

### Pitfall 2: Supabase Broadcast Not Cleaning Up Channels
**What goes wrong:** WebSocket connections leak on page navigation. After 10 page changes, 10 channels are open, hitting quota limits.
**Why it happens:** React useEffect without cleanup function; channels stay subscribed after unmount.
**How to avoid:**
  1. Always return cleanup function from useEffect: `return () => supabase.removeChannel(channel)`
  2. Use single channel per draft, not multiple channels per component
  3. Monitor active channels in Supabase dashboard during development
**Warning signs:**
  - Realtime quota warnings in Supabase dashboard
  - Duplicate messages received on single action
  - Memory leaks in Chrome DevTools

### Pitfall 3: Validation Only on Client-Side
**What goes wrong:** User bypasses client validation via browser DevTools, picks banned champion. Server accepts invalid state.
**Why it happens:** Trusting client state; no server-side guard functions.
**How to avoid:**
  1. Duplicate all validation on server (API routes and Server Actions)
  2. Use Zod schemas for payload validation
  3. Server always re-checks: is champion banned? is it correct turn? is draft complete?
  4. Return validation errors with HTTP 400, not 200
**Warning signs:**
  - Demo allows picking banned champions via console commands
  - API accepts invalid payloads without errors
  - Draft state becomes inconsistent between clients

### Pitfall 4: API Response Time >200ms (PITFALL-6 from PITFALLS.md)
**What goes wrong:** Vercel API routes timeout at 10s (Hobby) or return slowly, breaking <200ms target. Demo feels laggy.
**Why it happens:** Calculating synergies/matchups on-the-fly; missing database indexes; multiple sequential queries.
**How to avoid:**
  1. Pre-compute all analytics in Phase 2 (champion stats, synergies, matchups)
  2. Store recommendations in database tables, not calculate at runtime
  3. Use single query with joins, not N+1 queries
  4. Add indexes on frequently queried columns (draft_id, champion_name, patch_version)
  5. Use Supabase RPC functions (plpgsql) for complex queries (runs in database, not API)
  6. Monitor response time with `Date.now()` logging
**Warning signs:**
  - API routes take 500-2000ms in development
  - Multiple sequential database queries in single endpoint
  - Calculating win rates from raw data on every request

### Pitfall 5: First Selection System Not Implemented (2026 Rule Change)
**What goes wrong:** Demo shows "Blue Side + First Pick" together, but 2026 rules require choosing ONE. Judges notice outdated mechanics.
**Why it happens:** Using pre-2026 draft rules; not researching current professional format.
**How to avoid:**
  1. Implement side selection UI: "Choose Blue Side OR First Pick"
  2. Show opponent's automatic choice: "You chose Blue Side → Opponent gets First Pick"
  3. Track `first_selection_choice` in draft state ('side' or 'pick_order')
  4. Adjust turn order based on choice (if opponent gets first pick, flip B1/R1)
  5. Display First Selection in draft UI for transparency
**Warning signs:**
  - Blue side always gets first pick (2025 rules)
  - No UI element for choosing side vs pick order
  - Demo doesn't reflect 2026 professional format

## Code Examples

Verified patterns from official sources:

### Zustand Store with Immer Middleware
```typescript
// Source: https://github.com/pmndrs/zustand
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface BearState {
  bears: number
  addBear: () => void
}

const useBearStore = create<BearState>()(
  immer((set) => ({
    bears: 0,
    addBear: () => set((state) => {
      state.bears += 1 // Mutable syntax, immutable result
    })
  }))
)
```

### Supabase Broadcast Channel
```typescript
// Source: https://supabase.com/docs/guides/realtime/broadcast
const channel = supabase.channel('room1')
  .on('broadcast', { event: 'cursor-pos' }, (payload) => {
    console.log('Cursor position received:', payload)
  })
  .subscribe()

// Send broadcast
await channel.send({
  type: 'broadcast',
  event: 'cursor-pos',
  payload: { x: 100, y: 200 }
})
```

### Vercel API Route with Caching
```typescript
// Source: Next.js 16 Route Handlers
export async function GET(request: NextRequest) {
  const data = await fetchData()

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=10, stale-while-revalidate=59'
    }
  })
}
```

### Guard Function Pattern
```typescript
// Source: State machine validation best practices
function canTransition(
  from: State,
  to: State,
  context: Context
): boolean {
  // Pure predicate: no side effects
  if (from === 'draft' && to === 'published') {
    return context.hasAuthorApproval && context.publishDate < Date.now()
  }
  return false
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Blue side gets side + first pick | First Selection: choose side OR pick order | 2026 season | Teams must choose strategic priority; reduces blue side advantage |
| Supabase Postgres Changes for real-time | Supabase Broadcast for ephemeral updates | 2024 | 3x faster latency (50ms vs 150ms); less database load |
| XState for all state machines | Plain functions for simple sequences | 2023+ | Reduced bundle size; simpler code for turn-based games |
| Redux for all state | Zustand for UI state | 2022+ | 90% less boilerplate; 10x smaller bundle |

**Deprecated/outdated:**
- **Socket.io for WebSockets:** Supabase Realtime replaces it for managed infrastructure
- **Redux Saga for async state:** Server Actions in Next.js 16 are simpler
- **Client-side only validation:** Always validate server-side (security + consistency)

## Open Questions

Things that couldn't be fully resolved:

1. **First Selection Turn Order Implementation**
   - What we know: 2026 rules allow choosing side OR pick order
   - What's unclear: If opponent gets first pick, does turn sequence flip completely (R1, B1-B2, etc.)?
   - Recommendation: Research official LoL esports rulebook; for MVP, implement standard order with side choice only

2. **Supabase Broadcast Scalability**
   - What we know: 224K msgs/sec, 32K concurrent users benchmarked
   - What's unclear: Will free tier handle 10-50 concurrent demo users during hackathon judging?
   - Recommendation: Monitor Realtime quota in Supabase dashboard; implement polling fallback if quota hit

3. **API Response Time with Cold Starts**
   - What we know: Vercel Serverless Functions have 200-500ms cold start
   - What's unclear: Will first API request exceed 200ms target?
   - Recommendation: Pre-warm API before demo; use Vercel preview deployment (stays warm longer)

## Sources

### Primary (HIGH confidence)
- [League of Legends Wiki - Draft Pick](https://wiki.leagueoflegends.com/en-us/Draft_Pick) - Official draft rules
- [Mobalytics - Picks and Bans Guide](https://mobalytics.gg/blog/picks-bans-guide/) - Ban phase explanation
- [Dot Esports - First Selection 2026](https://dotesports.com/league-of-legends/news/league-of-legends-esports-first-stand-2026-format-changes-first-selection) - 2026 rule changes
- [Esports Insider - Side Selection Revamp](https://esportsinsider.com/2026/01/league-of-legends-side-selection-draft-order-revamp) - First Selection details
- [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks) - Performance metrics
- [Supabase Broadcast Docs](https://supabase.com/docs/guides/realtime/broadcast) - Official Broadcast API
- [Zustand GitHub](https://github.com/pmndrs/zustand) - Official Zustand repository

### Secondary (MEDIUM confidence)
- [Medium - Zustand with Supabase](https://medium.com/@ozergklp/how-to-use-zustand-with-supabase-and-next-js-app-router-0473d6744abc) - Integration pattern
- [Vercel Optimization Guide](https://dev.to/pipipi-dev/vercel-optimization-reducing-build-time-and-improving-response-2eji) - Response time tips
- [XState Documentation](https://stately.ai/docs/xstate) - State machine library reference
- [State Machine Pattern - TypeScript](https://refactoring.guru/design-patterns/state/typescript/example) - Design pattern examples

### Tertiary (LOW confidence)
- WebSearch findings on blue/red side win rates - Community discussions, not official Riot data

## Metadata

**Confidence breakdown:**
- LoL draft order and 2026 rules: HIGH - Multiple official sources confirm First Selection system
- Zustand + Supabase integration: HIGH - Official documentation and production examples
- API optimization strategies: MEDIUM - Community best practices, not official Vercel benchmarks
- State machine patterns: HIGH - Well-established design patterns with official library support
- Blue/red side advantage: MEDIUM - Historical data, but 2026 changes may shift balance

**Research date:** 2026-01-30
**Valid until:** 30 days (until 2026-03-01) - Draft rules stable, but monitor for mid-season patches

---

**Next Step:** Phase 3 planning can now create PLAN.md files with specific tasks for:
1. Draft state machine implementation (Zustand store)
2. Turn order and validation logic
3. Supabase Realtime Broadcast integration
4. API routes with <200ms optimization
5. Side selection UI (2026 First Selection rules)
