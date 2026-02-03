# AI Draft Report Modal - Visual Guide

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DRAFT IN PROGRESS                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Picks: 9/10   Bans: 10/10                          │  │
│  │  [Champion Grid with remaining picks...]            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User completes 20th turn
                            │ (Auto-trigger)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              LOADING STATE (2-3 seconds)                    │
│  ╔════════════════════════════════════════════════════╗    │
│  ║                                                    ║    │
│  ║              ┌──────────────┐                     ║    │
│  ║              │   🧠        │  ← Rotating          ║    │
│  ║              │   (Gradient) │    animation         ║    │
│  ║              └──────────────┘                     ║    │
│  ║                                                    ║    │
│  ║           ANALYZING DRAFT...                      ║    │
│  ║   AI is evaluating team compositions              ║    │
│  ║                                                    ║    │
│  ║              • • •  ← Pulsing dots                ║    │
│  ╚════════════════════════════════════════════════════╝    │
│           Dark backdrop with blur                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Report generated
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   REPORT STATE                              │
│  ╔════════════════════════════════════════════════════╗    │
│  ║  ✨ AI DRAFT REPORT                           [X] ║    │
│  ║  Powered by Synapse AI Engine                      ║    │
│  ╠════════════════════════════════════════════════════╣    │
│  ║                                                    ║    │
│  ║  ┌──────────────────────────────────────────────┐ ║    │
│  ║  │ 📊 DRAFT SUMMARY                            │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  Win Probability: 54%  │  Grade: A  │  BLUE │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  ⚡ Strong early game pressure               │ ║    │
│  ║  │  ⚡ Excellent team fighting                  │ ║    │
│  ║  │  ⚡ Balanced damage profile                  │ ║    │
│  ║  └──────────────────────────────────────────────┘ ║    │
│  ║                                                    ║    │
│  ║  ┌──────────────────────────────────────────────┐ ║    │
│  ║  │ 🧠 STRATEGIC ANALYSIS                       │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  Team Comp: Balanced engage composition...   │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  🏆 Win Conditions:                          │ ║    │
│  ║  │  • Secure early drakes                      │ ║    │
│  ║  │  • Create picks through roams               │ ║    │
│  ║  │  • Force fights around Baron                │ ║    │
│  ║  └──────────────────────────────────────────────┘ ║    │
│  ║                                                    ║    │
│  ║  ┌──────────────────────────────────────────────┐ ║    │
│  ║  │ ⚔️  MATCHUP INSIGHTS                         │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  TOP LANE         [Favorable ↗]             │ ║    │
│  ║  │  Play aggressively levels 1-3...            │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  JUNGLE           [Even →]                   │ ║    │
│  ║  │  Contest scuttle but avoid fights...        │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  MID LANE         [Favorable ↗]             │ ║    │
│  ║  │  BOT LANE         [Unfavorable ↘]           │ ║    │
│  ║  │  SUPPORT          [Even →]                   │ ║    │
│  ║  └──────────────────────────────────────────────┘ ║    │
│  ║                                                    ║    │
│  ║  ┌──────────────────────────────────────────────┐ ║    │
│  ║  │ ⏰ ACTIONABLE RECOMMENDATIONS               │ ║    │
│  ║  │                                              │ ║    │
│  ║  │  [Early] [Mid] [Late]  ← 3 columns          │ ║    │
│  ║  │  • Tip  • Tip  • Tip                        │ ║    │
│  ║  │  • Tip  • Tip  • Tip                        │ ║    │
│  ║  │  • Tip  • Tip  • Tip                        │ ║    │
│  ║  └──────────────────────────────────────────────┘ ║    │
│  ║                                          ▲        ║    │
│  ╚══════════════════════════════════════════│════════╝    │
│                                             │             │
│                                      Scrollable content    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ User closes (X or ESC)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACK TO DRAFT VIEW                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Champion Grid]                                    │  │
│  │                                                      │  │
│  │  Sidebar:                                           │  │
│  │  ┌────────────────────────────────────────┐        │  │
│  │  │ 🧠 View AI Draft Report    ← Button   │        │  │
│  │  ├────────────────────────────────────────┤        │  │
│  │  │ Start New Draft                        │        │  │
│  │  └────────────────────────────────────────┘        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Click "View AI Draft Report"
                            ▼
                     Reopens to REPORT STATE
```

## Color Scheme

### Backgrounds
- **Modal**: `gray-900` → `gray-950` gradient
- **Cards**: `gray-800/50` with `gray-700` borders
- **Sections**: `cyan-900/30` → `blue-900/30` gradients

### Accents
- **Primary**: Cyan (`cyan-400`, `cyan-500`, `cyan-600`)
- **Success**: Green (`green-400`, `green-500`)
- **Warning**: Yellow (`yellow-400`, `yellow-500`)
- **Danger**: Red (`red-400`, `red-500`)
- **Magic**: Purple (`purple-400`, `purple-500`)

### Advantage Indicators
```
Favorable:   🟢 Green  (#10b981)
Even:        🟡 Yellow (#f59e0b)
Unfavorable: 🔴 Red    (#ef4444)
```

## Animation Timeline

```
0ms     - Backdrop fade-in starts
200ms   - Backdrop fade complete
0ms     - Modal scale/opacity starts (overlaps)
300ms   - Modal entrance complete
400ms   - Section 1 slide-in starts
550ms   - Section 2 slide-in starts
700ms   - Section 3 slide-in starts
850ms   - Section 4 slide-in starts
1000ms  - All animations complete
```

## Responsive Breakpoints

| Breakpoint | Modal Width | Modal Height | Layout |
|------------|-------------|--------------|--------|
| Mobile (<768px) | 95% | 90% | Single column |
| Tablet (768-1024px) | 90% | 90% | Single column |
| Desktop (>1024px) | 80% | 90% | Grid layouts |

## Section Breakdown

### 1. Draft Summary (Top)
- **Layout**: 3-column grid (Win %, Grade, Side)
- **Key Strengths**: Vertical list with green accents
- **Icons**: Trophy, Target, Shield

### 2. Strategic Analysis
- **Team Comp**: Single paragraph description
- **Win Conditions**: Bulleted list (green)
- **Power Spikes**: Bulleted list (purple)
- **Icons**: Brain, Trophy, Flame

### 3. Matchup Insights
- **Lanes**: 5 cards with color-coded advantages
- **Jungle Pathing**: Blue info card
- **Objectives**: Purple numbered list
- **Icons**: Swords, Map, Crosshair

### 4. Recommendations
- **Layout**: 3-column grid (Early/Mid/Late)
- **Each column**: 4 bullet points
- **Icons**: Clock, Swords, Trophy

## Interaction States

### Hover Effects
- **Close Button**: `gray-800` → `gray-700`
- **Cards**: Subtle lift effect (2px translateY)
- **Buttons**: Shadow intensity increase

### Focus States
- **Modal**: Focus trap (keyboard navigation contained)
- **Buttons**: Visible outline for accessibility

### Loading States
- **Brain Icon**: Continuous 360° rotation (2s)
- **Dots**: Sequential pulsing (0.8s each, 0.2s delay)

## Typography

### Headings
- **H2 (Main Title)**: `text-2xl font-bold`
- **H3 (Section Headers)**: `text-lg font-bold`
- **H4 (Subsections)**: `text-sm font-semibold`

### Body Text
- **Primary**: `text-sm text-gray-300`
- **Secondary**: `text-xs text-gray-400`
- **Labels**: `text-xs uppercase tracking-wider`

### Special Text
- **Stats**: `text-2xl font-bold` with color
- **Grades**: Gradient backgrounds
- **Advantages**: Color-coded text

## Iconography

All icons from `/components/ui/icons.tsx`:
- BrainIcon - AI/Analysis
- TrophyIcon - Win conditions
- SwordsIcon - Combat/Matchups
- ShieldCheckIcon - Defense/Comp
- TargetIcon - Objectives
- FlameIcon - Power spikes
- ZapIcon - Energy/Synergy
- ClockIcon - Timing
- MapIcon - Map control
- TrendUpIcon - Favorable
- TrendDownIcon - Unfavorable
- CrosshairIcon - Precision/Targets
- CloseIcon - Modal close
- SparklesIcon - AI magic

---

**Key Design Principles:**
1. **Gaming Aesthetic** - Dark theme, glowing accents, premium feel
2. **Information Hierarchy** - Clear sections, visual separation
3. **Progressive Disclosure** - Scrollable content, not overwhelming
4. **Feedback-Driven** - Animations guide attention
5. **Professional Polish** - Smooth transitions, attention to detail
