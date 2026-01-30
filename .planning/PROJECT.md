# Synapse

## What This Is

Synapse is an AI-powered League of Legends drafting assistant for professional coaches and analysts. It provides real-time pick/ban recommendations, predicts opponent picks, and displays live win-rate projections during the draft phase — transforming draft preparation from guesswork into data-driven strategy.

Built for the Cloud9 x JetBrains Hackathon (Category 3: Drafting Assistant/Predictor).

## Core Value

Turn-by-turn draft recommendations with transparent reasoning that help coaches make better pick/ban decisions in real time.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Features:**
- [ ] CORE-02: Real-time pick/ban recommendations with side-aware synergy scores and matchup advantages
- [ ] CORE-03: **Player-specific** opponent pick prediction based on individual champion pools and historical picks
- [ ] CORE-04: Live win-rate projection with side adjustments that updates with each pick/ban
- [ ] CORE-05: Ban strategy recommendations using opponent player champion pools (target bans)
- [ ] CORE-06: Flex pick detection using role confidence scores

**Supporting Features:**
- [ ] SUPPORT-01: **Individual player selection** from GRID tournament data (LCS, LEC, LCK, LPL)
- [ ] FEAT-02: **Player-specific** champion pool analysis for pre-match opponent scouting
- [ ] FEAT-01: Draft simulator interface with LoL-authentic UI and ban phase visualization
- [ ] FEAT-03: Ban phase visualization (3-ban → 3-pick → 2-ban → 2-pick)
- [ ] FEAT-04: Role confidence indicators for flex picks

**Data Pipeline:**
- [x] DATA-01: GRID.gg API integration (Central Data, Series State, File Download) ✅
- [x] DATA-02: ETL pipeline for tournament, team, player, and draft data with player tracking ✅
- [ ] DATA-03: Pre-computed synergy matrices and champion statistics
- [ ] DATA-04: **Player-specific** champion pool aggregation (enabled by player_id tracking)
- [ ] DATA-05: Ban analytics (target bans, priority bans, most-banned by context)
- [ ] DATA-06: Side-aware statistics (blue vs red win rates)
- [ ] CORE-01: Synergy scores and matchup advantages (computed from data)

**Infrastructure:**
- [x] INFRA-01: Supabase PostgreSQL schema in synapse.* (managed in `../lumina/supabase/migrations/`) ✅
- [ ] INFRA-02: Real-time draft state management with ban phase modeling
- [ ] INFRA-03: Ban phase state modeling (3-ban, 3-pick, 2-ban, 2-pick phases)
- [ ] API-01: API routes for recommendations, predictions, and win-rate calculations

### Out of Scope

- Real-time chat/collaboration features — focus on single-user draft simulation
- Mobile app — web-first, responsive but not native mobile
- OAuth/social login — public application, no auth needed for hackathon
- Live tournament stream integration — pre-match simulation only
- Advanced ML models (deep learning) — heuristics-first, ML if time permits
- Item build recommendations — draft phase only, not in-game

## Traceability

| Requirement | Phase | Status | Enhanced |
|-------------|-------|--------|----------|
| DATA-01 | Phase 1 | ✅ Complete | With file downloads |
| DATA-02 | Phase 1 | ✅ Complete | Player tracking added |
| DATA-03 | Phase 2 | Pending | - |
| DATA-04 | Phase 2 | Pending | Player-specific pools |
| DATA-05 | Phase 2 | Pending | ⭐ NEW: Ban analytics |
| DATA-06 | Phase 2 | Pending | ⭐ NEW: Side-aware stats |
| INFRA-01 | Phase 1 | ✅ Complete | Schema in lumina/ |
| INFRA-02 | Phase 3 | Pending | Ban phase modeling |
| INFRA-03 | Phase 3 | Pending | ⭐ NEW: Ban phases |
| API-01 | Phase 3 | Pending | - |
| CORE-01 | Phase 2 | Pending | - |
| CORE-02 | Phase 4 | Pending | Side-aware scoring |
| CORE-03 | Phase 4 | Pending | Player-specific |
| CORE-04 | Phase 4 | Pending | Side adjustments |
| CORE-05 | Phase 4 | Pending | ⭐ NEW: Ban strategy |
| CORE-06 | Phase 4 | Pending | ⭐ NEW: Flex detection |
| FEAT-01 | Phase 5 | Pending | Ban phase UI |
| FEAT-02 | Phase 5 | Pending | Player-specific |
| FEAT-03 | Phase 5 | Pending | ⭐ NEW: Ban phase viz |
| FEAT-04 | Phase 5 | Pending | ⭐ NEW: Confidence UI |
| SUPPORT-01 | Phase 5 | Pending | Individual players |

**Total: 21 requirements (+7 enhancements from Phase 1 data foundation)**

## Context

**Competition:** Cloud9 x JetBrains Hackathon - Category 3 (Drafting Assistant/Predictor)

**Data Source:** GRID.gg APIs providing LCS, LEC, LCK, LPL tournament data from 2024-2025. Approximately 1,500-2,000 professional series available across ~30 tournament IDs.

**Target Users:** Professional LoL coaches conducting draft prep, team analysts building scouting reports, players practicing champion pool strategies.

**Existing Documentation:** Comprehensive BRD at `docs/synapse_brd.md` with detailed feature specs, database schema, API response formats, and demo scenarios.

**Codebase State:**
- Next.js 16 + React 19 + TailwindCSS 4 project
- ETL pipeline complete in `scripts/etl/` (GRID API client, end_state parsing, role inference)
- Database schema deployed in `../lumina/supabase/migrations/` (synapse.* schema)
- No frontend application code yet

## Constraints

- **Timeline:** 7-8 days for complete implementation
- **Tech Stack:** Next.js on Vercel, Supabase (PostgreSQL + Edge Functions), no Python backend
- **Compute:** Heuristics-first approach for real-time predictions; pre-computed data for analytics; serverless compute via Vercel API routes and Supabase Edge Functions
- **Data:** Limited to GRID.gg API data (no web scraping, no Riot API)
- **UI:** Must feel professional and LoL-authentic — judges are esports-focused

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vercel + Supabase instead of Python FastAPI | Simpler deployment, single-language stack (TypeScript), faster iteration | Adopted |
| Heuristics-first predictions | Achievable in timeline, transparent reasoning, ML can be added later | Adopted |
| Single-page draft simulator as MVP | Core value is the draft experience; other pages can follow | Adopted |
| Pre-computed synergy/matchup matrices | Reduces real-time compute, enables fast recommendations | Adopted |
| 6-phase roadmap structure | Balances data foundation, analytics, state management, AI, UI, and polish | Adopted |
| Risk mitigations from PITFALLS.md | Proactive prevention of role ambiguity, data sparsity, timeout issues | Adopted |
| **Track player_id in champion_picks** | Enables player-specific predictions vs team-level only; critical for scouting | Adopted (2026-01-29) |
| **Store role_confidence scores** | Identifies flex picks for early draft strategy; flags ambiguous role assignments | Adopted (2026-01-29) |
| **Separate blue/red bans in drafts table** | Enables ban strategy analysis, target bans, priority tracking | Adopted (2026-01-29) |
| **Track team_side and pick_order** | Enables side-aware recommendations and pick order pattern analysis | Adopted (2026-01-29) |
| **Share Supabase with lumina (migrations in ../lumina/)** | Centralized database management, isolated schemas (synapse.*, public.*, mosaic.*) | Adopted (2026-01-29) |
| **Skip event timeline processing for MVP** | Draft data provides 80% of value; event processing is 2+ days extra work | Deferred to post-hackathon |

---
*Last updated: 2026-01-29 after Phase 1 ETL completion and roadmap enhancements*
