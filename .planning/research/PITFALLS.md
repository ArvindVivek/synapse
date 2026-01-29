# Domain Pitfalls: LoL Draft Assistant

**Domain:** Esports analytics - League of Legends draft prediction and recommendation
**Project:** DraftIQ - AI-Powered Draft Assistant
**Researched:** 2026-01-28
**Confidence:** HIGH (based on training data about esports analytics, LoL game mechanics, and serverless architectures)

---

## Critical Pitfalls

These mistakes can cause rewrites, make the product unusable, or result in complete project failure.

### Pitfall 1: Role Assignment Ambiguity in Professional Draft Data

**What goes wrong:**
GRID API provides champion picks but doesn't reliably indicate which role each champion was picked for. A champion like Swain can be played in Top, Mid, or Support. Syndra can be Mid or Support. If you assign roles incorrectly, your entire matchup matrix becomes invalid (e.g., calculating "Swain Top vs Gnar Top" when it was actually "Swain Support").

**Why it happens:**
- GRID's `seriesState` API returns `characterName` per player, but the `role` field may be positional (based on map position) or empty
- Flex picks are common in professional play (Swain, Syndra, Seraphine, Senna)
- Role swaps happen between phases (Support roams mid, ADC takes bot turret)
- Data extraction happens post-match, not during draft phase

**Consequences:**
- Champion synergy calculations are wrong (calculating Swain+Gnar instead of Swain+Jinx)
- Counter-pick recommendations fail (recommending Gnar counters when facing Swain Support)
- Player champion pool analysis becomes unreliable (classifying all of a player's Swain games as Top when they play Support)
- Win-rate predictions use incorrect features (modeling composition as "double Top" when it's actually Support)

**Prevention:**
1. **ETL Phase: Use multiple data sources for role inference**
   ```typescript
   // CORRECT: Multi-signal role assignment
   function inferRole(player: Player, champion: string, game: Game): Role {
     // Signal 1: Player's typical role (from roster data)
     const playerPrimaryRole = player.role; // From Central Data API

     // Signal 2: Champion typical roles (with confidence)
     const championRoles = getChampionRoleDistribution(champion);
     // e.g., Swain: {top: 0.35, mid: 0.20, support: 0.45}

     // Signal 3: Team composition constraints
     const assignedRoles = game.team.players.map(p => p.role);
     const remainingRoles = ['top', 'jungle', 'mid', 'adc', 'support']
       .filter(r => !assignedRoles.includes(r));

     // Signal 4: In-game position (if available from events API)
     const mapPosition = getAveragePosition(player, game);

     // Confidence-based assignment
     if (championRoles[playerPrimaryRole] > 0.3) {
       return playerPrimaryRole; // High confidence
     }

     // Fallback to constraint satisfaction
     if (championRoles[remainingRoles[0]] > 0.1) {
       return remainingRoles[0];
     }

     // Flag for manual review
     logAmbiguousRoleAssignment(player, champion, game);
     return 'unknown';
   }
   ```

2. **Create a role validation table**
   - After ETL, export a CSV of (game_id, player, champion, assigned_role)
   - Manually review any with `confidence < 0.7`
   - For hackathon: focus on high-pick-rate champions (Azir, Orianna always Mid; Jinx always ADC)

3. **Champion role distribution database**
   - Pre-compute role distributions from all games: `{champion: {role: frequency}}`
   - Use this as prior probability for Bayesian role assignment
   - Update per-patch (meta shifts change role viability)

4. **Composition validation rules**
   - After role assignment, check for impossible compositions
   - Red flags: two ADCs, no jungler, three mid-laners
   - Re-run assignment with constraint satisfaction if invalid

**Detection:**
- During ETL: Count games with duplicate roles (e.g., two "mid" assignments)
- During validation: Flag compositions with <5 unique roles
- During testing: Manually verify 10 random games match Leaguepedia/VOD data
- User reports: "Why is Swain listed as Top when T1 played him Support?"

**Phase mapping:**
- **Phase 1 (Data Ingestion):** Implement role inference with confidence scoring
- **Phase 2 (Analytics):** Use role as a required filter for matchup/synergy queries
- **Phase 5 (Testing):** Manual spot-checks of 20 high-profile games (T1, C9 matches)

---

### Pitfall 2: Treating Draft Order as Stateless

**What goes wrong:**
LoL draft has a specific snake order: B1, R1-R2, B2-B3, R3-R4, B4-B5, R5 (with two ban phases). Teams have different information at each turn. A recommendation system that doesn't account for "What turn is it?" gives unusable advice (e.g., recommending a counter-pick on B1 when you have no enemy picks to counter yet).

**Why it happens:**
- Developers treat draft as "pick 5 champions" without modeling the turn sequence
- Training data doesn't preserve draft order (storing final compositions only)
- API design uses a flat list of picks instead of sequential turns
- No distinction between "proactive pick" (B1) and "reactive pick" (R5)

**Consequences:**
- Recommendation engine suggests counter-picks when there's nothing to counter
- Opponent prediction runs on wrong turns (predicting B1 based on our picks when they go first)
- Win-rate calculations ignore side advantage (Blue gets first pick, Red gets last pick counter)
- Demo shows recommendations that make no strategic sense ("Counter Sejuani with Viego on B1" when Sejuani isn't picked yet)

**Prevention:**
1. **Model draft as a state machine**
   ```typescript
   type DraftPhase =
     | 'ban_phase_1'  // 3 bans per side
     | 'pick_phase_1' // B1, R1-R2, B2-B3, R3
     | 'ban_phase_2'  // 2 bans per side
     | 'pick_phase_2' // R4, B4-B5, R5

   type DraftTurn = {
     phase: DraftPhase;
     turnNumber: number; // 1-20 (total draft sequence)
     side: 'blue' | 'red';
     action: 'ban' | 'pick';
     role?: Role; // Known after first 6 picks
   };

   interface DraftState {
     currentTurn: DraftTurn;
     blueBans: Champion[];
     redBans: Champion[];
     bluePicks: Champion[];
     redPicks: Champion[];
     nextTurn: () => DraftTurn;
     canCounterPick: () => boolean; // Only true after enemy has picked
   }
   ```

2. **Store draft order in database**
   ```sql
   CREATE TABLE draft_events (
     id SERIAL PRIMARY KEY,
     game_id VARCHAR(50),
     turn_number INT, -- 1-20
     phase VARCHAR(20), -- 'ban_phase_1', 'pick_phase_1', etc.
     side VARCHAR(10), -- 'blue' or 'red'
     action VARCHAR(10), -- 'ban' or 'pick'
     champion VARCHAR(100),
     role VARCHAR(20), -- NULL for bans, inferred for picks
     timestamp TIMESTAMP,

     -- Critical for order preservation
     UNIQUE(game_id, turn_number)
   );
   ```

3. **Context-aware recommendation API**
   ```typescript
   function recommendPick(draftState: DraftState): Recommendation[] {
     const { currentTurn, bluePicks, redPicks } = draftState;

     // Early pick (B1, R1, R2): Prioritize comfort/flex picks
     if (currentTurn.turnNumber <= 3) {
       return recommendFlexPicks(draftState);
     }

     // Mid draft (B2-B3, R3): Balance synergy + counter
     if (currentTurn.turnNumber <= 6) {
       const enemyPicks = currentTurn.side === 'blue' ? redPicks : bluePicks;
       return balanceSynergyAndCounter(draftState, enemyPicks);
     }

     // Late draft (R4-R5): Hard counter-pick
     if (currentTurn.turnNumber >= 7) {
       return recommendCounterPicks(draftState);
     }
   }
   ```

4. **Draft order validation in tests**
   ```typescript
   test('Draft follows LoL professional rules', () => {
     const draft = simulateDraft(team1, team2);

     // Verify snake order
     expect(draft.turns[0]).toEqual({ side: 'blue', action: 'ban' });
     expect(draft.turns[6]).toEqual({ side: 'blue', action: 'pick' }); // B1
     expect(draft.turns[7]).toEqual({ side: 'red', action: 'pick' }); // R1
     expect(draft.turns[8]).toEqual({ side: 'red', action: 'pick' }); // R2

     // Verify ban phases
     expect(draft.turns.slice(0, 6).every(t => t.action === 'ban')).toBe(true);
     expect(draft.turns.slice(12, 16).every(t => t.action === 'ban')).toBe(true);
   });
   ```

**Detection:**
- During development: Unit tests for draft state transitions
- During demo: Check that recommendations change based on turn number
- Red flag: Recommending "counter X" when X hasn't been picked yet
- Red flag: Opponent predictions before enemy has any picks

**Phase mapping:**
- **Phase 1 (ETL):** Parse draft events with turn order, store in `draft_events` table
- **Phase 3 (Backend API):** Implement draft state machine, validate turn transitions
- **Phase 4 (Frontend):** UI shows "Turn 7: R3 Pick (Jungle)" not just "Pick a champion"
- **Phase 5 (Testing):** Simulate full 20-turn draft, verify recommendations make sense at each turn

---

### Pitfall 3: Ignoring Patch/Meta Volatility

**What goes wrong:**
League of Legends has patches every 2 weeks that can make champions 20% stronger or weaker. Data from Patch 14.1 (January) is invalid for Patch 14.10 (May). A model trained on old patches will recommend nerfed champions or miss buffed ones. Your "high win-rate" recommendations are based on stale data.

**Why it happens:**
- Developers aggregate all data without filtering by patch
- No mechanism to detect when a champion's win rate shifts dramatically
- Historical data (2 years) is treated equally with recent data (last 2 weeks)
- No awareness of champion reworks (Skarner rework in 2024 invalidates all pre-rework data)

**Consequences:**
- Recommending Yuumi (67% win rate in 2024) after she was nerfed to 43% in 2025
- Missing newly-buffed S-tier picks (Azir went from B-tier to S-tier in one patch)
- Opponent prediction fails (player has 80% win rate on old-meta Zeri, now never picks her)
- Demo shows embarrassing recommendations ("Why is it recommending Kalista? She's been F-tier for months!")

**Prevention:**
1. **Patch-aware data filtering**
   ```typescript
   // WRONG: Aggregate all data
   const championWinRate = await db.query(`
     SELECT champion, AVG(won::int) as win_rate
     FROM champion_picks
     WHERE champion = 'Azir'
   `);

   // CORRECT: Recent patches only
   const championWinRate = await db.query(`
     SELECT champion, AVG(won::int) as win_rate
     FROM champion_picks
     WHERE champion = 'Azir'
       AND patch_version IN (
         SELECT DISTINCT patch_version
         FROM games
         ORDER BY start_time DESC
         LIMIT 3  -- Last 3 patches (~6 weeks)
       )
   `);
   ```

2. **Meta shift detection**
   ```typescript
   interface MetaShift {
     champion: string;
     oldWinRate: number; // Patches N-3 to N-1
     newWinRate: number; // Patch N
     delta: number;
     confidence: 'high' | 'medium' | 'low'; // Based on sample size
   }

   function detectMetaShifts(currentPatch: string): MetaShift[] {
     const recentData = getChampionStats([currentPatch]);
     const historicalData = getChampionStats(getPreviousPatches(3));

     return champions.map(champ => {
       const oldWR = historicalData[champ].winRate;
       const newWR = recentData[champ].winRate;
       const delta = newWR - oldWR;

       // Flag significant shifts (>10% win rate change)
       if (Math.abs(delta) > 0.10 && recentData[champ].games > 10) {
         return {
           champion: champ,
           oldWinRate: oldWR,
           newWinRate: newWR,
           delta,
           confidence: recentData[champ].games > 30 ? 'high' : 'medium'
         };
       }
     }).filter(Boolean);
   }
   ```

3. **Recency weighting for predictions**
   ```typescript
   // Exponential decay: recent games weighted higher
   function calculateWeightedWinRate(
     picks: ChampionPick[],
     currentDate: Date
   ): number {
     const HALF_LIFE_DAYS = 30; // Patch cycle ~2 weeks, use 30 days

     let weightedWins = 0;
     let totalWeight = 0;

     for (const pick of picks) {
       const daysAgo = (currentDate - pick.gameDate) / (1000 * 60 * 60 * 24);
       const weight = Math.exp(-daysAgo / HALF_LIFE_DAYS);

       weightedWins += (pick.won ? 1 : 0) * weight;
       totalWeight += weight;
     }

     return weightedWins / totalWeight;
   }
   ```

4. **Champion rework/VGU detection**
   ```typescript
   // Hardcoded list of champion reworks with dates
   const CHAMPION_REWORKS = {
     'Skarner': new Date('2024-05-01'), // VGU in Patch 14.9
     'Aurelion Sol': new Date('2023-01-11'), // VGU in Patch 13.1
     'Udyr': new Date('2022-08-24'), // VGU in Patch 12.16
   };

   function filterPostRework(picks: ChampionPick[]): ChampionPick[] {
     return picks.filter(pick => {
       const reworkDate = CHAMPION_REWORKS[pick.champion];
       return !reworkDate || pick.gameDate > reworkDate;
     });
   }
   ```

5. **UI: Show data recency**
   ```tsx
   <RecommendationCard>
     <Champion>Azir</Champion>
     <WinRate>68%</WinRate>
     <DataContext>
       Based on 45 games from Patches 14.23-14.25 (last 6 weeks)
       ⚠ Win rate increased +15% in Patch 14.24 (buffs applied)
     </DataContext>
   </RecommendationCard>
   ```

**Detection:**
- During ETL: Log patch distribution (if >80% of data is from 1 patch, you need more recent data)
- During testing: Check if recommendations change when filtering to "last 2 patches only"
- Red flag: Recommending champions with <5 games in recent patches
- User validation: Do recommendations match current community tier lists (u.gg, op.gg)?

**Phase mapping:**
- **Phase 1 (ETL):** Store `patch_version` in all tables, index by (champion, patch_version)
- **Phase 2 (Analytics):** All queries filter to recent 3 patches; implement meta shift detection
- **Phase 4 (Frontend):** Display patch filter in UI ("Showing data from Patches 14.23-14.25")
- **Phase 5 (Testing):** Compare recommendations against u.gg/op.gg tier lists for current patch

---

### Pitfall 4: Data Sparsity Causing Unstable Predictions

**What goes wrong:**
With only 1,500-2,000 games and 160+ champions, many champion pairs have <5 co-occurrences. Calculating synergy from 2 games gives you 100% win rate or 0% win rate with no statistical significance. Your synergy matrix is full of noise, not signal.

**Why it happens:**
- Small dataset (1,500 games × 10 picks = 15,000 champion picks total)
- Long-tail distribution (top 30 champions = 70% of picks, bottom 100 champions = 5%)
- Combinatorial explosion (160 champions = 12,720 possible pairs; 5 champions per team = 252 billion compositions)
- No regularization or smoothing applied to sparse data

**Consequences:**
- Recommending Rell+Kalista (10-0 in 10 games) over Rell+Jinx (100-80 in 180 games)
- "Ivern + Rengar = 100% win rate!" (based on 1 game from 2023)
- Opponent prediction: "Player has never picked Orianna" (actually picked once, but data missed it)
- Win-rate model overfits to rare compositions, fails on common ones

**Prevention:**
1. **Bayesian smoothing (Laplace smoothing)**
   ```typescript
   // WRONG: Raw win rate
   const synergyWinRate = wins / games; // 2/2 = 100%

   // CORRECT: Smoothed with global prior
   const PRIOR_WEIGHT = 10; // Equivalent to 10 games at average win rate
   const GLOBAL_WIN_RATE = 0.50; // League average

   const smoothedWinRate =
     (wins + PRIOR_WEIGHT * GLOBAL_WIN_RATE) /
     (games + PRIOR_WEIGHT);
   // (2 + 10*0.50) / (2 + 10) = 7/12 = 58% (more reasonable)
   ```

2. **Confidence intervals and minimum thresholds**
   ```typescript
   interface SynergyScore {
     champion_a: string;
     champion_b: string;
     games_together: number;
     win_rate: number;
     confidence: 'high' | 'medium' | 'low' | 'insufficient';
     confidence_interval: [number, number]; // 95% CI
   }

   function calculateSynergy(
     champA: string,
     champB: string
   ): SynergyScore {
     const games = getGamesWithBoth(champA, champB);
     const wins = games.filter(g => g.won).length;

     if (games.length < 5) {
       return {
         champion_a: champA,
         champion_b: champB,
         games_together: games.length,
         win_rate: 0.50, // Fallback to neutral
         confidence: 'insufficient',
         confidence_interval: [0.20, 0.80], // Wide interval
       };
     }

     const winRate = wins / games.length;
     const ci = calculateWilsonCI(wins, games.length, 0.95);

     return {
       champion_a: champA,
       champion_b: champB,
       games_together: games.length,
       win_rate: winRate,
       confidence: games.length > 30 ? 'high' : games.length > 10 ? 'medium' : 'low',
       confidence_interval: ci,
     };
   }
   ```

3. **Hierarchical fallback strategy**
   ```typescript
   // Fallback chain: Specific → General → Domain knowledge
   function getSynergyScore(champA: string, champB: string): number {
     // Level 1: Direct pair data (if sufficient)
     const pairData = getSynergy(champA, champB);
     if (pairData.games_together > 20) {
       return pairData.win_rate;
     }

     // Level 2: Archetype-based synergy (engage + AOE, poke + disengage)
     const archetypeA = getChampionArchetype(champA); // "engage_tank"
     const archetypeB = getChampionArchetype(champB); // "aoe_mage"
     const archetypeSynergy = getArchetypeSynergy(archetypeA, archetypeB);
     if (archetypeSynergy.games > 100) {
       return archetypeSynergy.win_rate;
     }

     // Level 3: Known synergy patterns (hardcoded domain knowledge)
     if (hasCCChain(champA, champB)) return 0.55; // +5% for CC synergy
     if (hasDamageTypeDiversity(champA, champB)) return 0.52; // +2% for AD+AP

     // Level 4: Neutral assumption
     return 0.50;
   }
   ```

4. **Aggregate rare champions into archetypes**
   ```typescript
   const CHAMPION_ARCHETYPES = {
     // Tanks
     'Maokai': 'engage_tank',
     'Nautilus': 'engage_tank',
     'Leona': 'engage_tank',

     // ADCs
     'Jinx': 'scaling_adc',
     'Tristana': 'scaling_adc',
     'Kog\'Maw': 'scaling_adc',

     // Mages
     'Orianna': 'control_mage',
     'Viktor': 'control_mage',
     'Azir': 'control_mage',
   };

   // Calculate synergy at archetype level (more data)
   const archetypeSynergy = await db.query(`
     SELECT
       a1.archetype as archetype_a,
       a2.archetype as archetype_b,
       AVG(won::int) as win_rate,
       COUNT(*) as games
     FROM champion_picks p1
     JOIN champion_picks p2 ON p1.game_id = p2.game_id AND p1.team_id = p2.team_id
     JOIN champion_archetypes a1 ON p1.champion = a1.champion
     JOIN champion_archetypes a2 ON p2.champion = a2.champion
     GROUP BY a1.archetype, a2.archetype
     HAVING COUNT(*) > 50
   `);
   ```

5. **UI: Display confidence explicitly**
   ```tsx
   <SynergyCard>
     <ChampionPair>Sejuani + Ashe</ChampionPair>
     <WinRate>67%</WinRate>
     <Confidence>
       High confidence (18 games)
       ✓ Statistically significant
     </Confidence>
   </SynergyCard>

   <SynergyCard>
     <ChampionPair>Ivern + Rengar</ChampionPair>
     <WinRate>58%</WinRate>
     <Confidence>
       Low confidence (3 games)
       ⚠ Insufficient data - using archetype fallback
     </Confidence>
   </SynergyCard>
   ```

**Detection:**
- During ETL: Count champion pick frequencies; flag if >50% of champions have <10 picks
- During validation: Check synergy matrix sparsity (% of pairs with <5 games)
- Red flag: Recommending champion pairs with 0 co-occurrences in dataset
- Testing: Compare high-sample predictions (100+ games) vs low-sample (5 games) for stability

**Phase mapping:**
- **Phase 1 (ETL):** Compute champion pick frequencies, identify sparse champions
- **Phase 2 (Analytics):** Implement Bayesian smoothing, archetype fallback, confidence intervals
- **Phase 3 (API):** Return confidence levels with all predictions
- **Phase 4 (UI):** Show "High/Medium/Low confidence" badges on recommendations

---

## Moderate Pitfalls

These cause delays, technical debt, or reduced quality, but are recoverable.

### Pitfall 5: GRID API Rate Limits Blocking ETL

**What goes wrong:**
GRID API likely has rate limits (e.g., 100 requests/minute). With 30 tournaments × 50 series each = 1,500 series to fetch, you'll hit rate limits during ETL. Your data ingestion script fails halfway, and you have incomplete data.

**Why it happens:**
- No backoff/retry logic in API client
- Parallel requests without rate limit awareness
- ETL runs once and crashes (no resume from checkpoint)

**Prevention:**
1. **Rate-limited API client with exponential backoff**
   ```typescript
   class GridAPIClient {
     private requestQueue: Array<() => Promise<any>> = [];
     private readonly RATE_LIMIT = 100; // requests per minute
     private readonly INTERVAL = 60000; // 1 minute
     private requestCount = 0;
     private lastReset = Date.now();

     async request(query: string, variables: any): Promise<any> {
       await this.waitForRateLimit();

       try {
         const response = await fetch(GRID_API_URL, {
           method: 'POST',
           headers: { 'x-api-key': API_KEY },
           body: JSON.stringify({ query, variables }),
         });

         this.requestCount++;
         return response.json();
       } catch (error) {
         if (error.status === 429) {
           // Rate limit hit, wait and retry
           await this.exponentialBackoff();
           return this.request(query, variables);
         }
         throw error;
       }
     }

     private async waitForRateLimit() {
       if (Date.now() - this.lastReset > this.INTERVAL) {
         this.requestCount = 0;
         this.lastReset = Date.now();
       }

       if (this.requestCount >= this.RATE_LIMIT) {
         const waitTime = this.INTERVAL - (Date.now() - this.lastReset);
         await new Promise(resolve => setTimeout(resolve, waitTime));
         this.requestCount = 0;
         this.lastReset = Date.now();
       }
     }

     private async exponentialBackoff(attempt = 1) {
       const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
       await new Promise(resolve => setTimeout(resolve, delay));
     }
   }
   ```

2. **Checkpointing for resumable ETL**
   ```typescript
   // Store progress in database
   await db.query(`
     CREATE TABLE etl_progress (
       tournament_id VARCHAR(50) PRIMARY KEY,
       series_fetched INT DEFAULT 0,
       games_fetched INT DEFAULT 0,
       status VARCHAR(20), -- 'pending', 'in_progress', 'completed', 'failed'
       last_updated TIMESTAMP
     )
   `);

   // Resume from last checkpoint
   async function runETL() {
     const pendingTournaments = await db.query(`
       SELECT tournament_id FROM etl_progress
       WHERE status != 'completed'
     `);

     for (const tournament of pendingTournaments) {
       try {
         await fetchTournamentData(tournament.id);
         await db.query(`
           UPDATE etl_progress
           SET status = 'completed'
           WHERE tournament_id = $1
         `, [tournament.id]);
       } catch (error) {
         await db.query(`
           UPDATE etl_progress
           SET status = 'failed'
           WHERE tournament_id = $1
         `, [tournament.id]);
       }
     }
   }
   ```

**Phase mapping:**
- **Phase 1 (ETL):** Implement rate-limited client, checkpointing, retry logic

---

### Pitfall 6: Vercel Serverless Function Timeout (10s default)

**What goes wrong:**
Vercel API routes have a 10-second timeout on Hobby plan (60s on Pro). Win-rate calculations that query the database, extract features, and run ML inference can exceed this. Your API returns 504 Gateway Timeout during demo.

**Why it happens:**
- No optimization of database queries (missing indexes)
- ML model loading on every request (not cached)
- Complex recommendation logic runs synchronously

**Prevention:**
1. **Pre-compute expensive operations**
   ```typescript
   // Phase 1: Pre-compute champion features offline
   await db.query(`
     CREATE TABLE champion_features (
       champion VARCHAR(100) PRIMARY KEY,
       early_game_strength DECIMAL,
       mid_game_strength DECIMAL,
       late_game_strength DECIMAL,
       engage_score DECIMAL,
       cc_score DECIMAL,
       -- ... 20 features total
     )
   `);

   // Phase 3: Load pre-computed features (fast)
   const features = await db.query(`
     SELECT * FROM champion_features
     WHERE champion = ANY($1)
   `, [champions]);
   ```

2. **In-memory caching for ML models**
   ```typescript
   // Global variable (persists across invocations)
   let cachedModel: any = null;

   export default async function handler(req, res) {
     if (!cachedModel) {
       // Load once, reuse across requests
       cachedModel = await loadMLModel();
     }

     const prediction = cachedModel.predict(features);
     res.json({ prediction });
   }
   ```

3. **Database query optimization**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_picks_champion_patch ON champion_picks(champion, patch_version);
   CREATE INDEX idx_synergies_pair ON champion_synergies(champion_a, champion_b);
   ```

4. **Move to Supabase Edge Functions for long-running tasks**
   ```typescript
   // Supabase Edge Function (30s timeout)
   Deno.serve(async (req) => {
     const { draftState } = await req.json();
     const recommendations = await generateRecommendations(draftState);
     return new Response(JSON.stringify(recommendations));
   });
   ```

**Phase mapping:**
- **Phase 1 (ETL):** Pre-compute champion features, synergy matrix
- **Phase 3 (Backend):** Cache ML models, optimize queries, add indexes

---

### Pitfall 7: Real-Time WebSocket Quota Exhaustion on Supabase

**What goes wrong:**
Supabase free tier has limits on concurrent real-time connections (~200 concurrent). If your draft simulator uses WebSockets and gets traction during judging, you hit the limit and new users can't connect.

**Why it happens:**
- No connection pooling or connection reuse
- WebSocket connections don't close properly (memory leak)
- Demo users open multiple tabs

**Prevention:**
1. **Fallback to polling if WebSocket unavailable**
   ```typescript
   class DraftClient {
     private ws: WebSocket | null = null;
     private pollingInterval: NodeJS.Timeout | null = null;

     async connect() {
       try {
         this.ws = new WebSocket(WS_URL);
         this.ws.onopen = () => console.log('WebSocket connected');
         this.ws.onerror = () => this.fallbackToPolling();
       } catch {
         this.fallbackToPolling();
       }
     }

     private fallbackToPolling() {
       this.pollingInterval = setInterval(async () => {
         const state = await fetch('/api/draft/state').then(r => r.json());
         this.onStateUpdate(state);
       }, 1000); // Poll every 1s
     }
   }
   ```

2. **Connection cleanup**
   ```typescript
   useEffect(() => {
     const ws = connectWebSocket();

     return () => {
       ws.close(); // Cleanup on unmount
     };
   }, []);
   ```

**Phase mapping:**
- **Phase 3 (Backend):** Implement WebSocket with polling fallback
- **Phase 4 (Frontend):** Ensure proper cleanup on page navigation

---

### Pitfall 8: Hackathon Scope Creep (Feature Bloat)

**What goes wrong:**
You spend 3 days building a "champion pool analysis dashboard" with 15 charts when judges only look at the core draft simulator. You run out of time to polish the main feature.

**Why it happens:**
- No clear MVP definition
- Building "nice to have" features before "must have" works
- Perfectionism on secondary features

**Prevention:**
1. **MVP-first development**
   ```
   Phase Priorities:

   MUST HAVE (Core demo):
   - Draft simulator interface
   - Pick recommendations (top 3)
   - Win-rate gauge

   NICE TO HAVE (If time permits):
   - Opponent predictions
   - Champion pool analyzer
   - Historical draft search

   OUT OF SCOPE:
   - User accounts / auth
   - Draft replay system
   - Mobile app
   ```

2. **Time-boxed feature development**
   - Draft UI: 1 day max
   - Recommendation engine: 1 day max
   - If feature takes >planned time, ship simplified version

**Phase mapping:**
- **All phases:** Stick to BRD timeline; defer "bonus features" to post-hackathon

---

## Minor Pitfalls

These cause annoyance but are easily fixable.

### Pitfall 9: Champion Name Inconsistencies

**What goes wrong:**
GRID API returns "Wukong" but Riot API uses "MonkeyKing". Your queries fail silently.

**Prevention:**
- Create champion alias table: `{official_name, grid_alias, riot_alias}`
- Normalize all names during ETL

**Phase mapping:**
- **Phase 1 (ETL):** Build champion name mapping table

---

### Pitfall 10: Blue vs Red Side Bias Not Modeled

**What goes wrong:**
Blue side has ~52% win rate historically (first pick advantage). Not accounting for this biases predictions.

**Prevention:**
- Add `side: 'blue' | 'red'` as a feature in win-rate model
- Add ±2% adjustment for side advantage

**Phase mapping:**
- **Phase 2 (Analytics):** Include side as a feature in win-rate model

---

### Pitfall 11: Demo Fails on Unknown Champion

**What goes wrong:**
New champion released (Ambessa in Dec 2024). Your system crashes when trying to recommend her.

**Prevention:**
- Graceful fallback: treat unknown champions as "neutral" (0.50 win rate)
- Log unknown champions for manual review

**Phase mapping:**
- **Phase 3 (Backend):** Add try-catch for unknown champion queries

---

### Pitfall 12: Cold Start Latency on First Request

**What goes wrong:**
First API request takes 5 seconds (loading ML model). Subsequent requests are fast. Demo looks slow.

**Prevention:**
- Warm up API before demo: make a dummy request
- Use Vercel preview deployments (stay warm longer)

**Phase mapping:**
- **Phase 5 (Demo prep):** Warm up API 1 minute before presenting

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Data Ingestion | Role assignment ambiguity (Critical #1) | Implement multi-signal role inference with confidence scoring |
| Phase 1: Data Ingestion | GRID API rate limits (Moderate #5) | Rate-limited client with exponential backoff and checkpointing |
| Phase 2: Analytics | Data sparsity (Critical #4) | Bayesian smoothing, archetype fallback, minimum thresholds |
| Phase 2: Analytics | Patch/meta volatility (Critical #3) | Filter to recent 3 patches, implement recency weighting |
| Phase 3: Backend API | Draft order as stateless (Critical #2) | Model draft as state machine, context-aware recommendations |
| Phase 3: Backend API | Vercel function timeout (Moderate #6) | Pre-compute features, cache ML models, optimize queries |
| Phase 3: Backend API | WebSocket quota (Moderate #7) | Implement polling fallback, ensure connection cleanup |
| Phase 4: Frontend | Scope creep (Moderate #8) | MVP-first, time-box features, defer "nice to have" |
| Phase 5: Demo Prep | Cold start latency (Minor #12) | Warm up API before demo, use preview deployments |

---

## Hackathon-Specific Traps

### Trap 1: Over-Engineering the ML Model

**What to avoid:**
- Deep learning with PyTorch (no time to train/deploy)
- Ensemble models (adds complexity)
- Hyperparameter tuning (diminishing returns)

**What to do:**
- Use logistic regression or gradient boosting (scikit-learn)
- Simple feature engineering (10-20 features)
- Accept 65% accuracy (good enough for demo)

### Trap 2: Demo Polish vs Functionality Trade-off

**What to avoid:**
- Spending 1 day on loading animations
- Custom LoL champion artwork (use placeholders)
- Perfect responsive design (optimize for 1080p only)

**What to do:**
- Functional > beautiful
- Use champion name text if icons unavailable
- Focus on core flow working smoothly

### Trap 3: "Works on My Machine" Deployment Issues

**What to avoid:**
- Testing only on localhost
- Hardcoding `localhost:3000` URLs
- Forgetting to set production environment variables

**What to do:**
- Test on Vercel preview deployment 1 day before submission
- Use environment variables for all URLs
- Verify CORS, API keys work in production

---

## Supabase/Vercel Specific Issues

### Issue 1: Supabase Connection Pooling

**Problem:** Too many database connections (PgBouncer limit: 15 on free tier)

**Solution:**
```typescript
// Use connection pooling URL
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      pooler: true // Enable connection pooling
    }
  }
);
```

### Issue 2: Edge Function Cold Starts

**Problem:** First request to Edge Function takes 3-5 seconds

**Solution:**
- Keep functions warm with scheduled cron job (every 5 minutes)
- Move hot paths to Vercel API routes (faster cold start)

### Issue 3: Vercel Build Size Limits

**Problem:** Next.js bundle with ML model exceeds 50 MB limit

**Solution:**
- Store ML model in Supabase Storage, load at runtime
- Use lightweight models (logistic regression < 1 MB)

---

## Summary: Top 5 Pitfalls to Prevent

| Rank | Pitfall | Impact | Effort to Fix Later | Prevention Effort |
|------|---------|--------|---------------------|-------------------|
| 1 | Role assignment ambiguity (Critical #1) | HIGH | Very High | Medium (build once in ETL) |
| 2 | Draft order as stateless (Critical #2) | HIGH | High | Medium (design state machine) |
| 3 | Ignoring patch/meta volatility (Critical #3) | HIGH | Medium | Low (filter queries by patch) |
| 4 | Data sparsity unstable predictions (Critical #4) | MEDIUM | Medium | Medium (Bayesian smoothing) |
| 5 | GRID API rate limits (Moderate #5) | MEDIUM | Low | Low (rate-limited client) |

---

## Sources

**Confidence:** HIGH for esports/LoL domain knowledge (based on training data about League of Legends game mechanics, professional esports, draft strategies)

**Confidence:** HIGH for serverless architecture issues (based on training data about Vercel, Supabase, serverless limitations)

**Confidence:** MEDIUM for GRID API specifics (inferred from BRD and typical esports data API patterns; should verify with actual GRID documentation)

**Note:** This research is based on Claude's training data (cutoff January 2025) about:
- League of Legends game mechanics and professional meta
- Esports data analytics common issues
- Serverless architecture limitations (Vercel, Supabase)
- Hackathon best practices
- Prediction algorithm pitfalls

**Limitations:**
- No direct access to GRID API documentation (rate limits are assumed based on typical API patterns)
- Champion meta information may be outdated (training cutoff January 2025)
- Supabase/Vercel quotas may have changed since training data

**Recommended validation:**
- Verify GRID API rate limits with official documentation
- Test Vercel function timeout limits on current plan
- Confirm Supabase real-time connection limits for free tier
- Validate current LoL patch meta with u.gg or op.gg

---

*This PITFALLS.md provides actionable prevention strategies for each pitfall, mapped to specific development phases. Use this during roadmap creation to ensure each phase addresses relevant risks early.*
