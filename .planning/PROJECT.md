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
- [ ] Real-time pick/ban recommendations with synergy scores and matchup advantages
- [ ] Opponent pick prediction with probability distributions based on player history
- [ ] Live win-rate projection that updates with each pick/ban

**Supporting Features:**
- [ ] Team/player selection from GRID tournament data (LCS, LEC, LCK, LPL)
- [ ] Champion pool analysis for pre-match opponent scouting
- [ ] Draft simulator interface with LoL-authentic UI

**Data Pipeline:**
- [ ] GRID.gg API integration (Central Data, Series State)
- [ ] ETL pipeline for tournament, team, player, and draft data
- [ ] Pre-computed synergy matrices and champion statistics
- [ ] Player champion pool aggregation

**Infrastructure:**
- [ ] Supabase PostgreSQL schema for all entities
- [ ] Real-time draft state management
- [ ] API routes for recommendations, predictions, and win-rate calculations

### Out of Scope

- Real-time chat/collaboration features — focus on single-user draft simulation
- Mobile app — web-first, responsive but not native mobile
- OAuth/social login — public application, no auth needed for hackathon
- Live tournament stream integration — pre-match simulation only
- Advanced ML models (deep learning) — heuristics-first, ML if time permits
- Item build recommendations — draft phase only, not in-game

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
| Vercel + Supabase instead of Python FastAPI | Simpler deployment, single-language stack (TypeScript), faster iteration | — Pending |
| Heuristics-first predictions | Achievable in timeline, transparent reasoning, ML can be added later | — Pending |
| Single-page draft simulator as MVP | Core value is the draft experience; other pages can follow | — Pending |
| Pre-computed synergy/matchup matrices | Reduces real-time compute, enables fast recommendations | — Pending |

---
*Last updated: 2026-01-28 after initialization*
