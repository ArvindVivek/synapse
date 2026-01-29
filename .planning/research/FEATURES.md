# Feature Landscape: LoL Draft Assistants & Esports Analytics

**Domain:** League of Legends esports draft tools and analytics platforms
**Researched:** 2026-01-28
**Confidence:** MEDIUM (based on training data knowledge + BRD analysis)

## Executive Summary

Professional LoL draft assistants occupy a niche but critical space in esports infrastructure. Based on analysis of existing tools (Mobalytics, U.GG Pro, OP.GG Esports, Oracle's Elixir) and the competitive landscape, this research categorizes features into three tiers:

1. **Table Stakes** - Features coaches expect from any draft tool (15 features identified)
2. **Differentiators** - Features that would impress hackathon judges and professional users (12 features identified)
3. **Anti-Features** - Complexity traps to avoid (8 anti-patterns identified)

**Key Finding:** Most existing tools focus on *post-match analysis* (stats, replays). Very few offer *real-time draft recommendations* with transparent reasoning. This is DraftIQ's core competitive advantage.

**Hackathon Strategy:** Build all table stakes features (essential for credibility), nail 2-3 differentiators (AI predictions, transparent reasoning), and ruthlessly avoid anti-features (over-complexity, ML opacity).

---

## Table Stakes Features

Features users expect. Missing these = product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Champion statistics by patch** | Meta shifts every 2 weeks; outdated stats are useless | Medium | Mobalytics, U.GG, OP.GG all have this. Must filter by patch version. |
| **Win rate by champion** | Most basic analytical metric | Low | Overall + by role. Expected accuracy: ±2% for 50+ games sample. |
| **Pick/ban rates** | Shows meta priorities | Low | What's being prioritized in competitive. 80%+ ban rate = must-ban territory. |
| **Player champion pools** | Coaches scout opponents this way | Medium | "Faker plays Azir 53% of games" = ban target. Needs player-role mapping. |
| **Team composition display** | Visual representation of draft state | Medium | Blue side vs Red side with role assignments. Must feel "LoL authentic" (judges are esports-focused). |
| **Draft history/logs** | Ability to review what was picked/banned | Low | Undo/redo, export draft state. "What if we banned X instead?" simulations. |
| **Role-specific filtering** | Not all champions work in all roles | Low | Morgana = Mid/Support. Must filter recommendations by role context. |
| **Side awareness (Blue vs Red)** | Draft order differs by side | Medium | Blue gets first pick, Red gets counter-pick. 52-48% win rate differential. |
| **Real-time draft state tracking** | Current bans, picks, whose turn | Medium | "It's Red R3, we need jungle." Core UX requirement. |
| **Champion synergy indicators** | "Yasuo needs knockup" basic logic | High | Expected by coaches. Even simple synergies (CC chains, engage combos). |
| **Matchup data** | "Renekton beats Gnar 58% of time" | Medium | Lane matchup win rates. Critical for counter-picking. |
| **Tournament/region filtering** | LCK meta ≠ LCS meta | Low | Different regions prioritize different champions. Must support regional filtering. |
| **Responsive UI for 1920x1080** | Coaches use large displays | Low | Must work on analyst workstations (dual monitors, large screens). |
| **Search/autocomplete champions** | 165 champions = need fast search | Low | Type "Azi" → suggest Azir. Standard UX pattern. |
| **Ban phase 1 vs 2 distinction** | Different strategic purposes | Medium | First 3 bans = power picks. Last 2 bans = counter-pick denial. UI must distinguish. |

### Implementation Priority for Hackathon

**Must Have (Week 1):**
- Champion statistics, win rates, pick/ban rates
- Team composition display with role assignments
- Draft state tracking (whose turn, available champions)
- Side awareness (Blue vs Red)

**Must Have (Week 2):**
- Player champion pools
- Champion synergy indicators
- Matchup data
- Search/autocomplete

**Nice to Have:**
- Draft history/undo
- Tournament filtering (start with "all LCK/LEC/LCS/LPL", refine later)

---

## Differentiators

Features that set DraftIQ apart and impress hackathon judges. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Hackathon Impact |
|---------|-------------------|------------|------------------|
| **AI-powered pick recommendations** | "What should we pick next?" with data-backed reasoning | High | **CRITICAL DIFFERENTIATOR**. This is the core innovation. Judges expect AI integration. |
| **Opponent pick prediction** | "Enemy will likely pick Orianna (68% probability)" | High | **HIGH IMPACT**. Demonstrates ML capability. Real coaching value. |
| **Live win-rate projection** | Real-time % chance to win as draft evolves | High | **HIGH IMPACT**. Visual, dynamic, impressive demo. Shows technical sophistication. |
| **Transparent reasoning** | "Pick Sejuani because: CC chain with Ashe, counters Viego, adds AP damage" | Medium | **CRITICAL**. Separates DraftIQ from "black box" AI tools. Coaches need to trust recommendations. |
| **Comfort pick detection** | "Faker is 8-0 on Azir this split" = high-priority ban | Medium | **MEDIUM IMPACT**. Shows understanding of player psychology, not just stats. |
| **Composition gap warnings** | "WARNING: Full AD comp, easily countered" | Medium | **MEDIUM IMPACT**. Proactive coaching assistance. Prevents draft blunders. |
| **Historical draft similarity search** | "This draft is 85% similar to T1 vs DK Game 3" | High | **LOW IMPACT** (time-intensive). Cool feature but not demo-critical. Post-hackathon. |
| **Synergy score visualization** | 9.2/10 synergy score with breakdown | Low | **MEDIUM IMPACT**. Makes synergies tangible. Easy to implement, high demo value. |
| **Counter-pick suggestions** | "Enemy picked Jinx → Recommend Zed (dive threat)" | Medium | **HIGH IMPACT**. Actionable coaching advice. Differentiates from stat-only tools. |
| **Pre-match opponent scouting** | "T1's Faker: Azir 100% WR, Orianna 83% WR → ban both" | Low | **HIGH IMPACT**. Pre-match prep is a real coaching workflow. Easy to implement. |
| **Patch-aware meta tracking** | "Azir buffed in 14.2 → tier moves S → A+" | High | **LOW IMPACT** (data-intensive). Would require Riot API or web scraping. Skip for hackathon. |
| **Turn-by-turn draft replay** | "Rewind draft to R3 and try different pick" | Medium | **MEDIUM IMPACT**. Great for practice/learning. Lower priority than live recommendations. |

### Hackathon Focus Strategy

**MUST BUILD (Core Differentiators):**
1. **AI-powered pick recommendations** - The headline feature
2. **Opponent pick prediction** - Demonstrates ML sophistication
3. **Live win-rate projection** - Visual, dynamic, impressive
4. **Transparent reasoning** - Builds trust, shows depth

**BUILD IF TIME:**
5. Comfort pick detection
6. Composition gap warnings
7. Synergy score visualization
8. Counter-pick suggestions
9. Pre-match opponent scouting

**POST-HACKATHON:**
- Historical draft similarity
- Patch-aware meta tracking (requires external data)
- Turn-by-turn replay (UX-heavy)

### Why These Differentiators Matter for Judges

**Category 3 Judging Criteria (from hackathon brief):**
- ✅ **Real-time capability** → Live win-rate projection, turn-by-turn recommendations
- ✅ **Data utilization** → AI models trained on GRID data (1,500+ games)
- ✅ **Innovation** → Opponent pick prediction (Bayesian), transparent reasoning
- ✅ **User experience** → Clear explanations, not black-box AI
- ✅ **Functionality** → All core features working (recommendations, predictions, win-rate)

**What Competitors Lack:**
- Mobalytics: No real-time draft recommendations (only post-match analysis)
- U.GG/OP.GG Pro: Static statistics, no predictive AI
- Oracle's Elixir: Data journalism focus, not a coaching tool
- **DraftIQ fills the gap: Real-time, AI-powered, transparent draft assistance**

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **In-game item recommendations** | Scope creep; draft tools ≠ in-game tools | Focus on draft phase only. Stay in scope. |
| **Real-time stream integration** | Requires video processing, OCR, fragile | Use manual draft input or GRID API data. Pre-match simulation, not live stream parsing. |
| **Deep learning models (neural nets)** | Overkill for 1,500 games; overfitting risk; hard to explain | Use Gradient Boosting + heuristics. Transparent, fast, good enough. |
| **Multi-game support (Dota, Valorant)** | Dilutes focus; different metas, mechanics | LoL only. Master one game, not jack-of-all-trades. |
| **Advanced statistics (DAWG, RAPM, etc.)** | Analysts care; coaches don't; complexity theater | Stick to win rate, KDA, synergy scores. Coaches want actionable advice, not math. |
| **Social features (chat, teams, sharing)** | No time for auth, user management, social graph | Public app, no login. Single-user experience. Export drafts as JSON if sharing needed. |
| **Champion ability tooltips** | Coaches know abilities; feature bloat | Assume expert users. No tutorial mode. |
| **Mobile app (native iOS/Android)** | Time sink; web works fine on tablets | Responsive web UI. Focus on desktop (coach workstations). |

### Why These Are Traps

**Complexity Theater:** Features that *look* impressive but don't solve real problems.
- Example: "We have 47 statistical metrics!" → Coaches ignore 45 of them, only use win rate and pick frequency.

**Scope Creep:** Features that expand beyond hackathon timeline.
- Example: "Let's add real-time stream parsing!" → Spend 3 days debugging OCR, never finish core recommendations.

**ML Overengineering:** Using advanced models when simple ones work.
- Example: "Let's use LSTM neural networks!" → 1,500 games is too small for deep learning. Gradient Boosting works better, faster, and is explainable.

**Feature Bloat from Competitor Envy:**
- Mobalytics has champion guides → "We should too!" → NO. DraftIQ is a draft tool, not a learning platform.
- OP.GG has player profiles → "We should too!" → NO. Focus on draft phase, not player careers.

### Hackathon-Specific Anti-Patterns

| Anti-Pattern | Impact | Mitigation |
|--------------|--------|------------|
| **Trying to beat Mobalytics at everything** | Guaranteed failure; they have 50+ engineers | Focus on ONE thing (real-time draft) and be best at it |
| **Building infrastructure instead of features** | "Let's build a data pipeline framework!" → no demo | Use Supabase, Vercel. Pre-built infrastructure. Ship features. |
| **Perfectionism on ML accuracy** | "We need 80% prediction accuracy!" → miss deadline | 60-65% is impressive for hackathon. Transparent reasoning > raw accuracy. |
| **Polishing UI before functionality works** | "Let's animate the win-rate gauge!" → core features broken | Ship ugly but functional. Polish on Day 7, not Day 2. |

---

## Feature Dependencies

Understanding what must be built first (foundation) vs what can be built later (enhancement).

```
FOUNDATION (Must Build First):
├─ Data Pipeline
│  ├─ GRID API integration
│  ├─ ETL for tournaments, teams, players, games
│  └─ Database schema (Supabase PostgreSQL)
│
├─ Core Statistics
│  ├─ Champion win rates by patch
│  ├─ Pick/ban rates
│  └─ Player champion pools
│
└─ Draft State Management
   ├─ Current draft tracking (bans, picks)
   ├─ Turn logic (whose turn, what phase)
   └─ Available champion filtering

LAYER 2 (Depends on Foundation):
├─ Synergy Calculation
│  ├─ Champion co-occurrence analysis
│  ├─ Synergy scores (0-10)
│  └─ Known synergy patterns (CC chains, wombo combos)
│
├─ Matchup Matrix
│  ├─ Champion vs champion win rates
│  ├─ Role-specific matchups
│  └─ Head-to-head historical data
│
└─ Composition Analysis
   ├─ Team comp features (early/mid/late game power)
   ├─ Damage type distribution (AD/AP)
   └─ Composition archetype detection (poke, engage, teamfight)

LAYER 3 (AI Features - Depends on Layer 2):
├─ Pick Recommendations
│  ├─ Synergy-based scoring
│  ├─ Counter-pick evaluation
│  ├─ Composition gap detection
│  └─ Reasoning generation
│
├─ Opponent Pick Prediction
│  ├─ Player champion pool probability
│  ├─ Bayesian prediction model
│  └─ Synergy-weighted likelihood
│
└─ Win-Rate Projection
   ├─ ML model (Gradient Boosting)
   ├─ Feature extraction from draft state
   └─ Real-time probability calculation

LAYER 4 (Polish - Build Last):
├─ UI Enhancements
│  ├─ Animations, transitions
│  ├─ LoL-authentic styling
│  └─ Responsive layout
│
└─ Export/Sharing
   ├─ Draft state JSON export
   ├─ Screenshot/share functionality
   └─ Draft history persistence
```

### Critical Path for Hackathon

**Days 1-2:** Foundation (data pipeline, core stats, draft state)
**Days 3-4:** Layer 2 (synergy, matchups, comp analysis)
**Days 5-6:** Layer 3 (AI recommendations, predictions, win-rate)
**Day 7:** Layer 4 (UI polish, demo prep)
**Day 8:** Buffer for bugs, demo video

**Risk:** If Layer 3 doesn't work, fall back to Layer 2 features (synergy/matchup display) and still have a credible demo.

---

## MVP Feature Set

For hackathon submission, these features constitute a **complete, impressive demo**.

### Core Interaction Loop

1. **User selects teams** (e.g., T1 vs C9)
2. **Draft begins** (Blue ban 1)
3. **User makes ban/pick**
4. **DraftIQ responds with:**
   - ✅ Recommended next pick (Top 3 with reasoning)
   - ✅ Opponent prediction (Top 3 with probability)
   - ✅ Current win-rate projection (%) with breakdown
5. **Repeat until draft complete** (10 picks, 10 bans)
6. **Final analysis** (team comp strengths/weaknesses)

### MVP Feature Checklist

**Data & Backend:**
- [ ] GRID API integration (Central Data, Series State)
- [ ] 1,500+ games ingested (LCK, LEC, LCS, LPL)
- [ ] Champion stats by patch
- [ ] Player champion pools
- [ ] Synergy matrix (pre-computed)
- [ ] Matchup matrix (pre-computed)

**AI & Analytics:**
- [ ] Pick recommendation engine (synergy + counters + comp)
- [ ] Opponent pick prediction (Bayesian probability)
- [ ] Win-rate projection model (Gradient Boosting)
- [ ] Transparent reasoning generation

**UI & UX:**
- [ ] Draft board (Blue vs Red, bans, picks)
- [ ] Team/player selection
- [ ] Recommendation panel (Top 3 picks with reasoning)
- [ ] Prediction panel (Top 3 opponent picks with probability)
- [ ] Win-rate gauge (live updating %)
- [ ] Champion search/autocomplete

**Nice-to-Have (if time):**
- [ ] Pre-match champion pool analyzer
- [ ] Draft history/undo
- [ ] Composition gap warnings
- [ ] Export draft as JSON

---

## Feature Comparison Matrix

How DraftIQ compares to existing tools.

| Feature | Mobalytics | U.GG Pro | OP.GG Esports | Oracle's Elixir | **DraftIQ** |
|---------|------------|----------|---------------|-----------------|-------------|
| **Champion statistics** | ✅ Comprehensive | ✅ Good | ✅ Good | ✅ Excellent | ✅ Good (GRID data) |
| **Player champion pools** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Draft phase tracking** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ **YES (real-time)** |
| **Pick recommendations** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ **YES (AI-powered)** |
| **Opponent predictions** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ **YES (Bayesian)** |
| **Win-rate projection** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ **YES (live updates)** |
| **Transparent reasoning** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ **YES (critical differentiator)** |
| **Synergy analysis** | ✅ Basic | ❌ No | ❌ No | ❌ No | ✅ Yes (scored 0-10) |
| **Matchup data** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Pre-match scouting** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Post-match analysis** | ✅ Excellent | ✅ Good | ✅ Good | ✅ Excellent | ❌ **Out of scope** |
| **Champion guides** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ❌ **Out of scope** |
| **Replay analysis** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ **Out of scope** |

### Key Takeaway

**DraftIQ is the ONLY tool that offers real-time, AI-powered draft recommendations with transparent reasoning.**

Existing tools are either:
1. **Stat aggregators** (U.GG, OP.GG) - Show you numbers, don't tell you what to do
2. **Post-match analyzers** (Mobalytics, Oracle's Elixir) - Great for reviewing past games, useless during draft
3. **Generic AI tools** - "Black box" recommendations without reasoning

**DraftIQ combines:**
- Real-time draft assistance (unique)
- AI-powered predictions (unique)
- Transparent reasoning (unique)
- Professional esports data (GRID)

This is a **clear blue ocean opportunity** in the esports tooling space.

---

## User Personas & Feature Prioritization

Different users care about different features. Prioritize based on primary persona.

### Persona 1: Professional LoL Coach (Primary)

**Needs:**
- ✅ **CRITICAL:** Real-time pick recommendations during live draft
- ✅ **CRITICAL:** Opponent pick predictions to prepare counter-picks
- ✅ **HIGH:** Pre-match champion pool scouting
- ✅ **HIGH:** Composition gap warnings ("You're full AD!")
- ✅ **MEDIUM:** Historical matchup data
- ❌ **LOW:** Post-match analysis (they have analysts for this)

**Pain Points:**
- "I have 30 seconds to make a ban decision. I need fast, reliable advice."
- "I need to know what enemy mid is likely to pick so I can counter."
- "I can't remember every champion synergy and matchup."

**Feature Priorities for This Persona:**
1. Pick recommendations with reasoning
2. Opponent predictions
3. Win-rate projection
4. Pre-match scouting

### Persona 2: Team Analyst (Secondary)

**Needs:**
- ✅ **CRITICAL:** Pre-match opponent scouting reports
- ✅ **HIGH:** Historical draft patterns
- ✅ **HIGH:** Champion pool depth analysis
- ✅ **MEDIUM:** Synergy/matchup matrices
- ❌ **LOW:** Real-time draft (analysts prep, coaches execute)

**Pain Points:**
- "I need to prepare a scouting report for T1's Faker before the match."
- "What are T1's most common team composition archetypes?"

**Feature Priorities for This Persona:**
1. Champion pool analyzer
2. Historical draft data
3. Synergy/matchup matrices
4. Team composition trends

### Persona 3: Competitive Player (Tertiary)

**Needs:**
- ✅ **HIGH:** Practice draft simulator
- ✅ **MEDIUM:** Champion synergy/counter education
- ❌ **LOW:** Professional team data (they care about solo queue)

**Pain Points:**
- "I want to practice drafting for Clash (amateur tournament)."
- "I need to learn which champions synergize well."

**Feature Priorities for This Persona:**
1. Draft simulator
2. Synergy indicators
3. Matchup data

### Hackathon Prioritization

**Target Persona:** Professional LoL Coach (Persona 1)
**Rationale:** Judges are esports-focused. Demonstrating real coaching value = maximum impact.

**Build for Persona 1 first, Persona 2 if time permits, ignore Persona 3.**

---

## Feature Complexity Assessment

Estimated engineering effort for each feature (1 engineer, 7-8 days).

| Feature | Complexity | Time Estimate | Dependencies |
|---------|------------|---------------|--------------|
| **GRID API integration** | Medium | 6-8 hours | None |
| **ETL pipeline (1,500 games)** | Medium | 8-12 hours | GRID API |
| **Database schema** | Low | 2-4 hours | None |
| **Champion statistics** | Low | 4-6 hours | ETL complete |
| **Player champion pools** | Medium | 6-8 hours | ETL complete |
| **Draft state tracking** | Medium | 6-8 hours | Database schema |
| **Synergy calculation** | High | 12-16 hours | Champion stats, game data |
| **Matchup matrix** | Medium | 8-10 hours | Champion stats, game data |
| **Pick recommendations** | High | 16-20 hours | Synergy, matchups, comp analysis |
| **Opponent prediction** | High | 12-16 hours | Player pools, Bayesian model |
| **Win-rate projection** | Very High | 20-24 hours | ML model, feature engineering |
| **Transparent reasoning** | Medium | 8-12 hours | Recommendation engine |
| **Draft simulator UI** | Medium | 12-16 hours | React components, WebSocket |
| **Recommendation panel UI** | Medium | 8-10 hours | Draft simulator |
| **Win-rate gauge UI** | Low | 4-6 hours | Draft simulator |
| **Champion pool analyzer** | Medium | 8-10 hours | Player pools API |

### Total Effort Estimate

**Backend (Data + AI):** ~80-100 hours
**Frontend (UI/UX):** ~40-50 hours
**Total:** ~120-150 hours

**Available Time:** 7 days × 12 hours/day = ~84 hours (assuming intense hackathon pace)

**Conclusion:** Cannot build everything. Must ruthlessly prioritize.

### Minimum Viable Demo

Features that MUST work for a credible hackathon demo (~60 hours):

1. GRID API integration (8 hours)
2. ETL pipeline (10 hours)
3. Champion statistics (6 hours)
4. Player champion pools (6 hours)
5. Draft state tracking (6 hours)
6. Pick recommendations (heuristic-based, not full ML) (12 hours)
7. Draft simulator UI (12 hours)
8. Recommendation panel UI (8 hours)

**Total: ~68 hours** → Achievable in 7 days

**Stretch Goals (if time):**
- Win-rate projection (add 20 hours)
- Opponent prediction (add 12 hours)
- Synergy visualization (add 4 hours)

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|------------|--------|-------|
| **Table stakes features** | HIGH | Training data on Mobalytics, U.GG, OP.GG + BRD | These features are well-documented in existing tools. Clear requirements. |
| **Differentiators** | MEDIUM | BRD specifications + esports domain knowledge | AI recommendation quality is hypothesis (needs validation). Opponent prediction accuracy unknown until tested. |
| **Anti-features** | HIGH | Common hackathon pitfalls + scope management | Patterns observed across many failed projects. Well-established anti-patterns. |
| **Complexity estimates** | MEDIUM | Based on similar projects + BRD detail | Real implementation may vary ±30%. Synergy calculation could be harder than estimated. |
| **Competitive landscape** | MEDIUM | Training data (pre-2025) + BRD context | Tools may have added features post-training. General landscape likely accurate. |

### Research Gaps

**Could not verify (no web access):**
- Current state of Mobalytics/U.GG draft tools in 2026 (may have added real-time features)
- Whether Oracle's Elixir launched a draft tool (was data-journalism focused)
- New competitors in LoL draft assistant space (post-2025)

**Recommendation:** Quick competitive research (30 min web search) before finalizing feature set. Confirm no competitor launched similar tool in past year.

---

## Sources & Methodology

**Research Methodology:**
1. Analyzed comprehensive BRD (2,400+ lines of detailed specifications)
2. Leveraged training data knowledge of:
   - Mobalytics (champion stats, guides, pro builds)
   - U.GG (win rates, matchups, pro player data)
   - OP.GG (esports data, player profiles)
   - Oracle's Elixir (data journalism, analytics)
3. Cross-referenced with hackathon judging criteria (Category 3: Drafting Assistant)
4. Applied domain knowledge of LoL esports (draft phase structure, coaching workflows)

**Limitations:**
- No web search access (research based on pre-2025 training data + BRD)
- Competitive landscape may have changed (2025-2026)
- Feature priorities are hypothesis (would benefit from user interviews)

**Confidence Level:** MEDIUM
- High confidence on table stakes (well-established patterns)
- Medium confidence on differentiators (some hypothesis, validated by BRD)
- High confidence on anti-features (established anti-patterns)

**Recommendation:** This research provides solid foundation for hackathon. Validate with 30-minute web search before finalizing roadmap.

---

## Recommendations for Roadmap

Based on this feature research, recommended phase structure:

### Phase 1: Foundation (Days 1-2)
- GRID API integration
- ETL pipeline (1,500 games)
- Core statistics (win rates, pick/ban rates)
- Database schema

### Phase 2: Core Features (Days 3-4)
- Draft state tracking
- Player champion pools
- Synergy calculation (heuristic-based)
- Matchup matrix
- Basic recommendation engine (no ML)

### Phase 3: AI Features (Days 5-6)
- ML-powered pick recommendations
- Opponent pick prediction
- Win-rate projection model
- Transparent reasoning generation

### Phase 4: UI & Demo (Day 7)
- Draft simulator interface
- Recommendation/prediction panels
- Win-rate gauge
- LoL-authentic styling
- Demo prep (T1 vs C9 scenario)

### Phase 5: Buffer (Day 8)
- Bug fixes
- Performance optimization
- Demo video
- Documentation

**Critical Success Factors:**
1. ✅ Get Phase 1-2 done by Day 4 (foundation + core features)
2. ✅ Have basic recommendations working by Day 5 (even if heuristic-based)
3. ✅ Polish UI on Day 7, not Day 3 (function over form)
4. ✅ Have fallback demo if ML doesn't work (heuristic recommendations still valuable)

**Risk Mitigation:**
- If ML models don't converge: Use heuristic-based recommendations (still impressive)
- If opponent prediction fails: Focus on pick recommendations (core value prop)
- If win-rate projection is inaccurate: Hide feature, demo recommendations instead
- If UI polish takes too long: Ship functional but ugly (judges care about features > aesthetics)

---

*End of Feature Research*
