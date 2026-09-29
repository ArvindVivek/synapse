# Synapse design

KL Web 1.0.1 (Fredoka + Nunito, chunky buttons, one card shadow, light and dark). App-owned tokens
live in `styles/theme.css`; every text pair is measured by `lib/tokens.test.ts`.

## Colour roles

| Colour | Token | Means | Never |
|---|---|---|---|
| Deep plum `#592673` | `--accent*` | Synapse's advice and your action: suggestion ranks and rings, the Lock in button, "Your pick" status, the grade | decoration, the sides |
| Plum / lavender `#BB84D8` (dark) | `--accent-text` | accent-coloured text, focus ring, suggestion rings (plum fill is only 1.8:1 on the dark page, so rings use the lavender there) | |
| Blue `#2F6FEB` | `--blue-side`, `--blue-text`, `--blue-soft` | blue side | advice |
| Red `#E5484D` | `--red-side`, `--red-text`, `--red-soft` | red side | errors (those use `--danger`) |
| Danger | kit `--danger*` | the Ban button, crossed-out bans, "their edge" | |
| Success / warning | kit | positive breakdown points and "your edge" / signature picks, missing team needs | |

White on the plum button face is 10.8:1. The palette moved from lime to plum on 2026-09-29: Thrifty shipped a lime (#A3C614) ΔE 3.2 from Synapse's, and keeps it.

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
