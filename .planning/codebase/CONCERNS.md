# Codebase Concerns

**Analysis Date:** 2026-01-28

## Project Status

This is a **very early-stage hackathon project** (initial commit only) with minimal implemented code. The codebase consists of a default Next.js 16.1.6 starter template with 3 source files totaling 106 lines of code. A comprehensive Business Requirements Document exists but implementation has not yet begun.

---

## Tech Debt & Implementation Gaps

**Critical: MVP Not Yet Built:**
- Files: `app/page.tsx`, `app/layout.tsx` (boilerplate only)
- Status: Placeholder components with no game logic
- Impact: Full game implementation required from scratch
- Fix approach: Follow the detailed BRD in `docs/thrifty_brd.md` as specification; build core systems incrementally

**Major Missing Systems:**
- Game loop and state management (no useState patterns for game state)
- Physics/collision system for falling items and catcher
- Canvas or positioned element rendering for animations
- Score calculation engine
- Leaderboard persistence (localStorage integration)
- Power-up/obstacle system
- Sound effects (no audio library)

---

## Architectural Concerns

**Dependency on React Hooks Without Framework:**
- Issue: No state management pattern established for complex game state (rounds, budget, items, combos, active effects)
- Files: Project-wide, starting with `app/page.tsx`
- Impact: Risk of deeply nested state and prop drilling as game complexity grows
- Fix approach: Consider implementing custom context API layers early or integrate a lightweight state management solution before implementing core game logic

**No Separation of Game Logic from UI:**
- Issue: Game mechanics (scoring, budget tracking, collision detection) should be decoupled from React components
- Current state: No game engine separation
- Impact: Testing game rules independently becomes difficult; UI changes require game logic review
- Fix approach: Create `lib/gameEngine.ts` or similar with pure functions for all game calculations before building components

**Rendering Performance Not Addressed:**
- Issue: No performance optimization strategy for rendering ~50+ falling items simultaneously with animations
- Current risk: Falling items rendered as separate React components = 60 re-renders per second × component count
- Impact: Frame drops on lower-end devices despite 60 FPS target in BRD
- Fix approach: Evaluate canvas-based rendering or React.memo optimization for falling item list

---

## Testing & Quality Concerns

**No Test Infrastructure:**
- Issue: No test files, test runner, or testing configuration
- Current state: `package.json` has no test script, no jest/vitest config
- Impact: Cannot verify scoring calculations, collision detection, or round progression without manual testing
- Fix approach: Add test infrastructure early (jest or vitest); create test files for `lib/gameEngine.ts` utilities before integration testing

**No ESLint Configuration for Game Code:**
- Issue: `eslint.config.mjs` exists but only enforces Next.js defaults
- Files: `eslint.config.mjs`
- Impact: Inconsistent code style as game code grows; no custom rules for game-specific patterns
- Fix approach: Define explicit rules for game logic files (e.g., pure function enforcement, immutable state handling)

**Missing Accessibility Verification:**
- Issue: BRD specifies accessibility requirements (high contrast, 44px touch targets, colorblind-friendly) with no current enforcement
- Current state: Default Next.js template uses semantic HTML but game components not yet built
- Impact: Failure to meet BRD requirements if not checked during development
- Fix approach: Create accessibility checklist; use axe DevTools during component development

---

## Performance & Scaling Concerns

**Leaderboard Storage Scaling:**
- Issue: BRD specifies localStorage with top 100 scores retained; localStorage has ~5-10MB browser limit
- Current risk: Minimal with 100 entries, but unclear if entries include optional fields (highest round score, best combo)
- Impact: Event booth could accumulate 100s of entries; unclear data structure or cleanup strategy
- Fix approach: Define leaderboard entry schema; implement cleanup/archival strategy; test with 100+ entries before event

**Animation Frame Count Unknown:**
- Issue: BRD requires smooth 60 FPS with unclear how many items fall simultaneously
- Spec says "3-6 typical" but maximum not specified
- Impact: Without performance baseline, frame rate target may be unmet on booth hardware
- Fix approach: Establish performance budget; test with worst-case (10+ items + animations + effects) before final build

**No Build-Time Optimization:**
- Issue: `next.config.ts` is empty (no config options)
- Current opportunity: Image optimization, font optimization not configured
- Impact: Slower load times than possible; matters for event booth where users expect instant play
- Fix approach: Configure image optimization, font subsetting, and bundle analysis before deployment

---

## Fragile Areas & Risk Points

**Budget Calculation System:**
- Complexity: Scoring involves multiple components (base, item value, budget bonus, time bonus, combos) with multiplicative combo stacking
- Files: To be implemented in `lib/gameEngine.ts` or equivalent
- Risk: Off-by-one errors in score calculation affect leaderboard validity; combo multiplier stacking logic is error-prone
- Safe modification: Write unit tests for each score component independently; test combo stacking with fixture data
- Test coverage needed: All 5 combo types; combo interactions (e.g., Perfect Budget + Balanced + Speed Demon)

**Falling Item Collision Detection:**
- Complexity: Must detect overlap between continuously-falling items and horizontally-moving catcher at 60 FPS
- Current concern: No collision library selected; custom hitbox implementation required
- Risk: Off-by-one pixel errors, frame timing issues, or generous hitbox allowing catches beyond visual bounds
- Safe modification: Implement with clear hitbox visualization during development; test across multiple catcher positions and item fall rates
- Test coverage needed: Overlap at screen edges; edge cases (item exactly at catcher boundary)

**Round Progression State Machine:**
- Files: To be implemented across components
- Risk: Multiple overlapping conditions (time out, budget bust, all slots filled) could trigger simultaneously with undefined behavior
- Example concern: Player fills last slot with 0.1 seconds remaining AND catches budget-busting item—which condition wins?
- Safe modification: Define explicit state machine in constants (see `lib/gameStates.ts`); test all edge cases
- Test coverage needed: Round-end conditions with overlapping triggers

**Junie Reaction System:**
- Complexity: BRD specifies 14+ emoji reactions triggered by different in-game events
- Risk: Reaction bubble timing (1.5 seconds fade) could queue or conflict if multiple events occur rapidly
- Files: To be implemented in component handling Junie display
- Safe modification: Implement reaction queue (FIFO) rather than immediate replacement; test rapid-fire events
- Test coverage needed: Concurrent events (catch, budget warning, timer low simultaneously)

---

## Dependency Risks

**React 19 & Next.js 16 (Cutting Edge):**
- Issue: Both dependencies are very recent (Next.js 16.1.6, React 19.2.3)
- Ecosystem maturity: Fewer third-party libraries tested with these versions
- Impact: Potential breaking changes; limited Stack Overflow answers for issues
- Fix approach: Monitor releases; consider pinning to minor version after testing; document all dependency versions in README

**No Type Safety for Game State:**
- Issue: TypeScript strict mode enabled but no game-specific types defined
- Current state: `tsconfig.json` has `"strict": true` but game types (Item, Round, GameState, etc.) don't exist yet
- Impact: Risk of runtime type mismatches (e.g., undefined budget property)
- Fix approach: Create `lib/types.ts` with all game entity types before implementation

**TailwindCSS v4 (New Major Version):**
- Issue: `@tailwindcss/postcss` v4 is a major rewrite; limited adoption
- Current risk: Custom game animations may have compatibility issues with Tailwind directives
- Fix approach: Test animation syntax early; have fallback CSS ready if Tailwind proves incompatible for complex animations

---

## Missing Documentation

**No Implementation Plan:**
- Issue: BRD exists but no technical breakdown of what to build first
- Impact: Developers may start with complex systems (power-ups) before core loop (falling items, budget)
- Fix approach: Create ARCHITECTURE.md with recommended implementation order (See: build core loop first → add budget/scoring → add power-ups)

**Game Constants Undefined:**
- Issue: BRD contains many magic numbers (fall speeds, spawn rates, budget values) with no central configuration
- Files: To be implemented in `lib/constants.ts` or `config/gameConfig.ts`
- Impact: Difficulty tuning during playtesting; scattered hardcoded values in components
- Fix approach: Create centralized constants file matching BRD section 8.2 Round Configuration

**No Error Handling Strategy:**
- Issue: No specification for what happens if score calculation fails, localStorage is unavailable, or item spawn fails
- Files: To be determined during implementation
- Impact: Silent failures possible; unclear recovery paths
- Fix approach: Define error boundaries and fallback behavior before implementation

---

## Security Considerations

**Leaderboard Name Input Validation:**
- Risk: BRD specifies "basic blocklist" for inappropriate words but no implementation
- Files: Game over screen (to be implemented)
- Current mitigation: None yet
- Recommendations: Implement client-side blocklist (limited effectiveness); consider server-side validation if leaderboard moved to backend; sanitize HTML to prevent injection

**localStorage Data Integrity:**
- Risk: Players could manipulate localStorage directly to forge high scores
- Current mitigation: None; all data trusted from client
- Impact: Leaderboard validity at event booth compromised
- Fix approach: If leaderboard matters (prize/ranking), move to backend with authentication; for event entertainment, document that scores are client-stored and could be cheated

**No Content Security Policy:**
- Risk: No CSP headers or configuration in Next.js
- Impact: Potential XSS vulnerability if user-generated content (player names) rendered without escaping
- Fix approach: Configure strict CSP in `next.config.ts`; always sanitize player names before display

---

## Known Limitations

**Browser Storage Only (No Backend):**
- Current: Leaderboard stored in localStorage, persists across sessions in same browser
- Limitation: Different browser = different leaderboard; event booth needs shared leaderboard across all booth terminals
- Impact: Contradicts BRD requirement for "shared across all players at the event booth"
- Path forward: Either (1) move leaderboard to backend, (2) manually sync localStorage across terminals, or (3) clarify BRD expectation for single-browser booth setup

**No Sound Implementation Specified:**
- Issue: BRD includes detailed sound effects spec but no audio library selected
- Current risk: Sound fallback behavior undefined if audio cannot load
- Files: Not yet implemented
- Fix approach: Choose audio library (Web Audio API, Howler.js, or simple `<audio>` tags); plan graceful degradation if audio fails

**Mobile Touch Support:**
- Issue: BRD specifies touch controls (swipe) but keyboard-first implementation typical in web games
- Current state: No mobile input handling
- Fix approach: Implement keyboard control first (fastest); add touch layer as enhancement before event if time permits

---

## Summary of Critical Path Blockers

**Before Implementation Starts:**
1. Create `lib/gameEngine.ts` with pure functions for scoring, budget math, collision detection (testable without React)
2. Define `lib/types.ts` with all TypeScript interfaces for game entities
3. Create `lib/constants.ts` with all BRD magic numbers in one place
4. Set up test infrastructure (jest/vitest config and sample test file)

**Before First Playable Build:**
1. Implement core loop: items fall → catcher catches → budget deducts → round ends when conditions met
2. Verify round-end conditions (time out, budget bust, slots filled) don't conflict
3. Test collision detection accuracy across screen positions and fall rates
4. Verify leaderboard persistence works across page reloads

**Before Event Booth Deployment:**
1. Test with event booth hardware (verify 60 FPS target achievable)
2. Test localStorage behavior with 100+ entries (verify performance, no data loss)
3. Verify accessibility requirements (touch target sizes, color contrast, colorblind support)
4. Test sound fallback if audio service unavailable

---

*Concerns audit: 2026-01-28*
