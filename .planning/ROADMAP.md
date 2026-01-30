# Roadmap: Synapse

## Overview

Synapse transforms from a greenfield Next.js project into an AI-powered LoL drafting assistant across 6 phases over 7-8 days. The journey moves from data foundation (GRID API integration, Supabase schema) through analytics computation (synergies, matchups) to the real-time draft simulator with AI recommendations. Each phase delivers verifiable capability, with risk mitigations from PITFALLS.md baked into critical phases.

**Database Context:**
- All Supabase migrations are managed in `../lumina/supabase/migrations/`
- Synapse schema is isolated in its own PostgreSQL schema (`synapse.`)
- Shares Supabase instance with lumina (VALORANT) and mosaic projects

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - GRID API integration, Supabase schema, ETL pipeline ✅
- [x] **Phase 2: Core Analytics** - Champion statistics, synergy matrices, matchup data ✅
- [x] **Phase 3: Draft State Machine** - Real-time state management with turn validation ✅
- [x] **Phase 4: AI/Heuristics Engine** - Recommendations, predictions, win-rate projections ✅
- [ ] **Phase 5: Draft Simulator UI** - LoL-authentic interface with real-time updates
- [ ] **Phase 6: Polish and Deploy** - Performance optimization, demo prep, Vercel deployment

## Phase Details

### Phase 1: Data Foundation
**Goal**: Establish data infrastructure that ingests GRID.gg tournament data into Supabase with correct role assignments and patch versioning
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01 (GRID.gg API integration), DATA-02 (ETL pipeline), INFRA-01 (Supabase PostgreSQL schema)
**Success Criteria** (what must be TRUE):
  1. GRID API client successfully fetches tournaments, series, and draft data with rate limiting
  2. Supabase schema contains tables for champions, players, teams, drafts, and champion_stats with proper indexes
  3. ETL pipeline ingests 1,500+ games across LCS, LEC, LCK, LPL tournaments
  4. Role assignment achieves >90% accuracy using multi-signal inference (player role + champion distribution + team constraints)
  5. All data includes patch_version for meta-aware queries
**Risk Mitigations**:
  - PITFALL-1 (Role Ambiguity): Implement multi-signal role inference with confidence scoring, flag ambiguous assignments for review
  - PITFALL-5 (GRID Rate Limits): Rate-limited client with exponential backoff, checkpointing for resumable ETL
  - PITFALL-9 (Champion Names): Create champion alias table normalizing GRID names to canonical names
**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Supabase schema and GRID API client ✅
- [x] 01-02-PLAN.md — ETL pipeline with role inference ✅
- [x] 01-03-PLAN.md — Data validation and quality checks ✅

### Phase 2: Core Analytics
**Goal**: Pre-compute champion statistics, synergy matrices, matchup data, ban analytics, and player-specific champion pools with patch-aware filtering and confidence scoring
**Depends on**: Phase 1
**Requirements**: DATA-03 (Pre-computed synergy matrices), DATA-04 (Player champion pool aggregation), DATA-05 (Ban analytics), DATA-06 (Side-aware statistics), CORE-01 (Synergy scores)
**Success Criteria** (what must be TRUE):
  1. Champion statistics (win rate, pick rate, ban rate) are queryable by patch, region, role, and side (blue/red)
  2. Synergy matrix covers all viable champion pairs with Bayesian smoothing for sparse data
  3. Matchup data provides lane win rates for role-specific champion pairs
  4. Player champion pools show individual comfort picks with games played, win rate, role flexibility, and recency
  5. Ban analytics track target bans, priority bans, and most-banned champions by context
  6. Pick order statistics identify early-pick vs late-pick success patterns
  7. Role flexibility scores identify flex picks using role_confidence data
  8. All analytics include confidence indicators (high/medium/low/insufficient) and side-specific adjustments
**Risk Mitigations**:
  - PITFALL-3 (Patch Volatility): Filter to last 3 patches, implement recency weighting with 30-day half-life
  - PITFALL-4 (Data Sparsity): Bayesian smoothing with prior weight of 10, archetype fallback for rare pairs
  - PITFALL-10 (Side Bias): Include side as a feature, add +2% blue side adjustment
**Plans**: 5 plans in 2 waves
**Data Enhancements from Phase 1**:
  - `champion_picks.team_side` enables blue/red win rate analysis
  - `champion_picks.pick_order` enables early/late pick pattern detection
  - `champion_picks.role_confidence` identifies flex picks (confidence < 0.7)
  - `champion_picks.player_id` enables player-specific champion pool tracking
  - `drafts.blue_bans` and `drafts.red_bans` enable ban priority analysis

Plans:
- [x] 02-01-PLAN.md — Champion statistics with side-aware Bayesian smoothing ✅
- [x] 02-02-PLAN.md — Ban analytics and priority tracking ✅
- [x] 02-03-PLAN.md — Synergy matrix with archetype fallback ✅
- [x] 02-04-PLAN.md — Matchup matrix and pick order analysis ✅
- [x] 02-05-PLAN.md — Player champion pools with role flexibility scores ✅

### Phase 3: Draft State Machine
**Goal**: Implement real-time draft state management with proper turn sequencing, ban phase modeling, side selection, validation, and API endpoints
**Depends on**: Phase 2
**Requirements**: INFRA-02 (Real-time draft state management), INFRA-03 (Ban phase state modeling), API-01 (API routes for recommendations)
**Success Criteria** (what must be TRUE):
  1. Draft state machine enforces LoL professional draft order with explicit ban phases (3-ban → 3-pick → 2-ban → 2-pick per side)
  2. State tracks current turn, phase (ban1, pick1, ban2, pick2), available champions, team compositions, and selected side (blue/red)
  3. Validation prevents illegal actions (picking banned champions, duplicate picks, wrong turn order)
  4. Side selection allows choosing blue vs red team and shows side-specific win rate adjustments
  5. API endpoints return draft state, recommendations, and predictions in <200ms
  6. Zustand store syncs with Supabase Realtime for multi-client updates
**Risk Mitigations**:
  - PITFALL-2 (Stateless Draft): Model draft as explicit state machine with 20 turns, context-aware API
  - PITFALL-6 (Vercel Timeout): Pre-computed features in database, cached queries, database indexes
  - PITFALL-7 (WebSocket Quota): Supabase Broadcast for ephemeral updates, polling fallback
**Plans**: 3 plans in 2 waves
**Data Enhancements from Phase 1**:
  - `champion_picks.pick_order` (1-10) maps to draft turn sequence
  - `drafts.blue_bans` and `drafts.red_bans` define ban phase structure
  - `champion_picks.team_side` enables side-specific state tracking

Plans:
- [x] 03-01-PLAN.md — Draft state machine core (types, 20-turn sequence, Zustand store) ✅
- [x] 03-02-PLAN.md — Validation logic (guard functions, pure predicates) ✅
- [x] 03-03-PLAN.md — API routes and Supabase Realtime integration ✅

### Phase 4: AI/Heuristics Engine
**Goal**: Deliver AI-powered pick/ban recommendations, player-specific opponent predictions, and live win-rate projections with transparent reasoning
**Depends on**: Phase 3
**Requirements**: CORE-02 (Real-time pick/ban recommendations), CORE-03 (Player-specific opponent prediction), CORE-04 (Live win-rate projection), CORE-05 (Ban strategy recommendations), CORE-06 (Flex pick detection)
**Success Criteria** (what must be TRUE):
  1. Pick recommendations return top 5 champions with synergy + counter + composition + side-specific scoring
  2. Each recommendation includes transparent reasoning ("Pick Sejuani because: CC chain with Ashe, counters Viego, adds AP damage, +3% blue side advantage")
  3. Opponent pick prediction shows probability distribution based on INDIVIDUAL PLAYER champion pools, historical picks, and team needs
  4. Ban recommendations identify target bans using opponent player champion pools ("Ban Faker's Azir: 47 games, 68% WR, comfort pick")
  5. Flex pick detection uses role_confidence scores to recommend multi-role champions in early draft
  6. Win-rate projection updates in real-time with each pick/ban, showing breakdown by category and side adjustments
  7. Recommendations are context-aware (early picks favor flex with confidence < 0.7, late picks favor counters, side-specific priorities)
**Risk Mitigations**:
  - PITFALL-4 (Sparsity): Use archetype-based fallback for rare champion combinations
  - PITFALL-6 (Timeout): Heuristics-first approach, no heavy ML inference
  - PITFALL-11 (Unknown Champion): Graceful fallback to neutral scores for new/unknown champions
**Plans**: 5 plans in 3 waves
**Data Enhancements from Phase 1** (MAJOR UPGRADE):
  - `champion_picks.player_id` enables player-specific predictions (was team-level only)
  - `champion_picks.role_confidence` identifies flex picks for early draft recommendations
  - `champion_picks.team_side` enables side-aware recommendation scoring
  - `champion_picks.pick_order` provides context for early vs late pick strategies
  - `drafts.blue_bans` and `drafts.red_bans` enable ban strategy analysis

Plans:
- [x] 04-01-PLAN.md — Pick scorer with multi-criteria weighted scoring (MCDM) ✅
- [x] 04-02-PLAN.md — Win-rate projector with incremental updates ✅
- [x] 04-03-PLAN.md — Player predictor and ban strategy recommendations ✅
- [x] 04-04-PLAN.md — Reasoning generator and flex pick detection ✅
- [x] 04-05-PLAN.md — API routes for recommendations, predictions, win-rate ✅

### Phase 5: Draft Simulator UI
**Goal**: Build LoL-authentic draft simulator interface with ban phase visualization, player selection, role confidence indicators, real-time recommendations, and win-rate visualization
**Depends on**: Phase 4
**Requirements**: FEAT-01 (Draft simulator interface), FEAT-02 (Player-specific champion pool analysis), FEAT-03 (Ban phase visualization), FEAT-04 (Role confidence indicators), SUPPORT-01 (Individual player selection)
**Success Criteria** (what must be TRUE):
  1. Draft board displays Blue vs Red with distinct ban phase sections (3-ban → 3-pick → 2-ban → 2-pick) and pick phase
  2. Side selection toggle allows choosing blue vs red team at draft start
  3. Champion grid shows all champions with search/filter, role filtering, availability state, and flex pick indicators (confidence < 0.7)
  4. Player selection shows INDIVIDUAL players from both teams with their champion pools (not just team selection)
  5. Recommendation panel shows top 3 picks with reasoning, synergy scores, counter-pick indicators, and side-specific advantages
  6. Prediction panel shows opponent's likely picks with probability bars based on individual player history
  7. Ban recommendation panel suggests target bans using opponent player champion pools
  8. Win-rate gauge animates smoothly between updates, showing percentage with breakdown on hover and side adjustments
  9. Pre-match scouting shows player-specific champion pools, comfort picks, role flexibility, and recent form
  10. Role confidence badges on picked champions indicate flex picks vs locked roles
**Risk Mitigations**:
  - PITFALL-8 (Scope Creep): MVP-first development, time-box each component to 1 day max
  - PITFALL-12 (Cold Start): Pre-warm API before demo
**Plans**: 6 plans in 3 waves
**Data Enhancements from Phase 1**:
  - `champion_picks.player_id` enables player-specific scouting (not just team-level)
  - `champion_picks.role_confidence` shown as visual badges on picks
  - `drafts.blue_bans` and `drafts.red_bans` drive ban phase UI structure
  - `champion_picks.team_side` enables side selection toggle

Plans:
- [ ] 05-01-PLAN.md — Draft page routes, draft board, side selector, turn indicator (Wave 1)
- [ ] 05-02-PLAN.md — Champion grid with search, role filters, flex indicators (Wave 1)
- [ ] 05-03-PLAN.md — Player selector and champion pool analysis panel (Wave 2)
- [ ] 05-04-PLAN.md — Recommendation and ban strategy panels (Wave 2)
- [ ] 05-05-PLAN.md — Prediction panel with probability bars (Wave 2)
- [ ] 05-06-PLAN.md — Win-rate gauge and full integration with polish (Wave 3)

### Phase 6: Polish and Deploy
**Goal**: Production-ready deployment with performance optimization, demo scenario preparation, and hackathon submission
**Depends on**: Phase 5
**Requirements**: None (polish phase)
**Success Criteria** (what must be TRUE):
  1. Application deployed to Vercel with production environment variables
  2. Demo scenario (T1 vs C9) loads successfully with pre-populated data
  3. All API responses complete in <500ms (p95)
  4. No console errors or broken UI states during full draft simulation
  5. README and demo video prepared for hackathon submission
**Risk Mitigations**:
  - PITFALL-12 (Cold Start): Warm-up script runs before demo
  - Deployment testing on Vercel preview 1 day before submission
**Plans**: TBD

Plans:
- [ ] 06-01: Vercel deployment and environment setup
- [ ] 06-02: Demo scenario and performance testing
- [ ] 06-03: Documentation and submission prep

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 3/3 | ✅ Complete | 2026-01-29 |
| 2. Core Analytics | 5/5 | ✅ Complete | 2026-01-30 |
| 3. Draft State Machine | 3/3 | ✅ Complete | 2026-01-30 |
| 4. AI/Heuristics Engine | 5/5 | ✅ Complete | 2026-01-30 |
| 5. Draft Simulator UI | 0/6 | Ready to execute | - |
| 6. Polish and Deploy | 0/3 | Not started | - |

## Requirement Coverage

| Requirement ID | Description | Phase | Enhanced |
|----------------|-------------|-------|----------|
| DATA-01 | GRID.gg API integration | Phase 1 | ✅ |
| DATA-02 | ETL pipeline for tournament data | Phase 1 | ✅ |
| DATA-03 | Pre-computed synergy matrices | Phase 2 | - |
| DATA-04 | Player champion pool aggregation | Phase 2 | ✅ Player-specific |
| DATA-05 | Ban analytics | Phase 2 | ⭐ NEW |
| DATA-06 | Side-aware statistics | Phase 2 | ⭐ NEW |
| INFRA-01 | Supabase PostgreSQL schema | Phase 1 | ✅ |
| INFRA-02 | Real-time draft state management | Phase 3 | ✅ Ban phases |
| INFRA-03 | Ban phase state modeling | Phase 3 | ⭐ NEW |
| API-01 | API routes for recommendations | Phase 3 | - |
| CORE-01 | Synergy scores and matchup advantages | Phase 2 | - |
| CORE-02 | Real-time pick/ban recommendations | Phase 4 | ✅ Side-aware |
| CORE-03 | Opponent pick prediction | Phase 4 | ✅ Player-specific |
| CORE-04 | Live win-rate projection | Phase 4 | ✅ Side adjustments |
| CORE-05 | Ban strategy recommendations | Phase 4 | ⭐ NEW |
| CORE-06 | Flex pick detection | Phase 4 | ⭐ NEW |
| FEAT-01 | Draft simulator interface | Phase 5 | ✅ Ban phases |
| FEAT-02 | Champion pool analysis | Phase 5 | ✅ Player-specific |
| FEAT-03 | Ban phase visualization | Phase 5 | ⭐ NEW |
| FEAT-04 | Role confidence indicators | Phase 5 | ⭐ NEW |
| SUPPORT-01 | Team/player selection | Phase 5 | ✅ Individual players |

**Coverage: 21/21 requirements mapped (+7 enhancements from Phase 1 data)**

**Key Enhancements Enabled by Phase 1 ETL:**
- ⭐ **Player-level predictions** (not just team-level) via `champion_picks.player_id`
- ⭐ **Ban strategy analysis** via `drafts.blue_bans` and `drafts.red_bans`
- ⭐ **Side-aware recommendations** via `champion_picks.team_side`
- ⭐ **Flex pick detection** via `champion_picks.role_confidence`
- ⭐ **Pick order analysis** via `champion_picks.pick_order`

## Risk Summary

| Phase | Critical Pitfalls Addressed |
|-------|----------------------------|
| Phase 1 | Role Ambiguity (#1), GRID Rate Limits (#5), Champion Names (#9) |
| Phase 2 | Patch Volatility (#3), Data Sparsity (#4), Side Bias (#10) |
| Phase 3 | Stateless Draft (#2), Vercel Timeout (#6), WebSocket Quota (#7) |
| Phase 4 | Data Sparsity (#4), Timeout (#6), Unknown Champion (#11) |
| Phase 5 | Scope Creep (#8), Cold Start (#12) |
| Phase 6 | Cold Start (#12) |

## Data Foundation Summary

**Phase 1 delivered richer data than originally planned:**

| Data Field | Original Plan | Actual Result | Enables |
|-----------|---------------|---------------|---------|
| Champion picks | Basic champion + role | + player_id, team_side, pick_order, role_confidence | Player predictions, side analysis, flex detection |
| Bans | Not in champion_picks table | Separate blue_bans + red_bans arrays | Ban strategy, target bans, priority analysis |
| Role inference | Basic role assignment | Multi-signal with confidence scoring | Flex pick detection (confidence < 0.7) |
| Player tracking | Team-level only | Individual player → champion mapping | Player champion pools, comfort picks |
| Draft metadata | Timestamp + winner | + series timestamps, game numbers | Historical analysis, recency weighting |

**Schema Location:** All migrations in `../lumina/supabase/migrations/`
- Core schema: `20260128000001_schema.sql`
- Indexes: `20260128000002_indexes.sql`
- Champion aliases: `20260128000003_champion_aliases.sql`
- Event tables: `20260129000001_event_tables.sql` (future use)
- Permissions: `20260129000002_synapse_permissions.sql`
