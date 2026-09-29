# Credits and third-party assets

## Champion icons: Riot Games (Data Dragon)

`public/champions/*.png` are the 70 champion square icons Synapse uses, 128 × 128 px, downloaded
from Riot's Data Dragon CDN, version **14.24.1**
(`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/<Id>.png`).

**Choice: bundled, not loaded from Data Dragon at runtime.** Bundling keeps the app working offline
and fast, avoids a third-party request on every page, and keeps images sharp without an image
service (Next's optimiser is turned off: `images.unoptimized`). The original hackathon download also
fetched 84 more champion icons and pro-team logos; those were removed (unused icons, and team logos
are not ours to show).

Used under Riot Games' "Legal Jibber Jabber" fan-project policy (https://www.riotgames.com/en/legal):
Synapse is free and non-commercial, and shows the required notice in every page footer and in the
About section:

> Synapse was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot
> Games. Riot Games does not endorse or sponsor this project.

What Synapse does **not** use: Riot, League of Legends or LoL Esports logos; pro-team logos; player
photos. Teams appear as three-letter text badges, and the sample teams and players are fictional.

## Champion names, roles and damage types

Game facts (names, usual roles, damage type) in `lib/fixtures/champions.json`, carried over from
the original Synapse tables. League of Legends and its champions are trademarks of Riot Games, Inc.

## Code and fonts

- KL Web kit (Kitchen Labs): `components/kl`, `lib/kl`, `styles/kl-tokens.css`.
- Fredoka and Nunito, via Google Fonts (SIL Open Font License).
- Icons: lucide-react (ISC license).
