// Builds lib/fixtures/teams.json: the sample opponent teams, their players and each player's
// champion pool. Synapse's pro match database (GRID data in Supabase) was deleted, so these are
// made up: fictional teams and handles, never real players with invented numbers. The output is
// deterministic (seeded), so re-running it changes nothing unless this file changes.
//
//   npm run fixtures
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../lib/fixtures/", import.meta.url));
const champions = JSON.parse(readFileSync(`${dir}champions.json`, "utf8"));
const meta = JSON.parse(readFileSync(`${dir}meta.json`, "utf8"));

// mulberry32: tiny, seedable, good enough for sample data.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROLES = ["top", "jungle", "mid", "adc", "support"];
const TEAMS = [
  { id: "harbor-owls", name: "Harbor Owls", tag: "HOW", players: ["Tidewarden", "Mossback", "Lantern", "Quillshot", "Harbor"] },
  { id: "ironpeak", name: "Ironpeak", tag: "IRP", players: ["Anvil", "Ridgeline", "Cinder", "Talon", "Bastion"] },
  { id: "night-market", name: "Night Market", tag: "NMK", players: ["Vendor", "Alleycat", "Neon", "Ledger", "Awning"] },
  { id: "paper-comets", name: "Paper Comets", tag: "PCM", players: ["Origami", "Kestrel", "Halley", "Stardrift", "Glue"] },
  { id: "velvet-signal", name: "Velvet Signal", tag: "VSG", players: ["Static", "Wren", "Morse", "Carrier", "Beacon"] },
  { id: "granite-foxes", name: "Granite Foxes", tag: "GFX", players: ["Boulder", "Russet", "Flint", "Vixen", "Burrow"] },
  { id: "lowtide", name: "Lowtide", tag: "LTD", players: ["Undertow", "Kelp", "Riptide", "Brine", "Shoal"] },
  { id: "saffron-circuit", name: "Saffron Circuit", tag: "SFC", players: ["Relay", "Fuse", "Voltage", "Diode", "Ohm"] },
];

const winRate = (name) => meta.winRates[name] ?? 0.5;
const playsRole = (c, role) => c.roles.includes(role) || (c.flex?.roles ?? []).includes(role);

const teams = TEAMS.map((team, t) => {
  const rand = rng(1_000 + t * 97);
  const players = team.players.map((handle, i) => {
    const role = ROLES[i];
    const shuffle = (list) => {
      const out = [...list];
      for (let k = out.length - 1; k > 0; k--) {
        const j = Math.floor(rand() * (k + 1)); // Fisher-Yates: same order on every Node version
        [out[k], out[j]] = [out[j], out[k]];
      }
      return out;
    };
    // Mains come from the role's usual champions; at most one flex pick joins as a pocket pick.
    const mains = shuffle(champions.filter((c) => c.roles.includes(role)));
    const flex = shuffle(champions.filter((c) => !c.roles.includes(role) && playsRole(c, role)));
    const size = Math.min(mains.length, 5 + Math.floor(rand() * 3));
    const shuffled = [...mains.slice(0, size - 1), ...(flex.length && rand() < 0.5 ? flex.slice(0, 1) : mains.slice(size - 1, size))];
    const pool = shuffled.map((c, rank) => {
      // Earlier picks in the shuffle are the player's mains: more games.
      const games = Math.max(3, Math.round((24 - rank * 3.5) * (0.6 + rand() * 0.6)));
      // Win rate leans on the champion's estimated strength, plus the player's own form.
      const p = Math.min(0.78, Math.max(0.3, winRate(c.name) + (rand() - 0.45) * 0.3));
      const wins = Math.round(games * p);
      const daysAgo = 1 + Math.floor(rand() * (rank < 2 ? 14 : 75));
      return [c.name, games, wins, daysAgo];
    });
    pool.sort((a, b) => b[1] - a[1]);
    return { id: `${team.id}-${role}`, name: handle, role, pool };
  });
  return { id: team.id, name: team.name, tag: team.tag, players };
});

const out = {
  _about:
    "Sample opponents. Fictional teams and players; pools are [champion, games, wins, days since last played]. Built by scripts/build-fixtures.mjs.",
  teams,
};
writeFileSync(`${dir}teams.json`, JSON.stringify(out));
console.log(`teams.json: ${teams.length} teams, ${teams.reduce((n, t) => n + t.players.reduce((m, p) => m + p.pool.length, 0), 0)} pool entries`);
