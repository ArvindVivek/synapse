# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Full-stack modern web application using Next.js 16 (React 19) frontend with planned Python FastAPI backend.

**Key Characteristics:**
- Client-side React components with server-side Next.js routing
- Planned microservice architecture with API layer separation
- Real-time updates via WebSocket (planned)
- Machine learning integration for draft analysis (planned backend)
- Data-driven decision support system

## Layers

**Frontend Layer:**
- Purpose: Professional League of Legends draft simulation UI
- Location: `app/` directory
- Contains: React components, page routing, styling
- Depends on: Next.js 16, React 19, TailwindCSS v4, PostCSS
- Used by: End users (coaches, analysts, esports teams)

**Presentation Layer (Planned):**
- Purpose: Serve API responses and format recommendations
- Location: `app/api/` (to be created)
- Contains: API route handlers for draft recommendations, win-rate calculations, opponent predictions
- Depends on: Backend FastAPI service (external)
- Used by: Frontend components via fetch/WebSocket

**Backend Service Layer (Planned):**
- Purpose: Core intelligence engine for draft analysis
- Location: External Python service (not yet created)
- Contains: Champion synergy calculator, win-rate predictor, opponent pick predictor
- Depends on: PostgreSQL database, Redis cache, ML models
- Used by: API routes and WebSocket handlers

**Data Layer (Planned):**
- Purpose: Persistent storage and real-time cache
- Location: PostgreSQL + Redis (external)
- Contains: Tournament data, team/player stats, champion pools, synergy matrices, match outcomes
- Depends on: GRID.gg APIs for ETL pipeline
- Used by: Backend intelligence engine

## Data Flow

**Draft Simulation Flow:**

1. User selects teams → Frontend renders team/player selectors
2. User initiates draft → Frontend sends `draft/initialize` action via WebSocket
3. User picks/bans champion → Frontend sends `ban` or `pick` action
4. Backend processes pick → Calculates synergies, matchups, win-rate changes
5. Backend generates recommendations → Queries synergy matrix, champion pools, ML model
6. Backend predicts opponent pick → Applies Bayesian weighting to player's champion pool
7. Backend calculates win-rate → Extracts composition features, runs ML model
8. Server broadcasts update → Sends draft state + recommendations + predictions + win-rate
9. Frontend renders update → Updates draft board, recommendation panel, win-rate gauge

**State Management:**
- Local state: Draft board state (bans, picks) stored in browser (planned Zustand store)
- Synchronized state: Live draft state maintained via WebSocket connection
- Computed state: Recommendations, predictions, win-rates calculated server-side (no client-side computation)

## Key Abstractions

**Draft State:**
- Purpose: Unified representation of current pick/ban phase
- Examples: `{ blueBans: [...], redBans: [...], bluePicks: [...], redPicks: [...], currentTurn: "R3" }`
- Pattern: Immutable state updates with history tracking for undo/redo

**Recommendation:**
- Purpose: Pick/ban suggestion with reasoning
- Examples: `{ champion: "Sejuani", predictedWinRate: 0.60, synergyScore: 9.2, reasoning: {...} }`
- Pattern: Scored suggestions ranked by predicted impact

**Opponent Prediction:**
- Purpose: Probabilistic forecast of opponent's next pick
- Examples: `{ champion: "Orianna", probability: 0.32, reasoning: "Most played (6/10 games)" }`
- Pattern: Probability distribution normalized to 1.0

**Team Composition Analysis:**
- Purpose: Feature extraction and scoring of 5v5 matchups
- Examples: `{ earlyGame: 0.8, midGame: 0.65, lateGame: 0.72, adDamage: 0.60, apDamage: 0.40, ccScore: 8.5 }`
- Pattern: Feature vectors used in ML model and heuristic evaluation

## Entry Points

**App Root:**
- Location: `app/layout.tsx`
- Triggers: Browser navigation to any route
- Responsibilities: Root HTML structure, font loading, global styling, metadata

**Home Page:**
- Location: `app/page.tsx`
- Triggers: Navigation to `/`
- Responsibilities: Placeholder landing page (to be replaced with draft simulator)

**Planned Entry Points (to be created):**
- `/draft-simulator` - Main draft simulation interface
- `/champion-pool-analyzer` - Pre-match opponent analysis
- `/api/draft/recommend-pick` - Pick recommendation API
- `/ws/draft` - WebSocket endpoint for real-time updates

## Error Handling

**Strategy:** Planned layered error handling with user-facing fallback UI

**Patterns:**
- **Frontend errors:** Try-catch in component lifecycle, error boundary components
- **Network errors:** Exponential backoff for API retries, WebSocket reconnection logic
- **Backend errors:** Detailed error responses with reasoning (e.g., "Champion pool too sparse, using meta defaults")
- **Validation errors:** Input validation before API calls, clear error messages to users
- **Model errors:** Confidence scores on predictions, fallback to rule-based recommendations if ML fails

## Cross-Cutting Concerns

**Logging:**
- Frontend: Browser console during dev, structured logging service for production (to be implemented)
- Backend: Python logging module with JSON formatting (to be implemented)

**Validation:**
- Draft state validation: Enforce champion uniqueness, ban before pick constraints, role restrictions
- Input validation: Sanitize team/player IDs, validate champion names against master list
- API contract validation: Ensure response schemas match expected types

**Authentication:**
- Currently: None (public application)
- Planned: Session management for team accounts (optional future feature)

---

*Architecture analysis: 2026-01-28*
