---
phase: 03-draft-state-machine
plan: 02
subsystem: validation
tags: [zustand, immer, validation, guard-functions, type-safety]

# Dependency graph
requires:
  - phase: 03-01
    provides: DraftState, DraftTurn, DraftAction types and sequence lookup
provides:
  - Pure guard functions for draft rule validation (isChampionAvailable, isBanPhase, canBan, canPick)
  - Typed validation system with error codes for UI feedback
  - Zustand store integration with validation error tracking
affects: [03-03-ui, 04-ai-engine]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-guard-functions, discriminated-union-validation, type-safe-error-handling]

key-files:
  created: [lib/draft/guards.ts, lib/draft/validation.ts]
  modified: [lib/draft/store.ts]

key-decisions:
  - "Guard functions are pure predicates for testability and client/server portability"
  - "ValidationErrorCode enum enables internationalization and specific UI feedback"
  - "Type narrowing with 'valid === false' for proper discriminated union handling"
  - "Store tracks lastValidationError for UI display without prop drilling"

patterns-established:
  - "Pattern 1: Guards are single-purpose predicates (isX, canX, hasX naming)"
  - "Pattern 2: Validation returns discriminated union (valid: true | valid: false + error)"
  - "Pattern 3: Error objects include helpful details for debugging and UX"

# Metrics
duration: 6min
completed: 2026-01-30
---

# Phase 3 Plan 2: Validation Logic Summary

**Pure guard functions with typed validation system prevent illegal draft actions, integrated into Zustand store with error tracking**

## Performance

- **Duration:** 6 minutes
- **Started:** 2026-01-30T08:08:09Z
- **Completed:** 2026-01-30T08:15:12Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Pure guard functions validate all draft rules (champion availability, phase matching, turn ownership)
- Typed validation system with 9 error codes for specific UI feedback
- Zustand store validates actions before execution and tracks validation errors
- All validation logic is pure and works client-side or server-side

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pure guard functions** - `78548b4` (feat)
   - isChampionAvailable, isChampionBanned, isChampionPicked
   - isBanPhase, isPickPhase, isDraftComplete
   - isSideTurn, isUserTurn, isDraftStarted
   - canBan, canPick, canExecuteAction composite guards

2. **Task 2: Create validation result types and validateAction** - `6294e96` (feat)
   - ValidationErrorCode enum (CHAMPION_NOT_AVAILABLE, WRONG_PHASE, NOT_YOUR_TURN, etc.)
   - ValidationResult discriminated union
   - validateAction composes guards with typed error responses
   - validateBanAction and validatePickAction helpers

3. **Task 3: Integrate validation with store** - `d152a8b` (feat)
   - executeBan/executePick call validateAction before execution
   - lastValidationError field tracks rejected actions
   - getLastError accessor for UI error display
   - Console warnings for debugging

## Files Created/Modified

- `lib/draft/guards.ts` - 12 pure guard functions for draft rules
- `lib/draft/validation.ts` - Validation system with error codes and validateAction
- `lib/draft/store.ts` - Integrated validation with error tracking

## Decisions Made

- **Pure guard functions:** All guards are pure predicates with no side effects, enabling testing and use in both client and server contexts
- **Error code enum:** ValidationErrorCode provides stable identifiers for internationalization and specific UI feedback patterns
- **Discriminated union:** ValidationResult uses TypeScript discriminated unions for type-safe error handling
- **Error tracking in store:** Store maintains lastValidationError for UI display without prop drilling through components
- **Type narrowing:** Using `valid === false` instead of `!result.valid` ensures proper TypeScript type narrowing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **TypeScript type narrowing:** Initial implementation using `!result.valid` didn't properly narrow the discriminated union type. Fixed by using explicit `valid === false` check, which TypeScript correctly narrows.

## Next Phase Readiness

- Validation system complete and tested
- Ready for UI integration (Plan 03-03) - can display specific error messages to users
- Ready for AI engine (Phase 04) - can validate recommended actions before execution
- All guard functions are pure and portable (work client-side and server-side)

---
*Phase: 03-draft-state-machine*
*Completed: 2026-01-30*
