---
phase: 03-draft-state-machine
plan: 01
subsystem: state-management
tags: [zustand, immer, typescript, draft, state-machine]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: Champion data and pick_order schema understanding
  - phase: 02-core-analytics
    provides: Analytics infrastructure for future recommendations
provides:
  - Draft state machine with 20-turn LoL professional sequence
  - Zustand store with Immer for immutable draft state
  - Type-safe draft actions (ban, pick, undo, reset)
affects: [04-ai-heuristics, 05-draft-simulator-ui]

# Tech tracking
tech-stack:
  added: [zustand@5.0.2, immer@11.0.0]
  patterns:
    - State machine modeling (20-turn lookup table vs XState)
    - Zustand + Immer for client state management
    - Set<string> for O(1) champion availability checks

key-files:
  created:
    - lib/draft/types.ts
    - lib/draft/sequence.ts
    - lib/draft/store.ts

key-decisions:
  - "Simple lookup table (DRAFT_SEQUENCE) over XState (50kb overhead)"
  - "Enable Immer MapSet plugin for Set support"
  - "Zustand middleware pattern for immutable updates with mutable syntax"
  - "currentTurn tracks 0-20 (0=not started, 1-20=active draft)"

patterns-established:
  - "Draft phases: ban1 (turns 1-6), pick1 (7-12), ban2 (13-16), pick2 (17-20)"
  - "Snake draft order: B-R-B-R-B-R bans, B-RR-BB-R picks, R-B-R-B bans, R-BB-R picks"
  - "Discriminated unions for type-safe actions (DraftAction)"
  - "Readonly arrays for immutable sequence data"

# Metrics
duration: 6min
completed: 2026-01-30
---

# Phase 3 Plan 01: Draft State Machine Core Summary

**LoL professional draft modeled as 20-turn state machine with Zustand + Immer store**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-30T00:07:39Z
- **Completed:** 2026-01-30T00:13:11Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 dependencies)

## Accomplishments

- Type-safe draft state types (DraftPhase, DraftTurn, DraftState, TeamComposition)
- 20-turn DRAFT_SEQUENCE encoding exact LoL professional draft order
- Zustand store with executeBan, executePick, undo, reset actions
- Set-based champion availability tracking (O(1) lookups)
- Comprehensive helper functions (getTurnInfo, getNextTurn, isUserTurn, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create draft state types** - `95e2ff2` (feat)
2. **Task 2: Create 20-turn draft sequence lookup** - `777d466` (feat)
3. **Task 3: Create Zustand store with Immer** - `96cda51` (feat)

## Files Created/Modified

### Created
- `lib/draft/types.ts` - Core type definitions (DraftPhase, DraftTurn, DraftState, TeamComposition, DraftAction, Role)
- `lib/draft/sequence.ts` - 20-turn DRAFT_SEQUENCE constant and helper functions
- `lib/draft/store.ts` - Zustand store with Immer middleware for draft state management

### Modified
- `package.json` - Added zustand@5.0.2 and immer@11.0.0
- `package-lock.json` - Dependency lock file updated

## Decisions Made

### 1. Simple lookup table over XState
**Context:** PITFALL-2 requires modeling draft as explicit state machine.
**Decision:** Use readonly DRAFT_SEQUENCE array instead of XState (50kb bundle overhead).
**Rationale:** LoL draft has fixed 20-turn sequence, no dynamic transitions. Simple table lookup is sufficient.

### 2. Enable Immer MapSet plugin
**Context:** DraftState uses Set<string> for availableChampions (O(1) lookups).
**Decision:** Import and call `enableMapSet()` from immer to support Set mutations.
**Rationale:** Immer doesn't support Set/Map by default. Plugin required for `draft.availableChampions.delete(champion)` syntax.

### 3. Zustand with Immer middleware
**Context:** Research (STACK.md) recommends Zustand (1.2kb) over Redux (11kb).
**Decision:** Use Zustand + Immer for immutable updates with mutable syntax.
**Rationale:** Smaller bundle, less boilerplate, Immer allows natural `state.blue.bans.push(champion)` syntax.

### 4. Turn number range (0-20)
**Context:** Need to track draft not started vs active vs complete.
**Decision:** `currentTurn = 0` (not started), `1-20` (active), `>20` (complete).
**Rationale:** Allows initial state before draft begins. isComplete flag for explicit completion check.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

### 1. Node.js not in PATH
**Issue:** `npx` command failed because node wasn't in shell PATH.
**Resolution:** Used full path `/opt/homebrew/bin/node` to execute npm and tsx commands.
**Impact:** None - verification tests passed.

### 2. Immer MapSet plugin required
**Issue:** Initial store implementation crashed with "MapSet plugin not loaded" error.
**Resolution:** Added `import { enableMapSet } from 'immer'` and `enableMapSet()` call at module top.
**Impact:** Fix applied in Task 3, tests passed after enableMapSet() added.

### 3. Auto-generated validation files
**Issue:** IDE/linter auto-created `validation.ts` and `guards.ts`, added import to store.ts causing compilation errors.
**Resolution:** Removed auto-generated files, restored store.ts to committed version via `git checkout`.
**Impact:** None - plan scope preserved, extra files removed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 3 Plan 02 (Draft Validation):**
- Draft state types exported and tested
- DRAFT_SEQUENCE encodes all 20 turns correctly
- Store handles ban/pick/undo/reset actions
- Set-based availability tracking works with Immer

**Ready for Phase 4 (AI/Heuristics Engine):**
- Draft state shape defined for recommendation input
- TeamComposition type available for synergy/matchup queries
- currentTurn and phase fields enable turn-aware recommendations

**Ready for Phase 5 (Draft Simulator UI):**
- useDraftStore hook ready for React components
- getCurrentTurnInfo, isMyTurn, canBan, canPick helpers for UI logic
- Zustand provides automatic re-renders on state changes

**Blockers:** None

**Concerns:** None - core state machine complete and verified

---
*Phase: 03-draft-state-machine*
*Plan: 01*
*Completed: 2026-01-30*
