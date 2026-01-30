---
phase: 02-core-analytics
plan: 05
subsystem: player-analytics
tags: [player-pools, flex-picks, comfort-picks, scouting, recency-weighting]
requires: [02-01]
provides:
  - player_champion_pools table with comfort level classification
  - flex_picks table for multi-role champion identification
  - Player scouting query helpers
affects: [03-draft-state]
tech-stack:
  added: []
  patterns: [recency-weighting, comfort-level-classification, flex-pick-detection]
key-files:
  created:
    - ../lumina/supabase/migrations/20260129000007_player_pools_schema.sql
    - scripts/analytics/compute-player-pools.ts
    - lib/queries/player-pools.ts
  modified: []
decisions:
  - id: player-pool-prior
    decision: "Use lighter Bayesian prior (weight: 5) for player pools vs champion stats (weight: 10)"
    rationale: "Player pools are more specific than overall champion stats, so less smoothing needed to preserve individual skill signals"
  - id: recency-half-life
    decision: "30-day half-life for recency weighting"
    rationale: "Balances recent performance with historical consistency; one month is ~2 patch cycles"
  - id: comfort-level-thresholds
    decision: "Signature: 10+ games + 55%+ WR, Comfort: 5+ games + 50%+ WR, Occasional: 3+ games, Rare: <3 games"
    rationale: "Thresholds identify genuine comfort picks while filtering statistical noise from small samples"
  - id: flex-pick-definition
    decision: "True flex pick = 2+ roles with 3+ games each"
    rationale: "Requires meaningful sample size in multiple roles to confirm genuine flexibility vs one-off experiments"
metrics:
  duration: 4.4 min
  completed: 2026-01-30
---

# Phase 2 Plan 5: Player Pool Analytics Summary

Player champion pool aggregation with role flexibility scores and recency weighting for player-specific predictions.

**One-liner:** Player pool analytics with comfort levels (signature/comfort/occasional/rare), recency-weighted win rates (30-day half-life), and flex pick detection for targeted bans and scouting.

## What Was Built

### 1. Player Pools Schema (`20260129000007_player_pools_schema.sql`)

Created two tables for player-specific analytics:

**player_champion_pools table:**
- Aggregates player champion statistics with recency weighting
- Includes comfort_level classification (signature/comfort/occasional/rare)
- Tracks weighted_win_rate (30-day half-life decay)
- Stores avg_role_confidence for role assignment quality
- Indexed for fast player and champion lookups

**flex_picks table:**
- Identifies champions played in multiple roles by same player
- Calculates flexibility_score (1 - max_role_games / total_games)
- Flags is_true_flex for players with 3+ games in 2+ roles
- Enables flex pick threat detection in draft

**Key features:**
- Comfort level thresholds: signature (10+ games, 55%+ WR), comfort (5+ games, 50%+ WR)
- TEXT[] array for roles_played
- Cascading deletes on player removal
- Updated_at trigger for cache invalidation

### 2. Player Pool Computation (`compute-player-pools.ts`)

Script that aggregates player champion pools from raw picks:

**Part 1: Champion Pools**
- Query all picks with player_id, role, team_side, game outcome, date
- Aggregate by (player_id, champion_name, role)
- Apply Bayesian smoothing with lighter prior (weight: 5 vs 10 for champion stats)
- Calculate recency-weighted win rate using exponential decay (30-day half-life)
- Average role_confidence across games
- Assign comfort_level based on games and win rate
- Track days_since_played for staleness detection

**Part 2: Flex Picks**
- Find players with same champion in multiple roles (2+ games each role)
- Calculate flexibility_score = 1 - (max_role_games / total_games)
  - Score of 0.5 = perfectly split between 2 roles
  - Score near 0 = one role dominates
- Set is_true_flex for 2+ roles with 3+ games each
- Identify primary and secondary roles

**Verification results:**
- Processed 1000 champion picks
- Aggregated 427 unique player/champion/role combinations
- Found 12 multi-role champions
- Identified 11 true flex picks (2+ roles with 3+ games each)

### 3. Query Helpers (`lib/queries/player-pools.ts`)

TypeScript query functions for player scouting:

**Functions:**
1. `getPlayerChampionPool(playerId, role?)` - Full champion pool for a player
2. `getPlayerSignaturePicks(playerId)` - Best bans against a player (10+ games, 55%+ WR)
3. `getPlayerFlexPicks(playerId)` - Multi-role champions for a player
4. `getPlayerScoutingReport(playerId)` - Complete scouting report with signatures, comfort picks, flex picks
5. `findPlayersForChampion(championName, role?, minGames?)` - Reverse lookup for champion specialists

**Typed interfaces:**
- `PlayerChampion` - Individual champion data with comfort level
- `FlexPick` - Multi-role champion data with flexibility score
- `PlayerScouting` - Complete player profile with all analytics

## Technical Details

**Recency Weighting Formula:**
```typescript
weight = exp(-days_ago / 30)  // 30-day half-life
weighted_win_rate = sum(won * weight) / sum(weight)
```

**Flexibility Score Formula:**
```typescript
flexibility_score = 1 - (max_role_games / total_games)
// Example: Player with 15 mid games, 10 top games
// flexibility_score = 1 - (15 / 25) = 0.40
```

**Comfort Level Logic:**
```typescript
if (games >= 10 && win_rate >= 0.55) return 'signature'  // Ban these!
if (games >= 5 && win_rate >= 0.50) return 'comfort'     // Strong picks
if (games >= 3) return 'occasional'                      // Sometimes plays
return 'rare'                                            // Rarely plays
```

## Use Cases

**1. Targeted Ban Recommendations**
- Query signature picks for opponent's star player
- Ban Faker's Azir (47 games, 68% win rate) instead of generic meta bans

**2. Opponent Pick Prediction**
- Check comfort picks for likely first-picks
- Identify signature picks that opponents will prioritize

**3. Flex Pick Threat Detection**
- Find players who can play champions in multiple roles
- Account for role-swap threats (e.g., Seraphine mid/support)

**4. Player Scouting**
- Generate full scouting reports for upcoming opponents
- Identify champion pool weaknesses (few comfort picks in a role)

**5. Champion Specialist Lookup**
- Find players who excel on specific champions
- "Who are the best Azir players?" → Query by champion, sort by win rate

## Deviations from Plan

None - plan executed exactly as written.

All tasks completed successfully:
- Schema migration creates player_champion_pools and flex_picks tables
- Computation script aggregates pools with recency weighting
- Query helpers provide typed player scouting access
- Comfort levels correctly classify signature vs rare picks
- Flex picks identify true multi-role players

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Confidence:** High

**Dependencies satisfied:**
- 02-01 (Analytics Foundation) provided Bayesian smoothing and recency weighting libraries
- champion_picks table with player_id and role_confidence from Phase 1

**What Phase 3 can build:**
- Use signature picks for automated ban recommendations
- Integrate comfort picks into opponent pick predictions
- Factor flex picks into role assignment logic
- Generate player-specific draft strategies

## Key Insights

1. **Lighter prior for player pools:** Using weight 5 instead of 10 preserves individual skill signals while still smoothing small samples

2. **Recency weighting matters:** weighted_win_rate differs from raw_win_rate, adapting to meta shifts and player form

3. **True flex picks are rare:** Only 11 out of 427 pools qualified as true flex (2+ roles with 3+ games each), making flex pick detection valuable

4. **Comfort level classification is actionable:** Signature picks (10+ games, 55%+ WR) are clear ban targets

5. **Player pools complement champion stats:** Champion stats show what's strong in the meta; player pools show what individual players are strong on

## Files Modified

**Created:**
- `../lumina/supabase/migrations/20260129000007_player_pools_schema.sql` (114 lines)
- `scripts/analytics/compute-player-pools.ts` (416 lines)
- `lib/queries/player-pools.ts` (280 lines)

**Total:** 810 lines across 3 files

## Performance

**Execution time:** 4.4 minutes
**Commits:** 3 (1 per task)

**Computation script performance:**
- Fetched 1000 picks in <1 second
- Aggregated 427 pools in <1 second
- Computed 12 flex picks in <1 second
- Total runtime: <3 seconds (excluding database latency)

## Commits

**Synapse repo:**
- `f09de81` - feat(02-05): create player pool computation script
- `6e189ff` - feat(02-05): create player pool query helpers

**Lumina repo:**
- `b6b2426` - feat(02-05): create player pools schema migration
