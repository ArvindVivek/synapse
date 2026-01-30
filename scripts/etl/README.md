# Synapse ETL - League of Legends Data

ETL scripts for fetching League of Legends esports data from GRID.gg API.

## Setup

```bash
cd scripts/etl
pnpm install
```

## Environment Variables

Create `.env` or ensure these are in `../../.env.local`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GRID_API_KEY=your_grid_api_key
```

## Usage

```bash
# Full ETL (all tournaments)
pnpm etl

# Dry run (no database writes)
pnpm etl:dry-run

# Filter by region
pnpm etl:lck    # Korea
pnpm etl:lec    # Europe
pnpm etl:lcs    # North America
pnpm etl:lpl    # China
pnpm etl:lta    # Latin America

# Test with limited series
pnpm etl:test   # First 3 series only

# Custom options
pnpm etl -- --region=lck --series-limit=10
pnpm etl -- --tournament="LCK - Spring 2024"
```

## Available Tournaments

| Region | Tournaments |
|--------|-------------|
| LCK | Spring 2024, Summer 2024, Split 2/3 2025, LCK Cup 2025 |
| LCS | Spring 2024, Summer 2024 |
| LEC | Winter/Spring/Summer 2024, Season Finals, Winter/Spring/Summer 2025 |
| LPL | Spring/Summer 2024, Split 1/2/3 2025 |
| LTA | North/South Split 1/2/3 2025, Cross-Conference |

## Data Flow

```
GRID Central Data API      GRID Series State API     GRID File Download API
        │                          │                         │
        ▼                          ▼                         ▼
   Tournaments              Games, Picks, Bans         Event Timeline
   Series                   Players, Champions         (JSONL files)
   Teams                    Role inference                  │
        │                          │                         │
        └──────────┬───────────────┴─────────────────────────┘
                   ▼
           Supabase (synapse schema)
           ├── RAW DATA TABLES
           │   ├── tournaments
           │   ├── teams
           │   ├── players
           │   ├── series
           │   ├── games
           │   ├── drafts (bans)
           │   └── champion_picks
           ├── EVENT TABLES
           │   ├── player_game_stats
           │   ├── kill_events
           │   ├── objective_events (dragons, baron, towers)
           │   ├── item_events
           │   ├── ward_events
           │   ├── gold_snapshots
           │   ├── position_snapshots
           │   └── game_state_snapshots
           └── ANALYSIS TABLES
               ├── champion_stats
               ├── champion_matchup_stats
               ├── team_comp_stats
               ├── draft_predictions
               └── player_performance_trends
```

## Data Architecture

The ETL system follows a **three-tier architecture** similar to lumina's VALORANT ETL:

### 1. Raw Data Tier
Basic metadata from GRID APIs:
- **tournaments** - Tournament metadata (id, name, region, dates)
- **teams** - Team information
- **players** - Player information with primary role
- **series** - Match series (Bo3, Bo5, etc.)
- **games** - Individual games within a series
- **drafts** - Draft phase with champion bans
- **champion_picks** - Champion selections with inferred roles

### 2. Event Data Tier
Detailed game events from downloaded JSONL event files:
- **player_game_stats** - Per-game player performance (KDA, CS, damage, gold, vision)
- **kill_events** - Individual kill records with positions and bounties
- **kill_assists** - Kill assist relationships
- **objective_events** - Dragon/Baron/Tower/Inhibitor captures
- **item_events** - Item purchases, sales, undos
- **ward_events** - Ward placement and destruction
- **gold_snapshots** - Gold tracking at intervals
- **position_snapshots** - Player position tracking
- **game_state_snapshots** - Team gold/XP/objective differentials over time

### 3. Analysis Tier
Pre-computed statistics for fast queries:
- **champion_stats** - Win rates, pick rates, ban rates per champion/role/patch
- **champion_matchup_stats** - Head-to-head matchup statistics
- **team_comp_stats** - Team composition win rates and strengths
- **draft_predictions** - Draft win probability predictions
- **player_performance_trends** - Rolling player statistics per champion
