// The app's identity in one place. The icon, share card, manifest, robots and sitemap
// templates all read it. This file is ours: the sync script copies it once (--init) and never
// overwrites it.

export const site = {
  /** Shown in the header, the tab title and the share card. */
  name: "Synapse",
  /** Home-screen label: 12 characters or fewer. */
  shortName: "Synapse",
  /** One plain sentence: what it does and for whom. */
  description: "Practice League of Legends pro drafts against a sparring opponent, with pick advice that explains itself and a coach's report at the end.",
  /** Production URL, no trailing slash. Makes share-image URLs absolute. */
  url: "https://synapse-henna-eight.vercel.app",
  /** Brand key: privacy and support links live at kitchenlabs-one.vercel.app/apps/<slug>/. */
  slug: "synapse",
  /** false for private, single-owner tools: robots.ts then disallows everything. */
  isPublic: true,
  /** Must equal --bg in kl-tokens.css (light, dark) so browser chrome never flashes. */
  themeColor: { light: "#F2F4F9", dark: "#0B0F1A" },
  /** Share-card colours (Satori can't read CSS variables): the app's accent and neutrals. */
  card: { bg: "#0B0F1A", ink: "#EEF1F7", ink2: "#A0A9BC", accent: "#BB84D8" },
} as const;

/** Riot Games' "Legal Jibber Jabber" fan-project notice (riotgames.com/en/legal), word for word. */
export const RIOT_NOTICE =
  "Synapse was created under Riot Games' “Legal Jibber Jabber” policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.";
