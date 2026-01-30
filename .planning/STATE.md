# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Turn-by-turn draft recommendations with transparent reasoning that help coaches make better pick/ban decisions in real time.
**Current focus:** Phase 4 - AI/Heuristics Engine

## Current Position

Phase: 3 of 6 (Draft State Machine) - COMPLETE
Plan: 3 of 3 in current phase
Status: Phase 3 complete - API routes and Realtime integration
Last activity: 2026-01-30 - Completed 03-03-PLAN.md (API routes and Realtime)

Progress: [████░░░░░░] 44% (11/25 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 4 min
- Total execution time: 0.80 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Data Foundation | 3/3 | 18 min | 6 min |
| 2 - Core Analytics | 5/5 | 14 min | 2.8 min |
| 3 - Draft State Machine | 3/3 | 15.4 min | 5.1 min |

**Recent Trend:**
- Last 5 plans: 2min, 4min, 6min, 6min, 3.4min
- Trend: Excellent velocity (Phase 3 completed at 5.1 min/plan average)

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-30
Stopped at: ✅ Phase 3 Complete - Draft state machine with validation, API routes, and Realtime sync verified, ready for Phase 4 (AI/Heuristics Engine)
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
