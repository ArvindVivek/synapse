---
phase: 04-ai-heuristics-engine
plan: 04
subsystem: ai-recommendations
tags: [xai, explainability, reasoning, flex-picks, multi-role, transparency, templates]

# Dependency graph
requires:
  - phase: 04-01
    provides: "Multi-criteria scoring types, ScoreBreakdown, DraftContext, pick-scorer with empty reasoning"
  - phase: 04-01
    provides: "champion-properties.ts with assessTeamNeeds function"
  - phase: 02-01
    provides: "Champion stats with role_confidence for flex detection"
provides:
  - "Template-based XAI reasoning generator with data-backed explanations"
  - "Flex pick detector identifying multi-role champions"
  - "Complete recommendations with human-readable reasoning"
affects: [05-draft-simulator-ui, recommendation-display, user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Template-based XAI for transparent recommendations"
    - "Reasoning thresholds (score >= 0.60) for selective explanations"
    - "Flex detection via role_confidence aggregation"
    - "Performance optimization via flex picks caching"

key-files:
  created:
    - lib/recommendations/reasoning-generator.ts
    - lib/recommendations/flex-detector.ts
  modified:
    - lib/recommendations/pick-scorer.ts

key-decisions:
  - "Reasoning threshold of 0.60 for high-scoring components (filters noise)"
  - "Max 2 reasons per category for concise, scannable output"
  - "Synergy delta >= 0.05 threshold for meaningful synergies"
  - "Flex pick requires 2+ roles with 3+ games each (filters one-off experiments)"
  - "Flexibility score considers both role count and game balance"
  - "Pre-compute flex picks once in scoreAllChampions for performance"

patterns-established:
  - "Template-based reasoning: specific data (WR%, games) not generic statements"
  - "Fallback to generic message if no strong reasons (never empty)"
  - "ReasoningContext separates data from presentation logic"
  - "Flex detection queries champion_stats_computed by role"

# Metrics
duration: 2min
completed: 2026-01-30
---

# Phase 04 Plan 04: Transparent Reasoning & Flex Detection Summary

**Template-based XAI reasoning with specific data (WR%, games), flex pick detection via role analysis, integrated into pick scorer**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-01-30T09:27:05Z
- **Completed:** 2026-01-30T09:29:00Z (estimated)
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Template-based reasoning generator produces human-readable explanations with specific data
- Flex pick detector identifies multi-role champions from role_confidence data
- Pick scorer now returns complete recommendations with populated reasoning
- Performance optimization: flex picks pre-computed once per batch scoring

## Task Commits

Each task was committed atomically:

1. **Task 1: Create template-based reasoning generator** - `e7c4dfa` (feat)
   - generateReasoning with score threshold 0.60
   - Individual generators for synergy, counter, composition, side, flex
   - Specific data in each reason (WR%, games, advantages)

2. **Task 2: Implement flex pick detection** - `9b6f7c0` (feat)
   - detectFlexPicks queries champion_stats_computed
   - scoreFlexPotential with role count and balance factors
   - getFlexPicksForEarlyDraft for strategic early picks

3. **Task 3: Integrate reasoning into pick scorer** - `c8eae99` (feat)
   - Updated calculateFlexScore to use FlexPickInfo
   - scoreChampionForPick builds ReasoningContext and generates reasoning
   - scoreAllChampions pre-computes flex picks (performance)

## Files Created/Modified

- `lib/recommendations/reasoning-generator.ts` - Template-based XAI with 6 generator functions
- `lib/recommendations/flex-detector.ts` - Multi-role champion detection and scoring
- `lib/recommendations/pick-scorer.ts` - Integrated reasoning generation and flex detection

## Decisions Made

**Reasoning thresholds:**
- Score >= 0.60 triggers reason generation (filters low-impact factors)
- Synergy delta >= 0.05 for meaningful synergy reasons (5% win rate difference)
- Max 2 reasons per category prevents overwhelming users

**Flex detection:**
- True flex requires 2+ roles with 3+ games each (filters one-off experiments)
- Flexibility score considers role count + game balance (balanced > one-trick)
- Pre-compute in scoreAllChampions to avoid N database queries

**Integration:**
- assessTeamNeeds imported from champion-properties.ts (not player-predictor.ts)
- flexPicksCache parameter for batch optimization
- ReasoningContext separates scoring data from presentation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all dependencies from 04-01 and Phase 2 were in place as expected.

## Next Phase Readiness

**Ready for Phase 5 (Draft Simulator UI):**
- Pick recommendations include human-readable reasoning for display
- Reasoning is specific and data-backed (not generic)
- Flex picks can be highlighted in early draft UI
- All XAI requirements satisfied

**Integration points for UI:**
- `PickRecommendation.reasoning` array ready for bullet list display
- `FlexPickInfo.viableRoles` for role badge display
- `confidence` levels for visual indicators

**No blockers.**

---
*Phase: 04-ai-heuristics-engine*
*Completed: 2026-01-30*
