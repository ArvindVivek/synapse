---
phase: 02-core-analytics
plan: 03
subsystem: analytics
status: complete
completed: 2026-01-30

# Dependency graph
requires: ["02-01"]
provides:
  - Champion synergy matrix with Bayesian smoothing
  - Archetype-based fallback for rare pairs
  - Synergy query helpers with hierarchical fallback
affects: ["03-*", "04-*"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Hierarchical fallback (direct → archetype → neutral)
    - Self-join aggregation for pair analysis
    - Consistent ordering via CHECK constraint

# File tracking
key-files:
  created:
    - ../lumina/supabase/migrations/20260129000005_synergy_schema.sql
    - scripts/analytics/compute-synergies.ts
    - lib/queries/synergies.ts
  modified: []

# Decisions
decisions:
  - id: synergy-ordering
    choice: "Use CHECK(champion_a < champion_b) constraint"
    rationale: "Prevents duplicate pairs (Sejuani+Ashe vs Ashe+Sejuani)"
    impact: "Ensures consistent lookups and eliminates redundant data"

  - id: archetype-fallback
    choice: "8 archetype categories covering 48 champions"
    rationale: "Provides reasonable estimates for rare pairs without direct data"
    impact: "Recommendation engine can handle any champion pair"

  - id: synergy-threshold
    choice: "Minimum 5 games together for direct synergy data"
    rationale: "Balance between data coverage and statistical reliability"
    impact: "Filters noise while maintaining broad champion pair coverage"

  - id: synergy-delta-metric
    choice: "synergy_delta = smoothed_win_rate - 0.50"
    rationale: "Positive values indicate good synergy, negative indicate anti-synergy"
    impact: "Intuitive metric for recommendation engine scoring"

# Metrics
duration: 4 min
tasks-completed: 3
commits: 3
---

# Phase 2 Plan 3: Champion Synergies Summary

**One-liner:** Champion pair synergies with Bayesian smoothing and archetype fallback for rare pairs

## What Was Built

### 1. Synergy Schema (Migration 20260129000005)

**Tables created:**
- **champion_synergies**: Stores win rates for champion pairs that played together
  - Constraint: `CHECK(champion_a < champion_b)` ensures consistent ordering
  - Columns: games_together, wins_together, raw_win_rate, smoothed_win_rate, synergy_delta
  - Confidence scoring: high/medium/low/insufficient based on sample size
  - Wilson confidence intervals for statistical reliability

- **champion_archetypes**: Maps champions to archetypes for fallback
  - 8 archetype categories: engage_tank, poke_mage, control_mage, assassin, scaling_adc, utility_adc, enchanter, bruiser, tank, skirmisher
  - damage_type: physical/magic/mixed for damage composition analysis

- **archetype_synergies**: Aggregated synergies between archetype pairs
  - Used as fallback when direct champion pair data is insufficient
  - Computed from averaging champion pair synergies

**Indexes:**
- `idx_synergies_lookup`: Composite index on (champion_a, champion_b, patch_version)
- `idx_synergies_champion_a`, `idx_synergies_champion_b`: Individual champion lookups
- `idx_archetypes_champion`: Fast archetype lookup for fallback

### 2. Synergy Computation Script

**Algorithm:**
1. Self-join champion_picks on (draft_id, team_side) to find teammates
2. Generate all pairs (combinations) from each team composition
3. Aggregate: games_together, wins_together per (champion_a, champion_b, patch)
4. Filter: Only pairs with 5+ games together
5. Apply Bayesian smoothing (prior: 50% win rate, weight: 10 games)
6. Calculate synergy_delta = smoothed_win_rate - 0.50
7. Assign confidence level and Wilson confidence intervals

**Archetype seeding:**
- 48 champions seeded across 8 archetype categories
- Examples:
  - engage_tank: Sejuani, Nautilus, Leona, Maokai, Rell, Amumu
  - scaling_adc: Jinx, Tristana, Kog'Maw, Aphelios, Zeri
  - enchanter: Lulu, Janna, Soraka, Nami, Renata Glasc

**Archetype aggregation:**
- Groups champion synergies by archetype pairs
- Averages smoothed win rates for fallback estimates

### 3. Synergy Query Helpers

**Three-tier fallback hierarchy:**

1. **Direct lookup** (getSynergyScore):
   - Query champion_synergies for exact pair
   - Returns: games_together, smoothed_win_rate, synergy_delta, confidence, CI bounds
   - Source: 'direct'

2. **Archetype fallback**:
   - If no direct data, lookup archetypes for both champions
   - Query archetype_synergies for archetype pair
   - Source: 'archetype', confidence: 'archetype_fallback'

3. **Neutral assumption**:
   - If no archetype data, return neutral baseline
   - smoothed_win_rate: 0.50, synergy_delta: 0
   - Source: 'neutral', confidence: 'insufficient'

**Helper functions:**
- `getSynergyScore(champA, champB, patch)`: Single pair lookup with fallback
- `getChampionSynergies(champ, patch, limit)`: Top N synergies for a champion
- `getTeamSynergies(team, candidate, patch)`: Aggregate synergy with team composition

**Type safety:**
- SynergyScore interface with source indicator ('direct' | 'archetype' | 'neutral')
- Confidence levels: 'high' | 'medium' | 'low' | 'insufficient' | 'archetype_fallback'

## Technical Decisions

### Consistent Pair Ordering
**Decision:** Enforce `champion_a < champion_b` via CHECK constraint

**Rationale:**
- Prevents duplicates (Sejuani+Ashe vs Ashe+Sejuani are the same pair)
- Simplifies queries (only one lookup needed)
- Reduces storage by 50%

**Implementation:**
```sql
CHECK(champion_a < champion_b)  -- Alphabetical ordering
```

All query functions ensure consistent ordering before lookup.

### Archetype Fallback System
**Decision:** 8 archetype categories covering 48 champions

**Categories:**
- Tanks: engage_tank, tank
- Mages: poke_mage, control_mage
- Carries: scaling_adc, utility_adc
- Support: enchanter
- Fighters: bruiser, skirmisher, assassin

**Rationale:**
- Rare pairs (Ivern + Rengar) may have <5 games together
- Archetypes provide reasonable estimates (jungler + assassin synergy)
- Better than returning no data or neutral assumption

**Trade-off:**
- Less accurate than direct data
- But enables recommendations for any champion pair

### Synergy Delta Metric
**Decision:** `synergy_delta = smoothed_win_rate - 0.50`

**Interpretation:**
- Positive: Good synergy (e.g., +0.04 = 54% win rate together)
- Negative: Anti-synergy (e.g., -0.03 = 47% win rate together)
- Zero: Neutral (no synergy effect)

**Rationale:**
- Intuitive for recommendation scoring
- Directly interpretable (percentage points above/below baseline)
- Aggregates naturally (sum synergy deltas for team composition score)

## Data Coverage

**Expected from 3,442 games:**
- ~300-500 champion pairs with 5+ games together
- ~1,500-2,000 total pairs observed (but many <5 games)
- 48 champions with archetype mappings
- ~20-30 archetype pair combinations

**Fallback distribution (estimated):**
- 70% direct data (common pairs)
- 20% archetype fallback (rare pairs)
- 10% neutral (very rare/untested pairs)

## Integration Points

### For Recommendation Engine (Phase 4)
```typescript
// Get synergy between candidate and team
const synergy = await getTeamSynergies(
  ['Sejuani', 'Jinx', 'Orianna'],  // Current team
  'Leona',                          // Candidate
  '14.1'                            // Patch
)

// synergy.total_synergy: 0.12 (sum of pairwise deltas)
// synergy.pairs: [
//   { champion_b: 'Sejuani', synergy_delta: 0.05 },
//   { champion_b: 'Jinx', synergy_delta: 0.04 },
//   { champion_b: 'Orianna', synergy_delta: 0.03 }
// ]

// Use in scoring: score += synergy.total_synergy * SYNERGY_WEIGHT
```

### For UI (Draft Simulator)
```typescript
// Show top synergies in recommendation panel
const topSynergies = await getChampionSynergies('Sejuani', '14.1', 5)

// Display:
// "Strong synergies with: Ashe (+4%), Jinx (+3%), Orianna (+3%)"
```

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Blockers
None.

### Concerns
- Synergy computation script not run yet (requires migration applied to database)
- Once run, verify:
  - Champion pairs meet 5+ games threshold
  - Archetype fallback provides reasonable estimates
  - High-synergy pairs (CC chains) have positive deltas

### Recommended Next Steps
1. Apply migration to Supabase instance
2. Run synergy computation script: `cd scripts/etl && npx tsx ../analytics/compute-synergies.ts`
3. Verify data quality:
   ```sql
   -- Check high-synergy pairs
   SELECT champion_a, champion_b, games_together, synergy_delta
   FROM synapse.champion_synergies
   WHERE games_together >= 10
   ORDER BY synergy_delta DESC
   LIMIT 10;

   -- Expect: Sejuani+Ashe, engage tanks+ADCs to have positive deltas
   ```
4. Proceed to Plan 02-04 (Matchup Matrix)

## Lessons Learned

### What Worked Well
- CHECK constraint elegantly prevents duplicate pairs
- Hierarchical fallback provides graceful degradation
- Synergy delta metric is intuitive and composable

### What Could Be Improved
- Could add role context to synergies (jungle+mid synergy vs jungle+top)
- Could weight recent patches higher in aggregation
- Could add anti-synergy detection (pairs that lose together)

### For Future Plans
- Consider role-specific synergies for more granular recommendations
- Monitor archetype fallback usage rate to refine categories
- Add synergy trend detection (improving/declining over patches)

## File Manifest

### Created Files

**Migration:**
- `../lumina/supabase/migrations/20260129000005_synergy_schema.sql` (78 lines)
  - champion_synergies, champion_archetypes, archetype_synergies tables
  - Indexes and constraints

**Scripts:**
- `scripts/analytics/compute-synergies.ts` (495 lines)
  - Self-join aggregation for champion pairs
  - Archetype seeding (48 champions)
  - Archetype synergy aggregation

**Libraries:**
- `lib/queries/synergies.ts` (261 lines)
  - getSynergyScore with 3-tier fallback
  - getChampionSynergies (top N pairs)
  - getTeamSynergies (aggregate team score)

### Modified Files
None.

## Verification Checklist

- [x] Migration creates champion_synergies, champion_archetypes, archetype_synergies tables
- [x] CHECK constraint ensures champion_a < champion_b ordering
- [x] Script aggregates pairs with 5+ games threshold
- [x] Bayesian smoothing applied (prior weight 10)
- [x] Archetype fallback implemented in query helpers
- [x] Type-safe SynergyScore interface
- [ ] Script executed successfully (requires database access)
- [ ] High-synergy pairs verified (Sejuani+Ashe, etc.)
- [ ] Archetype fallback provides reasonable estimates

## Commit History

| Commit | Message | Files | Repo |
|--------|---------|-------|------|
| 8309837 | feat(02-03): create synergy schema migration | 20260129000005_synergy_schema.sql | lumina |
| d5fc504 | feat(02-03): create synergy computation script | compute-synergies.ts | synapse |
| 603e4f3 | feat(02-03): create synergy query helpers with fallback | synergies.ts | synapse |

**Total:** 3 commits, 834 lines added across 2 repositories
