# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Turn-by-turn draft recommendations with transparent reasoning that help coaches make better pick/ban decisions in real time.
**Current focus:** Phase 5 - Draft Simulator UI

## Current Position

Phase: 5 of 6 (Draft Simulator UI)
Plan: 3 of 5 in current phase
Status: Player selection and pool analysis complete
Last activity: 2026-01-30 - Completed 05-03-PLAN.md (Player selector and champion pool analysis)

Progress: [███████░░░] 76% (19/25 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 3.4 min
- Total execution time: 1.31 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Data Foundation | 3/3 | 18 min | 6 min |
| 2 - Core Analytics | 5/5 | 14 min | 2.8 min |
| 3 - Draft State Machine | 3/3 | 15.4 min | 5.1 min |
| 4 - AI/Heuristics Engine | 5/5 | 19.1 min | 3.8 min |
| 5 - Draft Simulator UI | 3/5 | 17 min | 5.7 min |

**Recent Trend:**
- Last 5 plans: 2.6min, 8min, 4min, 5min
- Trend: Plan 05-03 completed efficiently with API route and component creation

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase structure covering data pipeline through deployment
- [Roadmap]: Heuristics-first approach for recommendations (no heavy ML)
- [Roadmap]: Risk mitigations from PITFALLS.md integrated into each phase
- [01-01]: Use Bottleneck for rate limiting instead of custom solution (battle-tested, handles edge cases)
- [01-01]: Store role_confidence scores for multi-signal role inference (flex picks need probabilistic scoring)
- [01-01]: Add etl_checkpoints table for resumable ETL jobs (30-60 min runtime needs checkpoint recovery)
- [01-01]: Use Zod for GRID API response validation (catch schema changes early)
- [01-02]: 74 champions with role priors covering professional meta (exceeds 50+ requirement)
- [01-02]: Multi-signal role inference with weighted scoring: champion prior (0.5) + player role (0.3) + constraints (0.2)
- [01-02]: Checkpoint system uses upsert for idempotent resume operations
- [01-02]: Track player_id, team_side, pick_order, role_confidence for enhanced analytics
- [01-03]: ETL ingested 3,442 games (229% of target), 34,530 picks, 34,321 bans
- [01-03]: Role confidence acceptable at 65.7% medium (player history signal can improve in Phase 2)
- [01-03]: Data quality production-ready: 0.06% draft issues, perfect 10 picks/draft average
- [02-01]: Bayesian smoothing with prior weight of 10 games prevents overfitting to small samples
- [02-01]: Wilson confidence intervals used instead of normal approximation (more accurate for n<30)
- [02-01]: Side-specific stats computed separately (blue, red, NULL) to account for side advantage
- [02-01]: Role confidence threshold of 0.5 filters low-confidence role assignments from analytics
- [02-01]: Champion stats stored in computed table for flexible upsert operations
- [02-03]: CHECK(champion_a < champion_b) constraint prevents duplicate synergy pairs
- [02-03]: 8 archetype categories covering 48 champions for rare pair fallback
- [02-03]: Minimum 5 games together for direct synergy data (balance coverage vs reliability)
- [02-03]: Synergy delta metric (smoothed_win_rate - 0.50) for intuitive scoring
- [02-04]: Matchup delta is directional (positive = favorable) for champion perspective
- [02-04]: 3-game minimum threshold for matchups (lower than overall stats due to sparsity)
- [02-04]: Pick phases classified as early (1-3), mid (4-7), late (8-10)
- [02-04]: Blind pick success when picked before opponent, counter pick when after
- [02-04]: Pick order recommendations: good_blind_pick (≥52% + ≥counter), better_late (counter>blind+5%), neutral
- [02-05]: Lighter Bayesian prior for player pools (weight: 5) vs champion stats (weight: 10)
- [02-05]: 30-day half-life for recency weighting balances recent performance with historical consistency
- [02-05]: Comfort level thresholds: signature (10+ games, 55%+ WR), comfort (5+ games, 50%+ WR)
- [02-05]: True flex pick requires 2+ roles with 3+ games each (filters one-off experiments)
- [03-01]: Simple lookup table (DRAFT_SEQUENCE) over XState (50kb overhead avoidance)
- [03-01]: Enable Immer MapSet plugin for Set support in Zustand store
- [03-01]: Zustand (1.2kb) + Immer for client state management (vs Redux 11kb)
- [03-01]: currentTurn tracks 0-20 (0=not started, 1-20=active, >20=complete)
- [03-02]: Pure guard functions for testability and client/server portability
- [03-02]: ValidationErrorCode enum enables internationalization and specific UI feedback
- [03-02]: Type narrowing with 'valid === false' for discriminated union handling
- [03-02]: Store tracks lastValidationError for UI display without prop drilling
- [03-03]: Edge runtime for all API routes to meet <200ms requirement (PITFALL-6)
- [03-03]: Supabase Broadcast (not postgres_changes) for 50-100ms latency (PITFALL-7)
- [03-03]: nanoid for short draft session IDs (12 chars vs UUID 36 chars)
- [03-03]: In-memory session storage for MVP (will migrate to Supabase for persistence)
- [03-03]: Broadcast self: false to prevent echo loops
- [03-03]: Remote actions bypass validation (already validated by originating client)
- [04-02]: Incremental win-rate updates use deltas (not full recomputation) for <50ms performance
- [04-02]: Blue side starts with +2% advantage (well-documented pro play advantage)
- [04-02]: Component weights: base composition 20%, synergy 10% per pair, matchup 15% per matchup
- [04-02]: Delta clamping at ±5% per pick prevents wild swings from outlier data
- [04-02]: Win-rate clamped to [0.05, 0.95] to never show impossible 0% or 100%
- [04-02]: Confidence levels: low (<7 turns), medium (7-11), high (12+) based on pick count
- [04-02]: Bans have minimal MVP impact on projection (future: adjust for removed counters)
- [04-03]: Bayesian player prediction uses 4 likelihood factors: comfort (3x signature), recency (1.5x <30 days), team needs (1.3x if fills), win rate (relative to 50%)
- [04-03]: Player pick probability capped at 0.50 per champion to avoid overconfident single-champion predictions
- [04-03]: Target ban scoring: games played 40%, WR delta 40%, comfort level 20%
- [04-03]: Priority ban scoring uses smoothed ban rate with confidence multiplier (high 1.2x, medium 1.0x, low 0.8x)
- [04-03]: Target bans take precedence over priority bans when same champion appears in both categories
- [04-01]: Sigmoid normalization (1 / (1 + exp(-delta * 10))) for score components
- [04-01]: Turn-adaptive weights: early=0.40 flex, mid=balanced, late=0.40 counter
- [04-01]: Confidence levels based on total game data across components (high ≥20 games, medium ≥10, low <10)
- [04-01]: Champion properties hardcoded for pro play champions (future: query database)
- [04-04]: Reasoning threshold of 0.60 for high-scoring components (filters noise)
- [04-04]: Max 2 reasons per category for concise, scannable output
- [04-04]: Synergy delta ≥0.05 threshold for meaningful synergies (5% win rate difference)
- [04-04]: Flex pick requires 2+ roles with 3+ games each (filters one-off experiments)
- [04-04]: Flexibility score considers both role count and game balance
- [04-04]: Pre-compute flex picks once in scoreAllChampions for performance
- [04-05]: Analytics cache uses direct queries to computed tables instead of RPC functions (simpler, faster)
- [04-05]: 60-second TTL for analytics cache (analytics don't change during a draft)
- [04-05]: Edge runtime for all routes to meet <200ms latency requirement
- [04-05]: Short cache headers (5s) for recommendation endpoints due to rapidly changing draft state
- [04-05]: Player pool data loaded lazily per-player to avoid over-fetching
- [05-01]: Next.js 16 async params pattern required for all route handlers (params now Promise)
- [05-01]: Granular Zustand selectors minimize re-renders (subscribe to specific slices only)
- [05-01]: Server Components fetch data, Client Components manage UI state
- [05-01]: Layout shell with placeholders enables clean integration of future features
- [05-05]: Refetch predictions on turn change to reflect updated draft state
- [05-05]: Filter unavailable champions client-side using availableChampions Set
- [05-05]: Color-coded probability bars: red >40%, orange >25%, yellow <25%
- [05-03]: Aggregate roles across champion entries for multi-role flexibility display
- [05-03]: Comfort level thresholds: signature (10+ games, 55%+ WR), comfort (5+ games, 50%+ WR)
- [05-03]: 60-second cache TTL for player pool data (analytics don't change during draft)
- [05-03]: Mock player data for demo purposes (LCK pro players)

### Pending Todos

- [05-01]: Generate Supabase Database types from schema (currently disabled for build compatibility)

### Blockers/Concerns

- [05-01]: Supabase type imports temporarily disabled (missing types file) - loses type safety for database operations

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-30
Stopped at: Completed 05-03-PLAN.md (Player selector and champion pool analysis)
Resume file: None

## Quick Reference

**Timeline:** 7-8 days (Cloud9 x JetBrains Hackathon)
**Stack:** Next.js 16 + React 19 + Supabase + Vercel
**Data Source:** GRID.gg API (1,500-2,000 professional games)

**Phase Overview:**
1. Data Foundation - GRID API, Supabase schema, ETL
2. Core Analytics - Champion stats, synergies, matchups
3. Draft State Machine - Real-time state, turn validation
4. AI/Heuristics Engine - Recommendations, predictions, win-rate
5. Draft Simulator UI - LoL-authentic interface
6. Polish and Deploy - Performance, demo, submission
