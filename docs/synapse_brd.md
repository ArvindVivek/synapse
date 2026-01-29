# LoL AI Drafting Assistant - Category 3
## Business Requirements Document & Technical Implementation Plan

---

## Executive Summary

**Project Name:** DraftIQ - AI-Powered League of Legends Drafting Assistant  
**Target Competition:** Cloud9 x JetBrains Hackathon - Category 3: Drafting Assistant/Predictor  
**Game Title:** League of Legends  
**Data Source:** GRID.gg APIs (LCS, LEC, LCK, LPL tournaments, past 2 years)  
**Target Users:** Professional LoL coaches, analysts, and competitive teams  
**Core Value Proposition:** Real-time draft recommendations powered by historical data analysis, champion synergies, player pool analysis, and predictive win-rate modeling to optimize pick/ban phase decisions.

---

## 1. Business Requirements

### 1.1 Product Vision

DraftIQ transforms professional League of Legends draft preparation from guesswork into data-driven strategy. The tool provides three critical capabilities:

1. **Real-Time Draft Recommendations** - Suggests optimal picks/bans based on current draft state, opponent tendencies, and historical performance
2. **Turn-by-Turn Prediction** - Predicts opponent's next likely picks with probability distribution
3. **Live Win-Rate Projection** - Displays predicted match outcome percentage based on evolving team compositions

The tool serves as both a practice simulator for pre-match preparation and a real-time decision support system during live draft phases.

### 1.2 Target Users & Use Cases

**Primary Users:**
- Professional LoL coaches conducting draft preparation
- Team analysts building opponent scouting reports
- Players practicing champion pool strategies
- Esports organizations preparing for tournament matches

**Key Use Cases:**
1. **Pre-Match Preparation:** Coach simulates draft scenarios against upcoming opponent (e.g., C9 vs T1), tests different pick/ban strategies
2. **Live Draft Support:** Real-time recommendations during actual pick/ban phase, suggesting highest-impact bans/picks turn-by-turn
3. **Player Pool Analysis:** Identify opponent player champion preferences, ban-worthy comfort picks
4. **Counter-Draft Strategy:** Recommend counter-picks based on enemy composition and historical matchup data
5. **Practice Tool:** Players simulate various draft scenarios to understand team composition strengths/weaknesses

### 1.3 Success Criteria

**Hackathon Judging Criteria:**
- ✅ Successfully processes GRID tournament data (LCS, LEC, LCK, LPL)
- ✅ Provides turn-by-turn draft recommendations with data-backed reasoning
- ✅ Predicts opponent picks with probability distributions
- ✅ Displays real-time win-rate projections
- ✅ Professional UI simulating actual LoL draft interface
- ✅ Demonstrates clear value for coaching workflows

**Bonus Points:**
- High prediction accuracy for opponent picks (>60% top-3 accuracy)
- Sophisticated synergy/counter-pick algorithms
- Integration with actual patch data for meta-relevance
- Novel champion pool analysis techniques

---

## 2. Functional Requirements

### 2.1 Core Feature 1: Optimal Pick/Ban Recommendations

**Description:** Analyze current draft state and provide ranked recommendations for next pick/ban with win-rate impact.

**Input:**
- Current draft state (bans, picks by both teams)
- Draft phase (ban phase 1, pick phase, ban phase 2)
- Blue side vs Red side designation
- Opponent team ID
- Optional: Specific player role to pick for

**Processing:**
1. Load opponent's historical data:
   - Champion pool by player/role
   - Recent performance (last 15 games)
   - Champion-specific win rates
   - Comfort picks (>5 games played)
2. Calculate champion synergies with current allied picks:
   - CC chain potential
   - Damage type diversity (AD/AP balance)
   - Frontline/backline composition
   - Engage/disengage capabilities
3. Evaluate counter-pick matchups:
   - Lane matchup win rates
   - Teamfight effectiveness
   - Historical head-to-head data
4. Calculate win-rate impact for each candidate champion:
   - Base win rate with current composition
   - Synergy bonuses
   - Counter-pick bonuses
   - Meta strength (patch-based)

**Output Format:**
```
═══════════════════════════════════════════════════
RECOMMENDED R3 PICK (Red Side - Jungle)
═══════════════════════════════════════════════════

Current Draft State:
BLUE (Enemy): Bans: Galio | Picks: Jinx, Rell, Viego
RED (Us):     Bans: Corki, Nautilus | Picks: Ashe, Braum

RECOMMENDATIONS:
───────────────────────────────────────────────────

1. SEJUANI                        Predicted WR: 60%
   ─────────────────────────────────────────────────
   Synergy Score: 9.2/10
   • High synergy CC chain with Ashe (Frost Shot) + Braum (Concussive Blows)
   • Passive synergy: Permafrost procs trigger Ashe's bonus damage
   • Strong frontline vs enemy dive comp (Viego, Rell)
   
   Matchup Advantage: +8%
   • Favorable vs Viego jungle (56% win rate in 23 games)
   • Can contest early drakes with superior CC
   
   Team Composition:
   • Adds AP damage (current draft is full AD)
   • Provides engage/peel flexibility
   • Excellent objective control
   
   Historical Data:
   • 67% win rate in 18 games with Ashe/Braum
   • 15-3 record when picked vs Viego jungle
   ─────────────────────────────────────────────────

2. MAOKAI                         Predicted WR: 58%
   ─────────────────────────────────────────────────
   Synergy Score: 8.5/10
   • Excellent gank setup for Ashe/Braum bot lane
   • W (Twisted Advance) enables guaranteed Braum passive
   • Ultimate (Nature's Grasp) synergizes with Ashe engage
   
   Matchup Advantage: +6%
   • Strong counter-engage vs Rell/Viego teamfight
   • Sapling Vision Control counters early jungle invades
   
   Team Composition:
   • Adds AP damage + tankiness
   • Superior teamfight zone control
   
   Historical Data:
   • 71% win rate when paired with Braum (14 games)
   • 12-5 record vs Rell compositions
   ─────────────────────────────────────────────────

3. RYZE                           Predicted WR: 58%
   ─────────────────────────────────────────────────
   Synergy Score: 7.8/10
   • Galio ban suggests opponent may value Ryze
   • DENY PICK: Prevent enemy from taking high-priority mid
   
   Meta Advantage: +7%
   • Current patch favors scaling mages
   • Strong into Viego (can root during possession)
   
   Team Composition:
   • Adds critical AP damage
   • Realm Warp enables Ashe/Braum engage plays
   
   Risk Assessment:
   ⚠ Requires skilled pilot (high execution floor)
   ⚠ Team lacks early game pressure if Ryze scales
   
   Historical Data:
   • Enemy mid player has 0% win rate vs Ryze (3 games)
   • 9-2 record when denying Ryze from opponent
   ─────────────────────────────────────────────────

4. JARVAN IV                      Predicted WR: 53%
   ─────────────────────────────────────────────────
   Synergy Score: 7.0/10
   • High gank pressure to snowball bot lane
   • Cataclysm can lock down Jinx in teamfights
   
   Matchup Advantage: +3%
   • Even matchup vs Viego (51% win rate)
   • Early game focused (may fall off late)
   
   Team Composition:
   ⚠ WARNING: Still full AD (no AP damage)
   • Strong engage but lacks peel
   
   Historical Data:
   • 13-11 record with Ashe/Braum
   • Opponent team has 68% win rate vs J4 (19 games)
   ─────────────────────────────────────────────────

⚠ DRAFT WARNINGS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• CRITICAL: Team needs AP damage (currently 0% magic damage)
• Consider AP jungler (Sejuani) or flex Ziggs bot in R4/R5
• Enemy has strong physical damage mitigation (Braum E, Viego W)

NEXT PICKS TO CONSIDER:
• R4/R5: AP Mid (Syndra, Orianna, Viktor) OR AP Top (Gwen, Kennen)
```

**Technical Requirements:**
- Champion synergy database (pre-calculated from historical data)
- Real-time win-rate calculator
- Matchup matrix (champion vs champion win rates)
- Meta tier list integration (patch-based)
- Player champion pool database

### 2.2 Core Feature 2: Opponent Pick Prediction

**Description:** Predict opponent's next likely pick with probability distribution based on their tendencies and draft state.

**Input:**
- Current draft state
- Opponent team ID
- Opponent player/role to predict for
- Recent match history (last 10-15 games)

**Processing:**
1. Analyze opponent player's champion pool:
   - Most played champions (frequency)
   - Recent picks (last 5 games)
   - High win-rate champions (>60% WR with >3 games)
   - Signature/comfort picks
2. Filter by draft constraints:
   - Already banned champions
   - Already picked champions
   - Role-specific champions
3. Contextual analysis:
   - What champions synergize with their current picks?
   - What champions counter our picks?
   - What champions fit their typical team composition style?
4. Calculate probability distribution:
   - Weighted by: Recent usage (40%), Win rate (30%), Synergy (20%), Meta strength (10%)
   - Normalize to probability percentages

**Output Format:**
```
═══════════════════════════════════════════════════
OPPONENT PICK PREDICTION: Blue Side - B4 (Mid Lane)
═══════════════════════════════════════════════════

Player: Faker (T1)
Current Blue Comp: Jinx, Rell, Viego
Available Bans: None targeting mid lane

PREDICTED PICKS (Probability Distribution):
───────────────────────────────────────────────────

1. ORIANNA                                    32%
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 32%
   
   Reasoning:
   • Most played mid in last 10 games (6 appearances)
   • 83% win rate (5-1 record)
   • HIGH SYNERGY: Shockwave + Rell engage = wombo combo
   • Ball delivery via Viego possession = advanced tactic
   • Faker signature champion (47 games this season)
   
   Counter-Strategy:
   → If picked, consider Sylas (steal Shockwave)
   → Ban on B5 if critical
   ───────────────────────────────────────────────────

2. AZIR                                       24%
   ━━━━━━━━━━━━━━━━━━━━━━━━━━ 24%
   
   Reasoning:
   • Second most played (4 games in last 10)
   • 100% win rate (4-0 record) - COMFORT PICK
   • Synergy: Emperor's Divide zone control + Rell CC lockdown
   • Meta advantage: Current patch buffs Azir scaling
   • T1's preferred scaling comp strategy
   
   Counter-Strategy:
   → Consider Zed or Talon (high burst vs low mobility)
   → Priority ban if allowing scaling comp is risky
   ───────────────────────────────────────────────────

3. SYNDRA                                     18%
   ━━━━━━━━━━━━━━━━━━━ 18%
   
   Reasoning:
   • High priority flex pick (mid/support)
   • 71% win rate (5-2 record this split)
   • COUNTER PICK: Strong vs immobile mages
   • Galio ban suggests avoiding teamfight mages
   
   Counter-Strategy:
   → Pick mobile assassin (Akali, Zed) if Syndra appears likely
   ───────────────────────────────────────────────────

4. TWISTED FATE                               15%
   ━━━━━━━━━━━━━━━ 15%
   
   Reasoning:
   • Recent emergence (2 picks in last 3 games)
   • 100% win rate (2-0)
   • STRATEGIC PICK: Destiny enables Viego gank setup
   • Provides global pressure to support Jinx scaling
   
   Counter-Strategy:
   → Consider Kassadin (hard counter post-6)
   → Ward defensively to counter Destiny roams
   ───────────────────────────────────────────────────

5. VIKTOR                                     11%
   ━━━━━━━━━━━ 11%
   
   Reasoning:
   • Scaling pick (fits T1's late-game style)
   • 67% win rate (4-2 record)
   • Provides AP damage + zone control
   
   Counter-Strategy:
   → Early jungle pressure to prevent scaling
   ───────────────────────────────────────────────────

⚠ ALERT: Galio ban highly unusual for this player
→ Likely indicates priority on teamfight disruption mages
→ Expect Orianna or Azir with >55% combined probability

RECOMMENDED BAN (if B5 available):
→ Orianna (highest probability + highest synergy threat)
```

**Technical Requirements:**
- Player champion pool database with role-specific filters
- Bayesian probability calculation for pick prediction
- Synergy analysis engine
- Recent performance weighting algorithm

### 2.3 Core Feature 3: Live Win-Rate Projection

**Description:** Display real-time predicted match win percentage based on current draft composition and update dynamically with each pick/ban.

**Input:**
- Complete draft state (all bans and picks)
- Team compositions (both sides)
- Historical match data

**Processing:**
1. Extract features from current draft:
   - Team composition characteristics:
     - Early/Mid/Late game power curve
     - AD/AP damage distribution
     - Engage/Disengage capabilities
     - Frontline/Backline balance
     - Crowd control density
     - Mobility profile
   - Individual champion win rates
   - Champion synergy scores
   - Head-to-head matchup advantages
2. Load historical similar compositions:
   - Query database for similar 5v5 team comps
   - Calculate similarity score (champion overlap, archetype match)
   - Weight by recency and patch relevance
3. Calculate win probability:
   - Base model: Logistic regression on composition features
   - Synergy adjustment: +/- based on champion interactions
   - Matchup adjustment: +/- based on lane/role advantages
   - Player skill adjustment: +/- based on player historical performance
   - Side adjustment: Blue vs Red side win rate differential

**Output Format:**
```
╔════════════════════════════════════════════════════════════╗
║               LIVE DRAFT WIN-RATE PROJECTION               ║
╚════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────┐
│                     CURRENT WIN RATE                       │
│                                                            │
│                   RED SIDE (Us): 58%                       │
│                 BLUE SIDE (Them): 42%                      │
│                                                            │
│  BLUE ████████████████████────────────────── RED          │
│       42%                                    58%           │
└────────────────────────────────────────────────────────────┘

DRAFT STATE: 6/10 Picks Complete
───────────────────────────────────────────────────────────

BLUE (Enemy):  [BAN] Galio, Renekton, Aphelios
               [PICK] Jinx, Rell, Viego

RED (Us):      [BAN] Corki, Nautilus, Yone
               [PICK] Ashe, Braum, Sejuani

WIN RATE BREAKDOWN:
───────────────────────────────────────────────────────────

Base Composition Strength:                        +8%
  • Strong frontline (Sejuani, Braum)
  • Excellent CC chain potential
  • Balanced damage (60% AD, 40% AP)

Champion Synergies:                               +12%
  • Ashe + Sejuani = Permafrost wombo combo
  • Braum + Sejuani = Passive stack synergy
  • Historical WR: 73% in 22 games (LCK, LPL data)

Matchup Advantages:                               +6%
  • Sejuani vs Viego: +8% (favorable jungle matchup)
  • Ashe vs Jinx: +4% (early lane pressure)
  • Braum nullifies Jinx Rocket poke

Side Advantage (Red Side):                        +2%
  • Red side counter-pick advantage
  • Historical 52% win rate on red side (current patch)

Player Skill Adjustment:                          -3%
  • Enemy jungler (Canyon) 68% WR on Viego (34 games)
  • Our mid laner 58% WR this split (slightly unfavored)

CONFIDENCE: Medium (6/10 picks complete)
  • High confidence after 10/10 picks complete
  • Remaining picks can swing WR by ±15%

PROJECTED OUTCOME IF DRAFT CONTINUES:
───────────────────────────────────────────────────────────

Scenario A: We pick AP Mid + Tank Top
  → Win Rate: 62% ↑
  → Balanced comp with strong teamfight

Scenario B: We pick AD Mid + AD Top
  → Win Rate: 49% ↓
  → WARNING: Full AD comp (easily countered with armor)

Scenario C: Enemy picks Orianna + Tank Top
  → Win Rate: 54% ↓
  → Orianna + Rell combo threat reduces our advantage

NEXT PICK IMPACT SIMULATOR:
───────────────────────────────────────────────────────────
If we pick...           Projected WR    Change
─────────────────────────────────────────────────
Orianna (Mid)             61%          +3%
Syndra (Mid)              60%          +2%
Viktor (Mid)              59%          +1%
Zed (Mid)                 52%          -6%  ⚠ Full AD risk
```

**Technical Requirements:**
- Machine learning model trained on historical draft outcomes
- Feature extraction from champion compositions
- Real-time prediction API
- Win-rate visualization component
- Scenario simulation engine

### 2.4 Supporting Feature: Champion Pool Analysis

**Description:** Pre-match preparation tool to analyze opponent player champion pools and identify ban priorities.

**Output Format:**
```
═══════════════════════════════════════════════════
OPPONENT CHAMPION POOL ANALYSIS: Faker (T1 - Mid)
═══════════════════════════════════════════════════

Tournament: LCK Spring 2025 (Last 15 Games)

TOP PRIORITY BANS:
───────────────────────────────────────────────────

1. AZIR                    ⚠ CRITICAL BAN PRIORITY
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Games Played: 8/15 (53% pick rate)
   Win Rate: 100% (8-0)
   Avg KDA: 7.2
   Avg CS@15: 112 (top 5% in league)
   
   Why Ban:
   • UNDEFEATED comfort pick
   • Enables T1's scaling strategy
   • Faker has 89% career win rate on Azir (127 games)
   • Provides safe lane + teamfight control
   
   Impact if Left Open: -15% win probability

2. ORIANNA                 ⚠ HIGH BAN PRIORITY
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Games Played: 6/15 (40% pick rate)
   Win Rate: 83% (5-1)
   Avg KDA: 6.8
   
   Why Ban:
   • Second-most played, high win rate
   • Synergizes with T1's engage compositions
   • Shockwave = teamfight win condition
   
   Impact if Left Open: -12% win probability

COMFORT PICKS (Medium Priority):
───────────────────────────────────────────────────

3. Syndra        4 games  |  75% WR  |  6.5 KDA
4. Viktor        3 games  |  67% WR  |  5.2 KDA
5. Twisted Fate  2 games  |  100% WR |  8.0 KDA

FLEX PICKS (Can Play Multiple Roles):
───────────────────────────────────────────────────
• Syndra (Mid/Support)
• Swain (Mid/Support/Top)

CHAMPION POOL DEPTH: 12 unique champions
  → Deep pool (difficult to ban out completely)
  → Recommended strategy: Target top 2 comfort picks

BAN STRATEGY RECOMMENDATIONS:
───────────────────────────────────────────────────

Option A: COMFORT BAN (Recommended)
  • Ban Azir + Orianna
  • Force Faker onto lower-winrate picks
  • Expected impact: +18% win probability

Option B: META BAN
  • Ban current S-tier mids (Corki, Viktor)
  • Allow Faker comfort but deny meta power picks
  • Risky: Faker excels on comfort picks

Option C: SYNERGY DISRUPTION
  • Ban Orianna (teamfight synergy with engage supports)
  • Ban Twisted Fate (global pressure enabler)
  • Forces Faker into scaling-only picks
```

---

## 3. Data Architecture

### 3.1 Available GRID APIs

**1. Central Data API (GraphQL)**
- Base URL: `https://api-op.grid.gg/central-data/graphql`
- Authentication: `x-api-key` header
- Purpose: Tournament, team, player, series metadata

**2. Series State API (GraphQL)**
- Base URL: `https://api-op.grid.gg/live-data-feed/series-state/graphql`
- Authentication: `x-api-key` header
- Purpose: Post-match states (picks/bans, final stats)

**3. File Download API (REST)**
- Base URL: `https://api.grid.gg`
- Authentication: `x-api-key` header
- Purpose: Complete event timeline (JSONL format)

### 3.2 League of Legends Specific Data

**Key Events to Track:**
- `team-picked-character` - Champion pick during draft
- `team-banned-character` - Champion ban during draft
- `player-killed-player` - Champion performance in-game
- `player-completed-destroyTower` - Objective control
- `player-purchased-item` - Build paths and itemization
- `player-completed-increaseLevel` - Power spikes
- `team-completed-slayBaron/Drake` - Macro play success

**Series State Key Fields:**
```graphql
{
  seriesState {
    games {
      teams {
        characterBans  # Draft phase bans
        players {
          characterName  # Champion picked
          kills, deaths, assists
          netWorth
          items
          role
        }
      }
    }
  }
}
```

### 3.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│              USER INTERFACE (Draft Simulator)            │
│        React + Next.js + LoL Draft UI Components        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND API LAYER                       │
│              (Python FastAPI / Flask)                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │      GRID API Integration Service                 │  │
│  │  • Central Data: Tournament/Team/Player queries   │  │
│  │  • Series State: Draft + match outcome data       │  │
│  │  • File Download: Event-level item/objective data │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │                                    │
│                     ▼                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Draft Intelligence Engine                 │  │
│  │  • Champion Pool Analyzer                         │  │
│  │  • Synergy Calculator                             │  │
│  │  • Counter-Pick Recommender                       │  │
│  │  • Win-Rate Predictor (ML Model)                  │  │
│  │  • Opponent Pick Predictor (Bayesian)             │  │
│  └──────────────────┬───────────────────────────────┘  │
│                     │                                    │
│                     ▼                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Database Layer                          │  │
│  │  • PostgreSQL: Match history, champion stats      │  │
│  │  • Redis: Real-time draft state caching           │  │
│  │  • Pre-computed: Synergy matrices, win rates      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     ▲
                     │
                     │ (One-time ETL + Daily Updates)
                     │
┌─────────────────────────────────────────────────────────┐
│                  GRID.GG APIs                            │
│                                                          │
│  • LCS, LEC, LCK, LPL tournaments (2024-2025)           │
│  • ~30 tournament IDs                                   │
│  • ~1,500-2,000 professional series                     │
│  • ~150 unique champions in competitive meta            │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Database Schema

```sql
-- Core tables for LoL draft data

CREATE TABLE tournaments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    league VARCHAR(50), -- LCS, LEC, LCK, LPL
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    patch_version VARCHAR(20),
    metadata JSONB
);

CREATE TABLE teams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    short_name VARCHAR(10),
    region VARCHAR(50),
    logo_url TEXT,
    metadata JSONB
);

CREATE TABLE players (
    id VARCHAR(50) PRIMARY KEY,
    nickname VARCHAR(255),
    real_name VARCHAR(255),
    team_id VARCHAR(50) REFERENCES teams(id),
    role VARCHAR(20), -- top, jungle, mid, adc, support
    region VARCHAR(50),
    metadata JSONB
);

CREATE TABLE series (
    id VARCHAR(50) PRIMARY KEY,
    tournament_id VARCHAR(50) REFERENCES tournaments(id),
    team_a_id VARCHAR(50) REFERENCES teams(id),
    team_b_id VARCHAR(50) REFERENCES teams(id),
    winner_id VARCHAR(50),
    start_time TIMESTAMP,
    patch_version VARCHAR(20),
    best_of INT,
    metadata JSONB
);

CREATE TABLE games (
    id VARCHAR(50) PRIMARY KEY,
    series_id VARCHAR(50) REFERENCES series(id),
    game_number INT,
    blue_team_id VARCHAR(50) REFERENCES teams(id),
    red_team_id VARCHAR(50) REFERENCES teams(id),
    winning_team_id VARCHAR(50),
    duration_seconds INT,
    patch_version VARCHAR(20),
    game_version VARCHAR(50)
);

-- CRITICAL TABLE: Draft phase data
CREATE TABLE draft_phases (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) REFERENCES games(id),
    blue_team_id VARCHAR(50) REFERENCES teams(id),
    red_team_id VARCHAR(50) REFERENCES teams(id),
    
    -- Bans (Phase 1: 3 bans, Phase 2: 2 bans per team)
    blue_ban1 VARCHAR(50),
    blue_ban2 VARCHAR(50),
    blue_ban3 VARCHAR(50),
    blue_ban4 VARCHAR(50),
    blue_ban5 VARCHAR(50),
    
    red_ban1 VARCHAR(50),
    red_ban2 VARCHAR(50),
    red_ban3 VARCHAR(50),
    red_ban4 VARCHAR(50),
    red_ban5 VARCHAR(50),
    
    -- Picks (Snake draft: B1, R1-R2, B2-B3, R3-R4, B4-B5, R5)
    blue_pick1 VARCHAR(50),
    blue_pick2 VARCHAR(50),
    blue_pick3 VARCHAR(50),
    blue_pick4 VARCHAR(50),
    blue_pick5 VARCHAR(50),
    
    red_pick1 VARCHAR(50),
    red_pick2 VARCHAR(50),
    red_pick3 VARCHAR(50),
    red_pick4 VARCHAR(50),
    red_pick5 VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Map picks to players/roles
CREATE TABLE champion_picks (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) REFERENCES games(id),
    player_id VARCHAR(50) REFERENCES players(id),
    team_id VARCHAR(50) REFERENCES teams(id),
    champion_name VARCHAR(100),
    role VARCHAR(20),
    pick_order INT, -- 1-10 in draft sequence
    kills INT,
    deaths INT,
    assists INT,
    cs INT,
    gold INT,
    damage_dealt INT,
    vision_score INT,
    items JSONB,
    won BOOLEAN
);

-- Champion statistics aggregation
CREATE TABLE champion_stats (
    id SERIAL PRIMARY KEY,
    champion_name VARCHAR(100),
    patch_version VARCHAR(20),
    role VARCHAR(20),
    
    -- Aggregate stats
    games_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL,
    
    -- Performance metrics
    avg_kda DECIMAL,
    avg_kills DECIMAL,
    avg_deaths DECIMAL,
    avg_assists DECIMAL,
    avg_cs_15 DECIMAL,
    avg_gold DECIMAL,
    
    -- Ban/pick rates
    pick_rate DECIMAL,
    ban_rate DECIMAL,
    
    -- Meta tier
    tier VARCHAR(10), -- S, A, B, C, D
    
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(champion_name, patch_version, role)
);

-- Player champion pool
CREATE TABLE player_champion_pool (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES players(id),
    champion_name VARCHAR(100),
    role VARCHAR(20),
    tournament_id VARCHAR(50),
    
    -- Statistics
    games_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    win_rate DECIMAL,
    avg_kda DECIMAL,
    
    -- Comfort level indicators
    pick_frequency DECIMAL, -- % of games on this champion
    recent_picks INT, -- picks in last 10 games
    
    last_played TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(player_id, champion_name, tournament_id)
);

-- Pre-computed synergy matrix
CREATE TABLE champion_synergies (
    id SERIAL PRIMARY KEY,
    champion_a VARCHAR(100),
    champion_b VARCHAR(100),
    
    -- Synergy metrics
    games_together INT DEFAULT 0,
    wins_together INT DEFAULT 0,
    win_rate DECIMAL,
    
    -- Synergy score (0-10)
    synergy_score DECIMAL,
    
    -- Categorization
    synergy_type VARCHAR(50), -- cc_chain, poke, engage, disengage, split_push
    
    patch_version VARCHAR(20),
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(champion_a, champion_b, patch_version)
);

-- Counter-pick matchup matrix
CREATE TABLE champion_matchups (
    id SERIAL PRIMARY KEY,
    champion VARCHAR(100),
    opponent VARCHAR(100),
    role VARCHAR(20),
    
    -- Matchup stats
    games_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    win_rate DECIMAL,
    
    -- Matchup advantage
    advantage_score DECIMAL, -- -10 to +10 (negative = counter, positive = favorable)
    
    patch_version VARCHAR(20),
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(champion, opponent, role, patch_version)
);

-- Draft outcome predictions (for ML training)
CREATE TABLE draft_outcomes (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) REFERENCES games(id),
    
    -- Blue side composition features
    blue_comp_early_game DECIMAL,
    blue_comp_mid_game DECIMAL,
    blue_comp_late_game DECIMAL,
    blue_comp_engage DECIMAL,
    blue_comp_disengage DECIMAL,
    blue_comp_ad_damage DECIMAL,
    blue_comp_ap_damage DECIMAL,
    blue_comp_cc_score DECIMAL,
    blue_comp_mobility DECIMAL,
    
    -- Red side composition features
    red_comp_early_game DECIMAL,
    red_comp_mid_game DECIMAL,
    red_comp_late_game DECIMAL,
    red_comp_engage DECIMAL,
    red_comp_disengage DECIMAL,
    red_comp_ad_damage DECIMAL,
    red_comp_ap_damage DECIMAL,
    red_comp_cc_score DECIMAL,
    red_comp_mobility DECIMAL,
    
    -- Outcome
    blue_team_won BOOLEAN,
    game_duration INT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_series_tournament ON series(tournament_id);
CREATE INDEX idx_games_series ON games(series_id);
CREATE INDEX idx_draft_game ON draft_phases(game_id);
CREATE INDEX idx_picks_game ON champion_picks(game_id);
CREATE INDEX idx_picks_player ON champion_picks(player_id);
CREATE INDEX idx_picks_champion ON champion_picks(champion_name);
CREATE INDEX idx_stats_champion ON champion_stats(champion_name, patch_version);
CREATE INDEX idx_pool_player ON player_champion_pool(player_id);
CREATE INDEX idx_synergies_champs ON champion_synergies(champion_a, champion_b);
CREATE INDEX idx_matchups_champs ON champion_matchups(champion, opponent, role);
```

---

## 4. Technical Implementation Plan

### 4.1 Technology Stack

**Frontend:**
- Framework: Next.js 14 (React)
- Styling: TailwindCSS + custom LoL draft UI components
- State Management: Zustand (lightweight, perfect for draft state)
- Real-time Updates: Socket.io client (for live draft simulation)
- Data Visualization: Recharts + custom win-rate gauge
- Theme: League of Legends official design system colors

**Backend:**
- Framework: Python FastAPI
- Database: PostgreSQL 15+
- Cache: Redis (draft state caching)
- ML Framework: scikit-learn (win-rate prediction model)
- Task Queue: Celery (background data processing)
- WebSocket: Socket.io (real-time draft updates)

**Machine Learning:**
- Win-Rate Prediction: Logistic Regression / Gradient Boosting
- Pick Prediction: Naive Bayes / Decision Trees
- Feature Engineering: Champion composition vectorization
- Training Data: ~1,500-2,000 professional games

**Infrastructure:**
- Deployment: Vercel (frontend) + Railway/Render (backend)
- Database Hosting: Supabase or Railway
- Environment: Docker containers
- ML Model Serving: FastAPI endpoint with cached predictions

### 4.2 Implementation Phases

#### Phase 1: Data Ingestion & Processing (Days 1-2)

**Objective:** Build ETL pipeline to fetch and process GRID tournament data for LoL

**Tasks:**

1. **Set up GRID API client**
   - Authentication configuration
   - GraphQL query builder
   - Rate limit handling

2. **Fetch tournament data**
   - Tournament IDs from hackathon list:
     ```
     LCK: 775192, 758024, 774794, 825490, 826679, 775623
     LCS: 758043, 774888
     LEC: 758077, 774622, 758041, 775075, 825468, 826906, 775513
     LPL: 775167, 758054, 774845, 775662, 825450, 826789
     LTA: 775631, 825567, 826763, 775636, 825600, 826775, 775878, 826782
     ```

3. **Extract draft phase data**
   - Query Series State API for each game
   - Parse `characterBans` and champion picks
   - Map picks to players/roles
   - Extract final game outcomes

4. **Parse match performance data**
   - Champion performance stats (KDA, CS, gold, items)
   - Objective control (towers, dragons, Baron)
   - Game duration and win conditions

5. **Build aggregation tables**
   - Champion win rates by patch/role
   - Player champion pools
   - Champion synergy matrix (co-occurrence analysis)
   - Counter-pick matchup matrix (champion A vs B win rates)

**Deliverables:**
- Python scripts: `etl/grid_client.py`, `etl/draft_processor.py`, `etl/aggregator.py`
- Database populated with ~1,500-2,000 games
- Champion stats for ~150 champions
- Player pools for ~200 professional players

#### Phase 2: Analytics & ML Models (Days 3-4)

**Objective:** Build core recommendation algorithms and predictive models

**Tasks:**

**2.1 Champion Synergy Calculator**
```python
def calculate_champion_synergy(champ_a: str, champ_b: str, patch: str) -> float:
    """
    Calculate synergy score (0-10) between two champions
    
    Factors:
    - Historical win rate when picked together
    - CC chain potential (hard CC > soft CC)
    - Damage type diversity (AD + AP = bonus)
    - Engage/disengage compatibility
    - Role synergies (e.g., engage support + AOE ADC)
    """
    # Load historical co-occurrence data
    games_together = query_games_with_both_champions(champ_a, champ_b, patch)
    
    if len(games_together) < 5:
        return 5.0  # Neutral score for insufficient data
    
    win_rate = calculate_win_rate(games_together)
    
    # Baseline: win rate above 50% = positive synergy
    synergy_score = 5.0 + (win_rate - 0.50) * 20
    
    # Bonus for known synergy types
    if has_cc_chain(champ_a, champ_b):
        synergy_score += 1.5
    
    if has_damage_diversity(champ_a, champ_b):
        synergy_score += 1.0
    
    return min(10.0, max(0.0, synergy_score))
```

**2.2 Counter-Pick Recommender**
```python
def recommend_counter_picks(
    enemy_champion: str,
    role: str,
    our_current_comp: List[str],
    patch: str
) -> List[Tuple[str, float, str]]:
    """
    Recommend counter-pick champions for a given enemy pick
    
    Returns: List of (champion_name, advantage_score, reasoning)
    """
    # Load matchup matrix
    matchups = query_matchup_matrix(role, patch)
    
    counters = []
    for candidate in matchups:
        if candidate.opponent == enemy_champion:
            advantage = candidate.win_rate - 0.50  # Deviation from 50%
            
            # Adjust for synergy with current comp
            synergy_bonus = calculate_team_synergy(candidate.champion, our_current_comp)
            
            total_score = advantage * 100 + synergy_bonus
            
            reasoning = generate_counter_reasoning(candidate, our_current_comp)
            
            counters.append((candidate.champion, total_score, reasoning))
    
    return sorted(counters, key=lambda x: x[1], reverse=True)[:5]
```

**2.3 Win-Rate Prediction Model**
```python
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler

def train_win_rate_model():
    """
    Train ML model to predict draft outcome
    
    Features:
    - Team composition characteristics (early/mid/late game power)
    - Damage distribution (AD/AP ratio)
    - CC density
    - Engage/disengage capabilities
    - Individual champion win rates
    - Synergy scores
    - Side (blue vs red)
    - Player historical performance
    """
    # Load training data
    X_train, y_train = load_draft_outcome_data()
    
    # Feature engineering
    features = extract_composition_features(X_train)
    
    # Train model
    model = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)
    
    model.fit(X_scaled, y_train)
    
    return model, scaler

def predict_win_rate(
    blue_comp: List[str],
    red_comp: List[str],
    patch: str,
    model,
    scaler
) -> float:
    """
    Predict win rate for blue side given current draft state
    """
    features = extract_composition_features({
        'blue_comp': blue_comp,
        'red_comp': red_comp,
        'patch': patch
    })
    
    X_scaled = scaler.transform([features])
    win_probability = model.predict_proba(X_scaled)[0][1]
    
    return win_probability
```

**2.4 Opponent Pick Predictor**
```python
def predict_opponent_pick(
    opponent_team_id: str,
    player_id: str,
    role: str,
    current_draft_state: dict,
    tournament_id: str
) -> List[Tuple[str, float, str]]:
    """
    Predict opponent's next pick with probability distribution
    
    Returns: List of (champion, probability, reasoning)
    """
    # Load player champion pool
    player_pool = query_player_champion_pool(player_id, tournament_id, role)
    
    # Filter by draft constraints
    available_champions = [
        champ for champ in player_pool
        if champ not in current_draft_state['bans']
        and champ not in current_draft_state['picks']
    ]
    
    predictions = []
    for champ_data in available_champions:
        # Calculate probability based on:
        # - Recent usage (40%)
        # - Win rate (30%)
        # - Synergy with current picks (20%)
        # - Meta strength (10%)
        
        recency_score = calculate_recency_score(champ_data.recent_picks, champ_data.last_played)
        wr_score = champ_data.win_rate
        synergy_score = calculate_team_synergy(
            champ_data.champion_name,
            current_draft_state['opponent_picks']
        )
        meta_score = get_meta_tier_score(champ_data.champion_name, current_draft_state['patch'])
        
        probability = (
            recency_score * 0.40 +
            wr_score * 0.30 +
            synergy_score * 0.20 +
            meta_score * 0.10
        )
        
        reasoning = generate_pick_prediction_reasoning(champ_data, current_draft_state)
        
        predictions.append((champ_data.champion_name, probability, reasoning))
    
    # Normalize probabilities to sum to 1.0
    total_prob = sum(p[1] for p in predictions)
    predictions = [(champ, prob/total_prob, reason) for champ, prob, reason in predictions]
    
    return sorted(predictions, key=lambda x: x[1], reverse=True)[:5]
```

**Deliverables:**
- Analytics modules: `analytics/synergy.py`, `analytics/counters.py`, `analytics/predictor.py`
- Trained ML model: `models/win_rate_model.pkl`
- Unit tests with sample draft scenarios
- Model accuracy report (>65% win-rate prediction accuracy target)

#### Phase 3: Backend API (Day 5)

**Objective:** Build RESTful API with WebSocket support for real-time draft

**API Endpoints:**

```python
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel

app = FastAPI()

# ============= REST API Endpoints =============

@app.get("/api/tournaments")
async def list_tournaments():
    """Return all LoL tournaments (LCS, LEC, LCK, LPL)"""
    pass

@app.get("/api/teams")
async def list_teams(tournament_id: str = None):
    """List teams, optionally filtered by tournament"""
    pass

@app.get("/api/teams/{team_id}/roster")
async def get_team_roster(team_id: str):
    """Get team roster with player roles"""
    pass

@app.get("/api/players/{player_id}/champion-pool")
async def get_player_champion_pool(
    player_id: str,
    tournament_id: str = None,
    role: str = None
):
    """
    Get player's champion pool with statistics
    Response: {
        "player": {...},
        "champions": [
            {
                "name": "Azir",
                "games_played": 8,
                "win_rate": 1.00,
                "avg_kda": 7.2,
                "pick_frequency": 0.53,
                "recent_picks": 4,
                "comfort_level": "high"
            }
        ]
    }
    """
    pass

@app.post("/api/draft/recommend-pick")
async def recommend_pick(request: PickRecommendationRequest):
    """
    Request body:
    {
        "current_draft": {
            "blue_bans": ["Galio", "Renekton"],
            "red_bans": ["Corki", "Nautilus"],
            "blue_picks": ["Jinx", "Rell", "Viego"],
            "red_picks": ["Ashe", "Braum"]
        },
        "side": "red",
        "role_to_pick": "jungle",
        "opponent_team_id": "team_t1",
        "patch": "14.1"
    }
    
    Response: {
        "recommendations": [
            {
                "champion": "Sejuani",
                "predicted_win_rate": 0.60,
                "synergy_score": 9.2,
                "matchup_advantage": 0.08,
                "reasoning": {
                    "synergies": ["CC chain with Ashe+Braum", "Permafrost passive synergy"],
                    "counters": ["Favorable vs Viego jungle (56% WR)"],
                    "team_comp": ["Adds AP damage", "Strong frontline"],
                    "warnings": []
                }
            }
        ]
    }
    """
    pass

@app.post("/api/draft/predict-opponent-pick")
async def predict_opponent_pick(request: OpponentPredictionRequest):
    """
    Request body:
    {
        "opponent_team_id": "team_t1",
        "player_id": "player_faker",
        "role": "mid",
        "current_draft": {...},
        "tournament_id": "758024",
        "pick_number": 4  # B4 in draft sequence
    }
    
    Response: {
        "predictions": [
            {
                "champion": "Orianna",
                "probability": 0.32,
                "reasoning": "Most played (6/10 games), high synergy with Rell engage",
                "counter_strategy": "Consider Sylas to steal Shockwave"
            }
        ]
    }
    """
    pass

@app.post("/api/draft/calculate-win-rate")
async def calculate_win_rate(request: WinRateRequest):
    """
    Request body:
    {
        "blue_comp": ["Jinx", "Rell", "Viego", "Orianna", "Gnar"],
        "red_comp": ["Ashe", "Braum", "Sejuani", "Syndra", "Sion"],
        "patch": "14.1",
        "blue_team_id": "team_t1",
        "red_team_id": "team_c9"
    }
    
    Response: {
        "blue_win_rate": 0.42,
        "red_win_rate": 0.58,
        "confidence": "high",
        "breakdown": {
            "base_composition": 0.08,
            "synergies": 0.12,
            "matchups": 0.06,
            "side_advantage": 0.02,
            "player_skill": -0.03
        },
        "scenarios": [
            {
                "name": "If enemy picks Orianna next",
                "red_win_rate": 0.54,
                "change": -0.04
            }
        ]
    }
    """
    pass

# ============= WebSocket for Real-Time Draft =============

@app.websocket("/ws/draft")
async def draft_websocket(websocket: WebSocket):
    """
    Real-time draft simulation with turn-by-turn updates
    
    Client sends:
    {
        "action": "initialize",
        "data": {
            "team_a": "team_t1",
            "team_b": "team_c9",
            "side": "blue",  # Which side are we drafting for?
            "patch": "14.1"
        }
    }
    
    {
        "action": "ban",
        "data": {
            "team": "blue",
            "champion": "Azir"
        }
    }
    
    {
        "action": "pick",
        "data": {
            "team": "red",
            "champion": "Sejuani",
            "role": "jungle"
        }
    }
    
    Server broadcasts after each action:
    {
        "draft_state": {...},
        "recommendations": [...],
        "opponent_predictions": [...],
        "current_win_rate": 0.58,
        "next_action": "ban" | "pick",
        "next_team": "blue" | "red"
    }
    """
    await websocket.accept()
    draft_state = {}
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data['action'] == 'initialize':
                draft_state = initialize_draft(data['data'])
                
            elif data['action'] == 'ban':
                draft_state = process_ban(draft_state, data['data'])
                
            elif data['action'] == 'pick':
                draft_state = process_pick(draft_state, data['data'])
            
            # Generate recommendations
            recommendations = generate_recommendations(draft_state)
            predictions = predict_next_opponent_pick(draft_state)
            win_rate = calculate_current_win_rate(draft_state)
            
            # Broadcast update
            await websocket.send_json({
                'draft_state': draft_state,
                'recommendations': recommendations,
                'opponent_predictions': predictions,
                'current_win_rate': win_rate,
                'next_action': determine_next_action(draft_state),
                'next_team': determine_next_team(draft_state)
            })
            
    except WebSocketDisconnect:
        pass
```

**Deliverables:**
- FastAPI application: `backend/main.py`
- WebSocket handler: `backend/websocket.py`
- API documentation (auto-generated via FastAPI)
- Docker container for backend

#### Phase 4: Frontend UI (Days 6-7)

**Objective:** Build professional draft simulation interface

**Page Structure:**

```
/                           → Landing page + demo video
/draft-simulator            → Main draft interface (core feature)
/champion-pool-analyzer     → Pre-match opponent analysis tool
/matchup-matrix             → Champion counter-pick database
/team-comps                 → Historical composition analysis
```

**Key Components:**

**4.1 Draft Simulator Interface** (`/draft-simulator`)

```jsx
// Main draft interface component structure

<DraftSimulator>
  <TeamSelection
    onTeamASelect={setTeamA}
    onTeamBSelect={setTeamB}
    tournaments={tournaments}
  />
  
  <DraftBoard>
    <BanPhase
      blueBans={draftState.blueBans}
      redBans={draftState.redBans}
      onBan={handleBan}
      phase={draftPhase} // "ban1" or "ban2"
    />
    
    <PickPhase
      bluePicks={draftState.bluePicks}
      redPicks={draftState.redPicks}
      onPick={handlePick}
      currentTurn={currentTurn} // "B1", "R1", "R2", etc.
    />
    
    <WinRateGauge
      blueWinRate={predictions.blueWinRate}
      redWinRate={predictions.redWinRate}
      trend={winRateTrend}
    />
  </DraftBoard>
  
  <RecommendationPanel>
    <TabGroup>
      <Tab label="Recommended Picks">
        <PickRecommendations
          recommendations={recommendations}
          onSelect={handlePickSelect}
        />
      </Tab>
      
      <Tab label="Opponent Predictions">
        <OpponentPredictions
          predictions={opponentPredictions}
          onCounterPick={handleCounterPick}
        />
      </Tab>
      
      <Tab label="Team Comp Analysis">
        <CompositionAnalysis
          bluComp={draftState.bluePicks}
          redComp={draftState.redPicks}
          warnings={compWarnings}
        />
      </Tab>
    </TabGroup>
  </RecommendationPanel>
  
  <ActionLog
    history={draftHistory}
    onUndo={handleUndo}
  />
</DraftSimulator>
```

**Component Details:**

```jsx
// Pick Recommendation Card
<PickRecommendationCard
  champion="Sejuani"
  winRate={0.60}
  synergyScore={9.2}
  matchupAdvantage={0.08}
  reasoning={{
    synergies: ["CC chain with Ashe+Braum"],
    counters: ["Favorable vs Viego jungle"],
    teamComp: ["Adds AP damage", "Strong frontline"],
    warnings: []
  }}
  onSelect={() => handlePick("Sejuani")}
/>

// Renders as:
┌─────────────────────────────────────────────────┐
│  [Sejuani Icon]     SEJUANI            60% WR   │
│                                                 │
│  Synergy: ●●●●●●●●●○ 9.2/10                    │
│  Matchup: +8% advantage vs Viego                │
│                                                 │
│  ✓ CC chain with Ashe + Braum                   │
│  ✓ Favorable jungle matchup                     │
│  ✓ Adds AP damage to comp                       │
│                                                 │
│  [SELECT PICK]                                  │
└─────────────────────────────────────────────────┘
```

```jsx
// Opponent Pick Prediction Card
<OpponentPredictionCard
  champion="Orianna"
  probability={0.32}
  reasoning="Most played (6/10 games), synergy with Rell"
  counterStrategy="Consider Sylas to steal Shockwave"
  playerData={{
    name: "Faker",
    winRate: 0.83,
    gamesPlayed: 6
  }}
/>

// Renders as:
┌─────────────────────────────────────────────────┐
│  [Orianna Icon]  ORIANNA                  32%   │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                 │
│  Player: Faker (T1 Mid)                         │
│  Recent: 6 games | 83% WR                       │
│                                                 │
│  Why likely:                                    │
│  • Most played mid in last 10 games             │
│  • High synergy with Rell engage                │
│  • Signature Faker comfort pick                 │
│                                                 │
│  Counter Strategy:                              │
│  → Consider Sylas to steal Shockwave            │
│  → Priority ban if critical                     │
│                                                 │
│  [PREPARE COUNTER]                              │
└─────────────────────────────────────────────────┘
```

```jsx
// Win Rate Gauge (Live Updating)
<WinRateGauge>
  <GaugeDisplay>
    <BlueBar width="42%" />
    <RedBar width="58%" />
  </GaugeDisplay>
  
  <Percentages>
    <BluePercent>42%</BluePercent>
    <Divider />
    <RedPercent>58%</RedPercent>
  </Percentages>
  
  <Trend>
    {trend === "up" && "↑ +4% after Sejuani pick"}
    {trend === "down" && "↓ -6% if enemy picks Orianna"}
  </Trend>
  
  <Breakdown>
    <BreakdownItem label="Synergies" value="+12%" />
    <BreakdownItem label="Matchups" value="+6%" />
    <BreakdownItem label="Side Advantage" value="+2%" />
  </Breakdown>
</WinRateGauge>

// Renders as:
┌──────────────────────────────────────────────┐
│       LIVE WIN RATE PROJECTION               │
│                                              │
│  BLUE ████████████────────────── RED        │
│       42%                         58%        │
│                                              │
│  ↑ +4% after Sejuani pick                   │
│                                              │
│  Breakdown:                                  │
│  • Synergies:       +12%                     │
│  • Matchups:        +6%                      │
│  • Side Advantage:  +2%                      │
└──────────────────────────────────────────────┘
```

**4.2 Champion Pool Analyzer** (`/champion-pool-analyzer`)

```jsx
<ChampionPoolAnalyzer>
  <PlayerSelector
    teams={teams}
    onPlayerSelect={setSelectedPlayer}
  />
  
  <ChampionPoolTable
    player={selectedPlayer}
    championPool={championPoolData}
    sortBy="win_rate"
  />
  
  <BanPriorityRanking
    champions={banPriorities}
    onSelectBan={handleBanSelect}
  />
  
  <FlexPickHighlight
    flexChampions={flexPicks}
  />
</ChampionPoolAnalyzer>
```

**Design System:**
- Color Palette:
  - Blue Side: `#0AC8FF` (LoL Blue)
  - Red Side: `#FF4655` (LoL Red)
  - Gold: `#C89B3C` (LoL Gold accents)
  - Background: `#010A13` (LoL Dark Blue-Black)
  - Surface: `#0A1428`
- Typography:
  - Headers: Beaufort (LoL official font) or Spiegel
  - Body: Inter or system font stack
- Components: Custom LoL-styled components + shadcn/ui base

**Deliverables:**
- Next.js application: `frontend/`
- Draft simulator with real-time updates
- WebSocket integration
- Champion pool analysis tools
- Responsive UI (1920x1080 coach/analyst displays)

#### Phase 5: Integration & Demo Preparation (Day 8)

**Tasks:**
1. End-to-end testing with real GRID data
2. Performance optimization:
   - WebSocket connection stability
   - Win-rate calculation speed (<500ms)
   - Database query optimization
3. Demo scenario scripting:
   - Prepare T1 vs C9 draft simulation
   - Show turn-by-turn recommendations
   - Demonstrate opponent prediction accuracy
4. Video recording (3-5 minutes):
   - Problem statement
   - Draft simulator walkthrough
   - Live win-rate updates
   - Prediction accuracy showcase
5. Documentation:
   - Setup instructions
   - API documentation
   - Model performance metrics

**Deliverables:**
- Deployed application (live URL)
- Demo video showcasing all features
- GitHub repository
- Performance metrics report

---

## 5. Demo Scenarios for Submission

### Scenario 1: Full Draft Simulation (T1 vs C9)

**Setup:** Simulate a complete pick/ban phase with turn-by-turn recommendations

**Draft Sequence (LoL Standard):**
```
Ban Phase 1:
B1: Galio
R1: Corki
B2: Renekton
R2: Nautilus
B3: Aphelios
R3: Yone

Pick Phase 1:
B1: Jinx (ADC)
R1: Ashe (ADC)
R2: Braum (Support)
B2: Rell (Support)
B3: Viego (Jungle)

Ban Phase 2:
R4: Orianna (predicted, so ban it!)
B4: Sylas
R5: Gwen
B5: Jayce

Pick Phase 2:
R3: Sejuani (Jungle) → RECOMMENDED by tool
B4: Syndra (Mid)
B5: Gragas (Top)
R4: Viktor (Mid) → RECOMMENDED by tool
R5: Sion (Top) → RECOMMENDED by tool
```

**Expected Tool Behavior:**

**Turn: R3 (Our Pick - Jungle)**
```
RECOMMENDATIONS:
1. Sejuani - 60% WR
   • High synergy with Ashe/Braum (CC chain)
   • Adds AP damage
   • Favorable vs Viego matchup

2. Maokai - 58% WR
   • Excellent gank setup
   • Counter-engage vs Rell/Viego

3. Jarvan IV - 53% WR
   ⚠ WARNING: Still full AD comp
```

**Turn: B4 (Opponent Pick - Mid)**
```
OPPONENT PREDICTIONS:
1. Orianna - 32%
   • Most played by Faker (6 games, 83% WR)
   • Synergy with Rell engage

2. Azir - 24%
   • Comfort pick (4-0 record)

RECOMMENDED ACTION:
→ BAN Orianna on R4 (deny high-synergy pick)
```

**Win Rate Evolution:**
```
After R3 (Sejuani pick):
RED: 58% ↑ (+4% from pick)

After B4 (Syndra pick):
RED: 56% ↓ (-2% from enemy mid)

After R4 (Viktor pick):
RED: 59% ↑ (+3% from counter-pick)

Final Draft:
RED: 61% (predicted win)
```

### Scenario 2: Champion Pool Analysis

**Setup:** Pre-match analysis of T1's Faker (Mid lane)

**Output:**
```
CHAMPION POOL ANALYSIS: Faker (T1 Mid)
Tournament: LCK Spring 2025

TOP PRIORITY BANS:
1. Azir - 100% WR (8 games) ⚠ CRITICAL
2. Orianna - 83% WR (6 games) ⚠ HIGH

COMFORT PICKS:
3. Syndra - 75% WR (4 games)
4. Viktor - 67% WR (3 games)

RECENT EMERGENCE:
5. Twisted Fate - 100% WR (2 games in last 3)

BAN STRATEGY:
→ Option A: Ban Azir + Orianna (remove comfort)
→ Option B: Ban Orianna + Viktor (meta denial)

RECOMMENDATION: Option A
Expected Impact: +18% win probability
```

---

## 6. Machine Learning Model Details

### 6.1 Win-Rate Prediction Model

**Algorithm:** Gradient Boosting Classifier (scikit-learn)

**Features (40 total):**

**Blue Side Composition (20 features):**
- Early game strength (0-1)
- Mid game strength (0-1)
- Late game strength (0-1)
- Engage capability (0-10)
- Disengage capability (0-10)
- AD damage % (0-1)
- AP damage % (0-1)
- True damage % (0-1)
- CC density (0-10)
- Mobility score (0-10)
- Tankiness score (0-10)
- Poke capability (0-10)
- Sustain capability (0-10)
- Split push potential (0-10)
- Teamfight rating (0-10)
- Objective control (0-10)
- Vision control (0-10)
- Pick potential (0-10)
- Peel capability (0-10)
- Global pressure (0-10)

**Red Side Composition (20 features):**
- Same 20 features as blue side

**Training Data:**
- ~1,500 professional games from LCS, LEC, LCK, LPL
- 60/20/20 train/validation/test split
- Cross-validation with 5 folds

**Performance Metrics:**
- Target accuracy: >65% on test set
- Precision/Recall balance
- Calibration: Predicted probabilities should match actual outcomes

**Feature Engineering Example:**
```python
def calculate_early_game_strength(champions: List[str]) -> float:
    """
    Calculate team's early game power (0-1)
    Based on:
    - Champion base stats
    - Level 1-6 power spikes
    - Early game win rates
    """
    early_scores = {
        'Renekton': 0.9, 'Lee Sin': 0.85, 'Pantheon': 0.88,
        'Azir': 0.3, 'Kayle': 0.2, 'Jinx': 0.4,
        # ... (pre-computed for all champions)
    }
    
    team_score = sum(early_scores.get(champ, 0.5) for champ in champions) / 5
    return team_score
```

### 6.2 Opponent Pick Prediction Model

**Algorithm:** Naive Bayes Classifier + Weighted Heuristics

**Features:**
- Recent pick frequency (last 10 games)
- Win rate on champion
- Pick frequency in tournament
- Synergy with current team picks
- Counter-pick potential vs enemy picks
- Meta tier (S/A/B/C/D)

**Probability Calculation:**
```python
P(champion | context) = 
    0.40 × P(recent_usage) +
    0.30 × P(win_rate) +
    0.20 × P(synergy) +
    0.10 × P(meta_strength)
```

**Evaluation Metric:**
- Top-1 accuracy: >40% (champion predicted is actually picked)
- Top-3 accuracy: >65% (actual pick is in top 3 predictions)
- Top-5 accuracy: >80%

---

## 7. API Response Examples

### Example 1: Pick Recommendation Response

```json
{
  "recommendations": [
    {
      "champion": "Sejuani",
      "champion_id": "sejuani",
      "predicted_win_rate": 0.604,
      "synergy_score": 9.2,
      "matchup_advantage": 0.08,
      "reasoning": {
        "synergies": [
          "High synergy CC chain with Ashe (Frost Shot) + Braum (Concussive Blows)",
          "Passive synergy: Permafrost procs trigger Ashe bonus damage",
          "Strong frontline vs enemy dive comp (Viego, Rell)"
        ],
        "counters": [
          "Favorable vs Viego jungle (56% win rate in 23 historical games)",
          "Can contest early drakes with superior CC"
        ],
        "team_composition": [
          "Adds critical AP damage (current draft is full AD)",
          "Provides engage/peel flexibility",
          "Excellent objective control"
        ],
        "historical_data": [
          "67% win rate in 18 games with Ashe/Braum duo",
          "15-3 record when picked vs Viego jungle"
        ],
        "warnings": []
      },
      "stats": {
        "games_played": 45,
        "win_rate": 0.62,
        "pick_rate": 0.18,
        "ban_rate": 0.12
      }
    },
    {
      "champion": "Maokai",
      "champion_id": "maokai",
      "predicted_win_rate": 0.581,
      "synergy_score": 8.5,
      "matchup_advantage": 0.06,
      "reasoning": {
        "synergies": [
          "Excellent gank setup for Ashe/Braum bot lane",
          "W (Twisted Advance) enables guaranteed Braum passive",
          "Ultimate (Nature's Grasp) synergizes with Ashe engage"
        ],
        "counters": [
          "Strong counter-engage vs Rell/Viego teamfight",
          "Sapling Vision Control counters early jungle invades"
        ],
        "team_composition": [
          "Adds AP damage + tankiness",
          "Superior teamfight zone control"
        ],
        "historical_data": [
          "71% win rate when paired with Braum (14 games)",
          "12-5 record vs Rell compositions"
        ],
        "warnings": []
      },
      "stats": {
        "games_played": 38,
        "win_rate": 0.58,
        "pick_rate": 0.15,
        "ban_rate": 0.08
      }
    }
  ],
  "draft_state": {
    "blue_bans": ["Galio", "Renekton", "Aphelios"],
    "red_bans": ["Corki", "Nautilus", "Yone"],
    "blue_picks": ["Jinx", "Rell", "Viego"],
    "red_picks": ["Ashe", "Braum"],
    "next_pick": "R3",
    "role_to_pick": "jungle"
  },
  "warnings": [
    {
      "severity": "high",
      "message": "CRITICAL: Team needs AP damage (currently 0% magic damage)",
      "recommendation": "Consider AP jungler (Sejuani) or flex Ziggs bot in R4/R5"
    }
  ],
  "timestamp": "2025-01-27T10:30:00Z"
}
```

### Example 2: Opponent Pick Prediction Response

```json
{
  "predictions": [
    {
      "champion": "Orianna",
      "champion_id": "orianna",
      "probability": 0.324,
      "reasoning": "Most played mid in last 10 games (6 appearances)",
      "details": {
        "player_stats": {
          "games_played": 6,
          "win_rate": 0.833,
          "avg_kda": 6.8,
          "last_played": "2025-01-20",
          "comfort_level": "high"
        },
        "synergy_analysis": [
          "HIGH SYNERGY: Shockwave + Rell engage = wombo combo",
          "Ball delivery via Viego possession = advanced tactic"
        ],
        "pick_likelihood_factors": [
          "Signature Faker champion (47 games this season)",
          "Recent usage: 6/10 games",
          "83% win rate (5-1 record)"
        ]
      },
      "counter_strategy": [
        "If picked, consider Sylas (steal Shockwave)",
        "Ban on B5 if critical"
      ]
    },
    {
      "champion": "Azir",
      "champion_id": "azir",
      "probability": 0.241,
      "reasoning": "Second most played (4 games in last 10)",
      "details": {
        "player_stats": {
          "games_played": 4,
          "win_rate": 1.000,
          "avg_kda": 7.2,
          "last_played": "2025-01-18",
          "comfort_level": "very_high"
        },
        "synergy_analysis": [
          "Emperor's Divide zone control + Rell CC lockdown",
          "T1's preferred scaling comp strategy"
        ],
        "pick_likelihood_factors": [
          "100% win rate (4-0 record) - COMFORT PICK",
          "Meta advantage: Current patch buffs Azir scaling"
        ]
      },
      "counter_strategy": [
        "Consider Zed or Talon (high burst vs low mobility)",
        "Priority ban if allowing scaling comp is risky"
      ]
    }
  ],
  "context": {
    "player": {
      "id": "player_faker",
      "name": "Faker",
      "team": "T1",
      "role": "mid"
    },
    "draft_state": {
      "blue_picks": ["Jinx", "Rell", "Viego"],
      "red_picks": ["Ashe", "Braum"],
      "blue_bans": ["Galio", "Renekton", "Aphelios"],
      "red_bans": ["Corki", "Nautilus", "Yone"]
    },
    "next_pick": "B4",
    "role": "mid"
  },
  "meta_info": {
    "alert": "Galio ban highly unusual for this player",
    "implication": "Likely indicates priority on teamfight disruption mages",
    "combined_probability": 0.565,
    "recommendation": "Expect Orianna or Azir with >55% combined probability"
  },
  "recommended_action": {
    "action": "ban",
    "target": "Orianna",
    "reasoning": "Highest probability + highest synergy threat",
    "timing": "R4 (next ban phase)"
  },
  "timestamp": "2025-01-27T10:31:00Z"
}
```

---

## 8. Success Metrics & KPIs

### 8.1 Technical Performance
- ✅ Data processing: Load 1,500+ games in <10 minutes
- ✅ API response time: <500ms for recommendations
- ✅ WebSocket latency: <100ms for draft updates
- ✅ UI render time: <1s for draft board updates

### 8.2 Model Performance
- ✅ Win-rate prediction accuracy: >65% on test set
- ✅ Opponent pick prediction (Top-3): >65% accuracy
- ✅ Recommendation quality: High synergy scores (>8.0) for top picks
- ✅ Champion pool coverage: >95% of professional meta champions

### 8.3 Feature Completeness
- ✅ Real-time pick/ban recommendations
- ✅ Turn-by-turn opponent predictions
- ✅ Live win-rate projections
- ✅ Pre-match champion pool analysis
- ✅ Synergy/counter-pick reasoning
- ✅ Draft warnings (composition gaps)

### 8.4 User Experience
- ✅ Professional LoL-themed UI
- ✅ Intuitive draft flow
- ✅ Real-time updates (<1s latency)
- ✅ Clear reasoning for recommendations
- ✅ Export/save draft scenarios

---

## 9. Risk Mitigation

### 9.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Insufficient training data for ML model | High | Medium | Use rule-based fallbacks, augment with synergy heuristics |
| GRID API missing draft phase data | High | Low | Parse from Series State `characterBans` field, validate with sample queries |
| WebSocket connection instability | Medium | Medium | Implement reconnection logic, fallback to polling |
| Slow win-rate calculations | Medium | Medium | Pre-compute champion features, cache common compositions |
| Champion pool data sparsity for new players | Medium | High | Aggregate team-level tendencies, use regional meta defaults |

### 9.2 Scope Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Feature creep (too many analysis tools) | High | Focus on core 3 features first, add extras if time permits |
| Overengineering ML models | Medium | Start with simple logistic regression, upgrade if needed |
| UI polish taking too long | Medium | Use LoL-inspired templates, prioritize functionality over aesthetics |
| Prediction accuracy too low | High | Combine ML with rule-based systems, transparent reasoning |

---

## 10. Deployment Plan

### 10.1 Production Environment

**Frontend (Vercel):**
- Next.js static export with dynamic API routes
- CDN distribution
- Environment variables for backend URL

**Backend (Railway/Render):**
- Docker container (FastAPI + PostgreSQL + Redis)
- Auto-scaling for WebSocket connections
- SSL/TLS for secure connections

**Database:**
- PostgreSQL 15+ with PostGIS (if spatial data needed)
- Daily automated backups
- Connection pooling (PgBouncer)

**ML Model Serving:**
- Model files stored in `/models` directory
- Loaded into memory at startup
- API endpoint for predictions

### 10.2 Deployment Checklist

- [ ] Environment variables configured (API keys, database URLs)
- [ ] Database migrations applied
- [ ] GRID API authentication tested
- [ ] CORS configured for frontend domain
- [ ] WebSocket connections tested (stress test with 10+ concurrent users)
- [ ] ML model loaded and responding
- [ ] Champion data pre-loaded (all 160+ champions)
- [ ] Demo draft scenarios pre-configured
- [ ] Error monitoring (Sentry optional)
- [ ] Health check endpoints (`/health`, `/api/health`)
- [ ] SSL certificates active
- [ ] Rate limiting configured (protect against abuse)

---

## 11. Submission Deliverables

### 11.1 Required Items

1. **GitHub Repository**
   - README with setup instructions
   - Architecture diagram
   - API documentation
   - Model performance metrics

2. **Live Demo**
   - Public URL (Vercel + Railway)
   - Pre-loaded with LCS/LEC/LCK/LPL data
   - Sample draft scenarios ready to run

3. **Video Demonstration (3-5 minutes)**
   - Problem statement (draft prep challenges)
   - Solution overview
   - Feature walkthrough:
     - Full draft simulation (T1 vs C9)
     - Turn-by-turn recommendations
     - Opponent pick predictions
     - Live win-rate updates
   - Champion pool analyzer demo
   - Model accuracy showcase
   - Future roadmap

4. **Presentation Deck (Optional)**
   - Problem/Solution
   - Technical architecture
   - ML model details
   - Demo screenshots
   - Performance metrics

### 11.2 Judging Criteria Alignment

| Criterion | How We Address It |
|-----------|-------------------|
| **Functionality** | All 3 core features + bonus champion pool analyzer |
| **Data Utilization** | Central Data, Series State, AND Events APIs for comprehensive analysis |
| **Innovation** | ML-powered win-rate prediction, Bayesian opponent pick prediction |
| **Real-Time Capability** | WebSocket for live draft updates, <500ms recommendations |
| **User Experience** | Professional LoL-themed UI, intuitive draft flow |
| **Code Quality** | Clean architecture, documented, reproducible |
| **Presentation** | Clear demo showing T1 vs C9 draft with predictions |

---

## 12. Future Roadmap (Post-Hackathon)

### Phase 2 Enhancements
- **Patch-Aware Meta Tracking:** Automatic champion tier updates with new patches
- **Advanced Synergy Detection:** Deep learning for complex champion interactions
- **Draft Similarity Search:** Find historical drafts similar to current state
- **Multi-Region Analysis:** Compare LCK, LPL, LCS, LEC meta differences

### Phase 3 Expansion
- **Live Draft Integration:** Connect to actual tournament streams for real-time analysis
- **Team-Specific AI Models:** Customized models per team's playstyle
- **Scrim Analysis:** Analyze internal team practice drafts
- **Mobile App:** iOS/Android for coaches during live events

### Phase 4 Business Features
- **SaaS Platform:** Subscription model for professional teams
- **API Access:** Third-party integrations for esports platforms
- **Tournament Prediction:** Predict tournament outcomes based on draft analysis
- **Player Scouting:** Identify rising talent based on champion pool diversity

---

## 13. Appendix

### A. GRID API Tournament IDs Reference

```python
LOL_TOURNAMENTS = {
    # LCK
    "775192": "LCK - Regional Qualifier 2024",
    "758024": "LCK - Spring 2024",
    "774794": "LCK - Summer 2024",
    "825490": "LCK - Split 2 2025",
    "826679": "LCK - Split 3 2025",
    "775623": "LCK - LCK Cup 2025",
    
    # LCS
    "758043": "LCS - Spring 2024",
    "774888": "LCS - Summer 2024",
    
    # LEC
    "758077": "LEC - Spring 2024",
    "774622": "LEC - Summer 2024",
    "758041": "LEC - Winter 2024",
    "775075": "LEC - Season Finals 2024",
    "825468": "LEC - Spring 2025",
    "826906": "LEC - Summer 2025",
    "775513": "LEC - Winter 2025",
    
    # LPL
    "775167": "LPL - Regional Qualifier 2024",
    "758054": "LPL - Spring 2024",
    "774845": "LPL - Summer 2024",
    "775662": "LPL - Split 1 2025",
    "825450": "LPL - Split 2 2025",
    "826789": "LPL - Split 3 2025",
    
    # LTA (Latin America)
    "775631": "LTA North - Split 1 2025",
    "825567": "LTA North - Split 2 2025",
    "826763": "LTA North - Split 3 2025",
    "775636": "LTA South - Split 1 2025",
    "825600": "LTA South - Split 2 2025",
    "826775": "LTA South - Split 3 2025",
    "775878": "LTA Cross-Conference - Split 1 2025",
    "826782": "LTA Cross-Conference - Regional Championship 2025",
}
```

### B. LoL Draft Phase Structure

```python
DRAFT_ORDER = [
    # Ban Phase 1
    ("blue", "ban"),  # B-Ban1
    ("red", "ban"),   # R-Ban1
    ("blue", "ban"),  # B-Ban2
    ("red", "ban"),   # R-Ban2
    ("blue", "ban"),  # B-Ban3
    ("red", "ban"),   # R-Ban3
    
    # Pick Phase 1
    ("blue", "pick"),  # B-Pick1
    ("red", "pick"),   # R-Pick1
    ("red", "pick"),   # R-Pick2
    ("blue", "pick"),  # B-Pick2
    ("blue", "pick"),  # B-Pick3
    ("red", "pick"),   # R-Pick3
    
    # Ban Phase 2
    ("red", "ban"),    # R-Ban4
    ("blue", "ban"),   # B-Ban4
    ("red", "ban"),    # R-Ban5
    ("blue", "ban"),   # B-Ban5
    
    # Pick Phase 2
    ("red", "pick"),   # R-Pick4
    ("blue", "pick"),  # B-Pick4
    ("blue", "pick"),  # B-Pick5
    ("red", "pick"),   # R-Pick5
]
```

### C. Sample GraphQL Queries

**Get Tournament Series with Draft Data:**
```graphql
query GetTournamentWithDrafts($tournamentId: ID!) {
  tournament(id: $tournamentId) {
    id
    name
    allSeries {
      id
      startTimeScheduled
      teams {
        id
        name
      }
    }
  }
}
```

**Get Series State with Picks/Bans:**
```graphql
query GetSeriesState($seriesId: ID!) {
  seriesState(id: $seriesId) {
    id
    started
    finished
    teams {
      id
      name
      won
    }
    games {
      id
      teams {
        id
        characterBans
        players {
          id
          name
          characterName
          role
          kills
          deaths
          assists
          netWorth
          items
        }
      }
    }
  }
}
```

### D. Champion Synergy Examples

```python
KNOWN_SYNERGIES = {
    # CC Chain Synergies
    ("Ashe", "Sejuani"): {
        "type": "cc_chain",
        "description": "Permafrost passive synergy triggers Ashe bonus damage",
        "score": 9.2
    },
    ("Yasuo", "Malphite"): {
        "type": "wombo_combo",
        "description": "Unstoppable Force + Last Breath",
        "score": 9.5
    },
    
    # Poke Synergies
    ("Jayce", "Nidalee"): {
        "type": "poke",
        "description": "Long-range siege composition",
        "score": 8.0
    },
    
    # Engage Synergies
    ("Orianna", "Malphite"): {
        "type": "engage",
        "description": "Shockwave ball delivery on Malphite ult",
        "score": 9.0
    },
}
```

---

## Contact & Support

**Developer:** Arvind  
**Project:** DraftIQ - LoL AI Drafting Assistant  
**Competition:** Cloud9 x JetBrains Hackathon  
**Timeline:** 8 days  

---

*This BRD represents a complete blueprint for building a production-ready LoL Draft Assistant. Feed this to Claude Code with the instruction: "Build this application following the technical implementation plan, starting with Phase 1 data ingestion."*
