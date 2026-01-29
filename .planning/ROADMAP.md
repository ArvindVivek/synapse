# Roadmap: DraftIQ

## Overview

DraftIQ transforms from a greenfield Next.js project into an AI-powered LoL drafting assistant across 6 phases over 7-8 days. The journey moves from data foundation (GRID API integration, Supabase schema) through analytics computation (synergies, matchups) to the real-time draft simulator with AI recommendations. Each phase delivers verifiable capability, with risk mitigations from PITFALLS.md baked into critical phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation** - GRID API integration, Supabase schema, ETL pipeline
- [ ] **Phase 2: Core Analytics** - Champion statistics, synergy matrices, matchup data
- [ ] **Phase 3: Draft State Machine** - Real-time state management with turn validation
- [ ] **Phase 4: AI/Heuristics Engine** - Recommendations, predictions, win-rate projections
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
**Plans**: TBD

Plans:
- [ ] 01-01: Supabase schema and GRID API client
- [ ] 01-02: ETL pipeline with role inference
- [ ] 01-03: Data validation and quality checks

### Phase 2: Core Analytics
**Goal**: Pre-compute champion statistics, synergy matrices, and matchup data with patch-aware filtering and confidence scoring
**Depends on**: Phase 1
**Requirements**: DATA-03 (Pre-computed synergy matrices), DATA-04 (Player champion pool aggregation), CORE-01 (Synergy scores)
**Success Criteria** (what must be TRUE):
  1. Champion statistics (win rate, pick rate, ban rate) are queryable by patch, region, and role
  2. Synergy matrix covers all viable champion pairs with Bayesian smoothing for sparse data
  3. Matchup data provides lane win rates for role-specific champion pairs
  4. Player champion pools show comfort picks with games played, win rate, and recency
  5. All analytics include confidence indicators (high/medium/low/insufficient)
**Risk Mitigations**:
  - PITFALL-3 (Patch Volatility): Filter to last 3 patches, implement recency weighting with 30-day half-life
  - PITFALL-4 (Data Sparsity): Bayesian smoothing with prior weight of 10, archetype fallback for rare pairs
  - PITFALL-10 (Side Bias): Include side as a feature, add +2% blue side adjustment
**Plans**: TBD

Plans:
- [ ] 02-01: Champion statistics with patch filtering
- [ ] 02-02: Synergy matrix with Bayesian smoothing
- [ ] 02-03: Matchup matrix and player pools

### Phase 3: Draft State Machine
**Goal**: Implement real-time draft state management with proper turn sequencing, validation, and API endpoints
**Depends on**: Phase 2
**Requirements**: INFRA-02 (Real-time draft state management), API-01 (API routes for recommendations)
**Success Criteria** (what must be TRUE):
  1. Draft state machine enforces LoL professional draft order (ban phases + snake pick order)
  2. State tracks current turn, phase, available champions, and team compositions
  3. Validation prevents illegal actions (picking banned champions, duplicate picks)
  4. API endpoints return draft state, recommendations, and predictions in <200ms
  5. Zustand store syncs with Supabase Realtime for multi-client updates
**Risk Mitigations**:
  - PITFALL-2 (Stateless Draft): Model draft as explicit state machine with 20 turns, context-aware API
  - PITFALL-6 (Vercel Timeout): Pre-computed features in database, cached queries, database indexes
  - PITFALL-7 (WebSocket Quota): Supabase Broadcast for ephemeral updates, polling fallback
**Plans**: TBD

Plans:
- [ ] 03-01: Draft state machine and Zustand store
- [ ] 03-02: API routes and Supabase Realtime integration

### Phase 4: AI/Heuristics Engine
**Goal**: Deliver AI-powered pick recommendations, opponent predictions, and live win-rate projections with transparent reasoning
**Depends on**: Phase 3
**Requirements**: CORE-02 (Real-time pick/ban recommendations), CORE-03 (Opponent pick prediction), CORE-04 (Live win-rate projection)
**Success Criteria** (what must be TRUE):
  1. Pick recommendations return top 5 champions with synergy + counter + composition scoring
  2. Each recommendation includes transparent reasoning ("Pick Sejuani because: CC chain with Ashe, counters Viego, adds AP damage")
  3. Opponent pick prediction shows probability distribution based on player history and team needs
  4. Win-rate projection updates in real-time with each pick/ban, showing breakdown by category
  5. Recommendations are context-aware (early picks favor flex, late picks favor counters)
**Risk Mitigations**:
  - PITFALL-4 (Sparsity): Use archetype-based fallback for rare champion combinations
  - PITFALL-6 (Timeout): Heuristics-first approach, no heavy ML inference
  - PITFALL-11 (Unknown Champion): Graceful fallback to neutral scores for new/unknown champions
**Plans**: TBD

Plans:
- [ ] 04-01: Recommendation engine with transparent reasoning
- [ ] 04-02: Opponent prediction model
- [ ] 04-03: Win-rate projection with live updates

### Phase 5: Draft Simulator UI
**Goal**: Build LoL-authentic draft simulator interface with real-time recommendations, predictions, and win-rate visualization
**Depends on**: Phase 4
**Requirements**: FEAT-01 (Draft simulator interface), FEAT-02 (Champion pool analysis), SUPPORT-01 (Team/player selection)
**Success Criteria** (what must be TRUE):
  1. Draft board displays Blue vs Red with ban phase and pick phase sections
  2. Champion grid shows all champions with search/filter, role filtering, and availability state
  3. Recommendation panel shows top 3 picks with reasoning, synergy scores, and counter-pick indicators
  4. Prediction panel shows opponent's likely picks with probability bars
  5. Win-rate gauge animates smoothly between updates, showing percentage with breakdown on hover
  6. Pre-match scouting shows selected team's champion pools and comfort picks
**Risk Mitigations**:
  - PITFALL-8 (Scope Creep): MVP-first development, time-box each component to 1 day max
  - PITFALL-12 (Cold Start): Pre-warm API before demo
**Plans**: TBD

Plans:
- [ ] 05-01: Draft board and champion grid
- [ ] 05-02: Team selection and pre-match scouting
- [ ] 05-03: Recommendation and prediction panels
- [ ] 05-04: Win-rate gauge and final polish

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
| 1. Data Foundation | 0/3 | Not started | - |
| 2. Core Analytics | 0/3 | Not started | - |
| 3. Draft State Machine | 0/2 | Not started | - |
| 4. AI/Heuristics Engine | 0/3 | Not started | - |
| 5. Draft Simulator UI | 0/4 | Not started | - |
| 6. Polish and Deploy | 0/3 | Not started | - |

## Requirement Coverage

| Requirement ID | Description | Phase |
|----------------|-------------|-------|
| DATA-01 | GRID.gg API integration | Phase 1 |
| DATA-02 | ETL pipeline for tournament data | Phase 1 |
| DATA-03 | Pre-computed synergy matrices | Phase 2 |
| DATA-04 | Player champion pool aggregation | Phase 2 |
| INFRA-01 | Supabase PostgreSQL schema | Phase 1 |
| INFRA-02 | Real-time draft state management | Phase 3 |
| API-01 | API routes for recommendations | Phase 3 |
| CORE-01 | Synergy scores and matchup advantages | Phase 2 |
| CORE-02 | Real-time pick/ban recommendations | Phase 4 |
| CORE-03 | Opponent pick prediction | Phase 4 |
| CORE-04 | Live win-rate projection | Phase 4 |
| FEAT-01 | Draft simulator interface | Phase 5 |
| FEAT-02 | Champion pool analysis | Phase 5 |
| SUPPORT-01 | Team/player selection | Phase 5 |

**Coverage: 14/14 requirements mapped**

## Risk Summary

| Phase | Critical Pitfalls Addressed |
|-------|----------------------------|
| Phase 1 | Role Ambiguity (#1), GRID Rate Limits (#5), Champion Names (#9) |
| Phase 2 | Patch Volatility (#3), Data Sparsity (#4), Side Bias (#10) |
| Phase 3 | Stateless Draft (#2), Vercel Timeout (#6), WebSocket Quota (#7) |
| Phase 4 | Data Sparsity (#4), Timeout (#6), Unknown Champion (#11) |
| Phase 5 | Scope Creep (#8), Cold Start (#12) |
| Phase 6 | Cold Start (#12) |
