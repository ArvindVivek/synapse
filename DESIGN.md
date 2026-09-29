# Synapse design

KL Web 1.0.1 (Fredoka + Nunito, chunky buttons, one card shadow, light and dark). App-owned tokens
live in `styles/theme.css`; every text pair is measured by `lib/tokens.test.ts`.

## Colour roles

| Colour | Token | Means | Never |
|---|---|---|---|
| Spark lime `#B5CC18` | `--accent*` | Synapse's advice and your action: suggestion ranks and rings, the Lock in button, "Your pick" status, the grade | decoration, the sides |
| Olive text `#68750E` / lime (dark) | `--accent-text` | accent-coloured text, focus ring, suggestion rings on the light page (lime fill is only 1.6:1 there) | |
| Blue `#2F6FEB` | `--blue-side`, `--blue-text`, `--blue-soft` | blue side | advice |
| Red `#E5484D` | `--red-side`, `--red-text`, `--red-soft` | red side | errors (those use `--danger`) |
| Danger | kit `--danger*` | the Ban button, crossed-out bans, "their edge" | |
| Success / warning | kit | positive breakdown points and "your edge" / signature picks, missing team needs | |

The lime button face carries a dark olive label (`--on-accent #232A04`, 8.3:1): white on lime is 1.8:1.

## Layout

- Phones (< 1024px): compact team strips (bans and picks as icon rows), a compact win-chance bar,
  then tabs (Champions, Advice, Scouting) and a pinned action bar. One of each panel is rendered, not
  a hidden copy (`useWide` in `DraftScreen`).
- Desktop: teams | champion grid | win chance, advice and scouting.
- The action bar is fixed to the bottom; the page pads for it.
- A finished draft shows its grade, lanes and report first on phones.

## Motion

| Moment | Motion |
|---|---|
| Tile and chip press | kit press, 75 ms scale 0.95-0.97 |
| Win chance bar | CSS width transition, 500 ms |
| Opponent thinking | 650 ms delay per move, a pulsing dot in the action bar |
| Everything | respects Reduce Motion (kit CSS rule and MotionConfig) |

## Icons and assets

lucide-react through the kit `Icon`. Champion icons are Riot Data Dragon images (docs/CREDITS.md).
No team, league or Riot logos; teams are three-letter badges.
