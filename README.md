# Synapse

**AI-Powered Draft Intelligence for League of Legends**

Synapse is a professional-grade draft simulation and analysis tool for League of Legends esports teams and coaches. It provides real-time AI recommendations, opponent analysis, and win-rate predictions during the champion select phase.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🎯 Features

### Core Functionality
- **Real-Time Draft Simulation**: Full tournament-format draft with bans and picks (10-ban system)
- **AI-Powered Recommendations**: Smart champion suggestions based on meta analysis and team composition
- **Opponent Team Analysis**: Query professional team champion pools and player comfort picks
- **Win-Rate Prediction**: Real-time composition scoring and matchup analysis
- **Team-Aware Recommendations**: Personalized suggestions based on opponent's historical data
- **Multi-Format Support**: Tournament, Fearless, and Scrim draft modes

### Advanced Features
- **Champion Pool Analysis**: Deep-dive into professional player statistics
- **Meta-Aware Scoring**: Recommendations consider current patch meta
- **Composition Synergy**: Team-wide synergy calculations (AP/AD balance, engage potential, peel)
- **Counter-Pick Suggestions**: Identify strong counters to enemy picks
- **Ban Priority System**: Smart ban recommendations based on opponent tendencies
- **Draft Report Generation**: AI-powered post-draft analysis with GPT-4o

## 🚀 Technical Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: Zustand with Immer
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **ORM**: Direct SQL queries via Supabase client
- **API Routes**: Next.js API routes with streaming support
- **AI Integration**: OpenAI GPT-4o for draft analysis
- **Data Source**: GRID Esports API for professional match data

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase Cloud
- **CDN**: Vercel Edge Network

## 📊 Database Schema

### Core Tables

**`synapse.players`**
```sql
- id: text (primary key)
- name: text
- team_id: text (foreign key to teams)
- primary_role: text (top/jungle/mid/adc/support)
```

**`synapse.teams`**
```sql
- id: text (primary key)
- name: text
- short_name: text
- region: text
```

**`synapse.champion_picks`**
```sql
- id: bigint (primary key)
- player_id: text (foreign key to players)
- champion_name: text
- role: text
- team_side: text (blue/red)
- draft_id: text
- game_id: text
- won: boolean
- created_at: timestamp
```

**`synapse.games`**
```sql
- id: text (primary key)
- series_id: text
- blue_team_id: text
- red_team_id: text
- blue_team_won: boolean
- patch: text
```

**`synapse.drafts`**
```sql
- id: text (primary key)
- game_id: text (foreign key to games)
- sequence: jsonb (full draft sequence)
```

### Supporting Tables
- `tournaments`: Tournament information
- `series`: Match series (Bo1, Bo3, Bo5)
- `meta_tiers`: Champion tier rankings by patch
- `champion_counters`: Matchup data and counter relationships

## 🧮 Analytics & Logic

### 1. **Champion Pool Analysis**
Each player's champion pool is calculated from historical professional play:

```typescript
// Comfort level calculation
comfort = games_played / max_games_on_any_champion
win_rate = wins / total_games

// Signature picks: 10+ games AND 55%+ win rate
signature = games >= 10 && win_rate >= 0.55

// Flex picks: played in multiple roles
flex = roles.length > 1
```

### 2. **Team Composition Scoring**
Team compositions are evaluated on multiple dimensions:

**Damage Balance** (0-100)
```typescript
// Target: 60% physical, 40% magic
physical_ratio = physical_damage_champions / total_champions
magic_ratio = 1 - physical_ratio

balance_score = 100 - abs(physical_ratio - 0.6) * 200
```

**Engage Potential** (0-100)
```typescript
// Champions with hard engage abilities
engage_count = champions.filter(c => has_engage(c)).length
engage_score = min(engage_count * 33, 100)
```

**Peel & Protection** (0-100)
```typescript
// Champions with peel/disengage
peel_count = champions.filter(c => has_peel(c)).length
peel_score = min(peel_count * 33, 100)
```

**Overall Composition Score**
```typescript
composition_score = (
  damage_balance * 0.3 +
  engage_potential * 0.25 +
  peel_protection * 0.20 +
  synergy_score * 0.15 +
  meta_strength * 0.10
)
```

### 3. **Team-Aware Recommendation Scoring**
When opponent team is known, recommendations are weighted by player tendencies:

**Ban Priority Boost**
```typescript
// If opponent player has high comfort on champion
if (player_games >= 15 && player_winrate >= 0.60) {
  ban_multiplier = 2.0  // Double priority
} else if (player_games >= 8) {
  ban_multiplier = 1.5  // Increased priority
} else {
  ban_multiplier = 1.0  // Normal priority
}
```

**Pick Counter Boost**
```typescript
// If picking a strong counter to opponent's likely picks
opponent_pool_strength = avg(opponent_champions.win_rate)
counter_effectiveness = counter_winrate_vs_target

counter_multiplier = 1.0 + (counter_effectiveness * 0.3)
```

### 4. **Win-Rate Prediction**
Real-time prediction based on current draft state:

```typescript
// Base win rate from composition score
base_winrate = 0.40 + (composition_score / 100) * 0.20

// Adjust for matchup advantages
matchup_modifier = calculate_lane_matchups(blue_picks, red_picks)

// Adjust for meta strength
meta_modifier = calculate_meta_alignment(picks, current_patch)

predicted_winrate = clamp(
  base_winrate + matchup_modifier + meta_modifier,
  0.20,  // Minimum 20%
  0.80   // Maximum 80%
)
```

### 5. **AI Draft Report Generation**
Post-draft analysis uses GPT-4o with structured prompts:

**Report Sections**
1. **Draft Summary**: Overall draft quality, key picks/bans
2. **Strategic Analysis**: Win conditions, power spikes, team fight scenarios
3. **Matchup Insights**: Lane-by-lane breakdown, jungle pathing implications
4. **Recommendations**: Areas for improvement, alternative strategies

**Prompt Engineering**
```typescript
system_prompt = `
You are a professional League of Legends coach analyzing a draft.
Draft data: ${JSON.stringify(draft_state)}
Opponent team: ${opponent_team_data}

Provide specific, actionable insights focusing on:
- Win conditions for this composition
- Critical timing windows
- Macro strategy considerations
- Potential weaknesses and how to address them
`

response_format = { type: "json_object" }  // Structured output
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account
- OpenAI API key (for draft reports)

### Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
DATABASE_URL=your_postgres_connection_string
OPENAI_API_KEY=your_openai_key
```

### Installation
```bash
# Install dependencies
npm install

# Run database migrations (if needed)
npm run migrate

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### Data Import
Import professional match data:
```bash
# Import LCK data
npm run etl:lck

# Import LPL data
npm run etl:lpl

# Import all leagues
npm run etl
```

## 📖 Usage

1. **Start a Draft**: Select your side (Blue/Red), draft format, and opponent team
2. **Navigate Turns**: Follow the draft sequence (bans → picks → bans → picks)
3. **View Recommendations**: AI suggests optimal picks/bans with explanations
4. **Analyze Composition**: Real-time win-rate updates and composition breakdown
5. **Generate Report**: After completing draft, view AI-powered analysis

## 🤝 Contributing

Contributions are welcome! This is an open-source project.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GRID Esports** for providing professional match data
- **Riot Games** for League of Legends
- **OpenAI** for GPT-4o API
- **Vercel** for hosting and deployment
- **Supabase** for database infrastructure

---

Built with ❤️ for the League of Legends esports community
