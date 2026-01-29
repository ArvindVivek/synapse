# DraftIQ

## What This Is

DraftIQ is an AI-powered League of Legends drafting assistant for professional coaches and analysts. It provides real-time pick/ban recommendations, predicts opponent picks, and displays live win-rate projections during the draft phase — transforming draft preparation from guesswork into data-driven strategy.

Built for the Cloud9 x JetBrains Hackathon (Category 3: Drafting Assistant/Predictor).

## Core Value

Turn-by-turn draft recommendations with transparent reasoning that help coaches make better pick/ban decisions in real time.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Features:**
- [ ] CORE-02: Real-time pick/ban recommendations with synergy scores and matchup advantages
- [ ] CORE-03: Opponent pick prediction with probability distributions based on player history
- [ ] CORE-04: Live win-rate projection that updates with each pick/ban

**Supporting Features:**
- [ ] SUPPORT-01: Team/player selection from GRID tournament data (LCS, LEC, LCK, LPL)
- [ ] FEAT-02: Champion pool analysis for pre-match opponent scouting
- [ ] FEAT-01: Draft simulator interface with LoL-authentic UI

**Data Pipeline:**
- [ ] DATA-01: GRID.gg API integration (Central Data, Series State)
- [ ] DATA-02: ETL pipeline for tournament, team, player, and draft data
- [ ] DATA-03: Pre-computed synergy matrices and champion statistics
- [ ] DATA-04: Player champion pool aggregation
- [ ] CORE-01: Synergy scores and matchup advantages (computed from data)

**Infrastructure:**
- [ ] INFRA-01: Supabase PostgreSQL schema for all entities
- [ ] INFRA-02: Real-time draft state management
- [ ] API-01: API routes for recommendations, predictions, and win-rate calculations

### Out of Scope

- Real-time chat/collaboration features — focus on single-user draft simulation
- Mobile app — web-first, responsive but not native mobile
- OAuth/social login — public application, no auth needed for hackathon
- Live tournament stream integration — pre-match simulation only
- Advanced ML models (deep learning) — heuristics-first, ML if time permits
- Item build recommendations — draft phase only, not in-game

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 3 | Pending |
| API-01 | Phase 3 | Pending |
| CORE-01 | Phase 2 | Pending |
| CORE-02 | Phase 4 | Pending |
| CORE-03 | Phase 4 | Pending |
| CORE-04 | Phase 4 | Pending |
| FEAT-01 | Phase 5 | Pending |
| FEAT-02 | Phase 5 | Pending |
| SUPPORT-01 | Phase 5 | Pending |

## Context

**Competition:** Cloud9 x JetBrains Hackathon - Category 3 (Drafting Assistant/Predictor)

**Data Source:** GRID.gg APIs providing LCS, LEC, LCK, LPL tournament data from 2024-2025. Approximately 1,500-2,000 professional series available across ~30 tournament IDs.

**Target Users:** Professional LoL coaches conducting draft prep, team analysts building scouting reports, players practicing champion pool strategies.

**Existing Documentation:** Comprehensive BRD at `docs/synapse_brd.md` with detailed feature specs, database schema, API response formats, and demo scenarios.

**Codebase State:** Greenfield Next.js 16 + React 19 + TailwindCSS 4 project. No application code yet — template only.

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

---
*Last updated: 2026-01-28 after roadmap creation*
