# Synapse: operating manual

League of Legends draft practice (Cloud9 × JetBrains hackathon, 2026), rebuilt for the Kitchen Labs
web release on 2026-09-29. Next 16.3.6, React 19, Tailwind v4, KL Web 1.0.1, zustand, vitest,
Playwright. Live: https://synapse-henna-eight.vercel.app (Vercel project `synapse`, scope
`arvindviveks-projects`, deploys from `main` of ArvindVivek/synapse).

## Status (true as of 2026-09-29)

- Every page and API route runs on bundled fixtures (`lib/fixtures/*.json`); no database.
- Gate: `npm run gate` = kit check, typecheck, eslint 0 warnings, vitest, build, leak-check.
- E2E: `npm run build && npm run e2e` (production server on port 3188, TZ=UTC, browser in
  America/Los_Angeles, phone + desktop, OpenAI key blanked so no test spends money).
- AI report: code path done and unit-tested with a stubbed OpenAI. **The live AI check is pending**:
  the org key was out of credits (429 insufficient_quota) on 2026-09-29, so production serves the
  code-written report. When credits return, finish a draft on the live site, tap **Write the coach's
  report**, and check the source line says "Written by AI" and the runtime log shows
  `[ai] provider: openai label=draft-report`.

## Map

| Where | What |
|---|---|
| `lib/draft/draft.ts` | the rules: pure state machine (apply, check, undo for scrim, fearless next game). Turn and phase are derived from bans/picks, never stored |
| `lib/draft/store.ts` | zustand + persist: drafts and reports in localStorage (`synapse-drafts`, 20 most recent) |
| `lib/engine/*` | pure functions on the fixtures: `recommend` (picks/bans), `projectWinRate`/`forSide`, `predictPicks`, `opponentMove` (seeded by draft id + turn), `assignRoles`, `draftFacts`/`fallbackReport` |
| `lib/ai/draft-report.ts` | the one AI call (server only): cache, per-IP limit, 15-minute pause on quota/key errors, no retries |
| `lib/api/draft-input.ts` | routes are stateless: callers send the draft; it's replayed through the rules |
| `components/synapse/*` | the UI; `DraftScreen` wires it. Advice and win chance are computed in the browser (instant); the report goes to the API |
| `scripts/build-fixtures.mjs` | regenerates `teams.json` (fictional teams, seeded) |
| `docs/` | `PRIVACY.md`, `SUPPORT.md` (studio-site format), `CREDITS.md`, `marketing/` |

API (all JSON, stateless): `POST /api/draft`, `GET /api/draft/:id`, `POST /api/draft/:id/action`,
`GET|POST /api/draft/:id/recommendations`, `GET /api/draft/:id/winrate`,
`GET /api/draft/:id/predictions`, `POST /api/draft/:id/report`, `GET /api/teams`,
`GET /api/analytics/players/:playerId`. The UI uses only the report route; the rest are the public
API over the same pure functions and are covered by `e2e/api.spec.ts`.

## Rules for this repo

- **Riot IP:** only Data Dragon champion icons (bundled, v14.24.1) under the Legal Jibber Jabber
  policy. The notice is in every footer and the About section (`RIOT_NOTICE` in `lib/site.ts`). No
  Riot, league or team logos, no player photos. Teams are three-letter badges.
- **Sample data only:** teams and players are fictional. Never attach invented stats to real players
  or teams.
- **No recurring AI cost:** the report is written only when someone taps the button. Nothing
  scheduled. Tokens (measured 2026-09-29): system prompt 262 chars (~65 tokens), facts 464 chars
  (~120 tokens), strict schema 1,068 chars (~250 tokens), so ~450 tokens in; answer ~400 tokens,
  `max_completion_tokens` 1,600 to leave room for low-effort reasoning. Cached per finished draft.
- Kit files (`components/kl`, `lib/kl`, `styles/kl-tokens.css`) are kit-owned: change them in
  kitchenlabs-kit and re-sync. `styles/theme.css` and `lib/site.ts` are ours.
- Heavy commands go through `kitchenlabs-kit/scripts/kl-slot.sh`. Deploys: push `main` with the
  author `Arvind Vivekanandan <18371231+ArvindVivek@users.noreply.github.com>`, then
  `vercel inspect <url> --wait`. Don't poll the live site.

## Env

| Name | Where | Why |
|---|---|---|
| `OPENAI_API_KEY` | Vercel production + preview (sensitive), `.env.local` | AI report. Absent = code-written reports |

Dead since the Supabase instance was deleted (owner can delete on Vercel):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`DATABASE_URL`, `GRID_API_KEY`.

## Gotchas (with causes)

- **Win chance used to depend on pick order.** The old projector added picks one at a time and some
  bonuses only counted for the later champion of a pair (live: Orianna,Sejuani vs Sejuani,Orianna
  gave synergies 0.05 vs 0.09). Now computed from the final teams; pinned in `winrate.test.ts`.
- **Red players saw blue's breakdown.** The old hook flipped only the side advantage for red.
  `forSide` flips every part; pinned in `winrate.test.ts`.
- **Don't render a panel twice for phone and desktop.** Hidden duplicates doubled test ids and
  screen-reader content; `useWide` renders one layout.
- **`vercel link` appends `VERCEL_OIDC_TOKEN` to `.env.local`.** Remove it; the app doesn't use it.
- **JSX text doesn't read `·` escapes.** Write the character or use `{"·"}`.

## Kit requests

- `PageShell`: a footer-note slot (Synapse needs the Riot notice there, so it has its own `AppShell`).
- `lib/kl/ai.ts`: map `insufficient_quota` to its own code (already queued for 1.0.2); Synapse detects
  it from the error detail for now.

## Owner-only actions

- Publish `docs/PRIVACY.md` and `docs/SUPPORT.md` on the studio site at
  `/apps/synapse/privacy` and `/apps/synapse/support` (the footer links point there).
- Top up OpenAI credits, then run the live AI check above.
- Delete the five dead env vars on Vercel.
