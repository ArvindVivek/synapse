import { ArrowRight, Binoculars, Gauge, Lightbulb, NotebookPen, Swords } from "lucide-react";
import { Button, Card, Icon } from "@/components/kl";
import { AppShell } from "@/components/synapse/AppShell";
import { ChampionIcon } from "@/components/synapse/ChampionIcon";
import { projectWinRate } from "@/lib/engine/winrate";
import { RIOT_NOTICE } from "@/lib/site";

const PREVIEW = {
  blue: ["Gnar", "Sejuani", "Orianna", "Jinx", "Lulu"],
  red: ["Aatrox", "Viego", "Syndra", "Kai'Sa", "Nautilus"],
};

const FEATURES = [
  {
    icon: Lightbulb,
    title: "Advice that explains itself",
    body: "Every turn, five suggestions with plain reasons: who it works with, who it beats, what your team is missing.",
  },
  {
    icon: Gauge,
    title: "A win chance you can read",
    body: "See how champion strength, teamwork, head-to-head matchups and side add up, updated after every pick.",
  },
  {
    icon: Binoculars,
    title: "Scouting",
    body: "Draft against a sample team: see each player's favourite champions and what they're likely to pick next.",
  },
  {
    icon: NotebookPen,
    title: "A coach's report",
    body: "When the draft is done, get a grade, every lane matchup and a game plan. The AI writes it only when you ask.",
  },
];

const STEPS = [
  { n: 1, title: "Set up", body: "Choose blue or red side, the format, and an opponent to scout." },
  { n: 2, title: "Draft", body: "Ban and pick in the real pro order while the practice opponent answers." },
  { n: 3, title: "Review", body: "See your grade and lanes, then read the coach's plan for the game." },
];

/** A static picture of a finished draft, built from the real engine and icons. */
function BoardPreview() {
  const p = projectWinRate(PREVIEW.blue, PREVIEW.red);
  const pct = Math.round(p.blueWinRate * 100);
  return (
    <Card padding="md" className="w-full max-w-md" aria-label={`Example draft: blue side ${pct}% to win`}>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-title3 font-semibold text-ink">Your win chance</p>
        <p className="font-display text-number font-semibold tabular text-ink">{pct}%</p>
      </div>
      <div className="mt-2 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
        <span className="h-full bg-blue-side" style={{ width: `${pct}%` }} />
        <span className="h-full flex-1 bg-red-side opacity-35" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["blue", "red"] as const).map((side) => (
          <ul key={side} className="flex flex-col gap-1.5">
            <li className={`text-sm font-extrabold uppercase tracking-wide ${side === "blue" ? "text-blue-text" : "text-red-text"}`}>
              {side === "blue" ? "Blue · You" : "Red"}
            </li>
            {PREVIEW[side].map((c) => (
              <li key={c} className="flex items-center gap-2 rounded-sm bg-surface-2 px-1.5 py-1">
                <ChampionIcon champion={c} size={32} />
                <span className="truncate text-[15px] font-bold text-ink">{c}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 rounded-sm bg-accent-soft px-3 py-2 text-sm text-ink">
        <Icon icon={Lightbulb} size={16} className="shrink-0 text-accent-text" />
        <span>
          <strong className="text-accent-text">Suggestion:</strong> Orianna works well with your Sejuani
        </span>
      </p>
    </Card>
  );
}

export default function Home() {
  return (
    <AppShell>
      <section className="grid items-center gap-8 pb-10 pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] md:pt-10">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-extrabold text-accent-text">
            <Icon icon={Swords} size={16} />
            League of Legends draft practice
          </p>
          <h1 className="mt-4 text-balance font-display text-hero font-semibold leading-[1.1] text-ink">
            Practice pro drafts with a coach beside you
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-2">
            Ban and pick in the real tournament order against a sparring opponent. Synapse suggests every move, says why,
            and scores your draft when it&apos;s done.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button href="/draft/new" size="lg" iconRight={ArrowRight} data-testid="cta-start">
              Start a draft
            </Button>
            <Button href="#how" variant="secondary" size="lg">
              How it works
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-2">Free, no account. Your drafts stay in this browser.</p>
        </div>
        <div className="flex justify-center md:justify-end">
          <BoardPreview />
        </div>
      </section>

      <section aria-labelledby="features" className="py-8">
        <h2 id="features" className="font-display text-title font-semibold text-ink">What you get</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} padding="md" className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
                <Icon icon={f.icon} size={22} />
              </span>
              <span>
                <h3 className="font-bold text-ink">{f.title}</h3>
                <p className="mt-0.5 text-[15px] text-ink-2">{f.body}</p>
              </span>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="scroll-mt-6 py-8">
        <h2 id="how-title" className="font-display text-title font-semibold text-ink">How it works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card padding="md" className="h-full">
                <span className="grid size-9 place-items-center rounded-full bg-accent-strong font-display text-lg font-semibold text-on-accent">{s.n}</span>
                <h3 className="mt-3 font-bold text-ink">{s.title}</h3>
                <p className="mt-0.5 text-[15px] text-ink-2">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[15px] text-ink-2">
          New to drafting? Each team bans five champions and picks five, taking turns in a fixed order: three bans each,
          three picks each, two more bans, two more picks.
        </p>
      </section>

      <section id="about" aria-labelledby="about-title" className="scroll-mt-6 py-8">
        <Card padding="lg" tone="inset">
          <h2 id="about-title" className="font-display text-title2 font-semibold text-ink">About Synapse</h2>
          <div className="mt-2 flex max-w-3xl flex-col gap-2 text-[15px] leading-relaxed text-ink-2">
            <p>
              Synapse began at the Cloud9 &times; JetBrains hackathon in 2026 as a draft assistant built on pro match data.
              That database is gone, so today&apos;s Synapse runs on estimated champion stats and made-up sample teams:
              treat the numbers as practice guidance, not scouting of real players.
            </p>
            <p>It&apos;s free, has no accounts or ads, and saves your drafts only in your browser.</p>
            <p>{RIOT_NOTICE}</p>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
