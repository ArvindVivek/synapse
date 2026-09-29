import type { Side } from "@/lib/draft/types";
import { forSide, type WinRateProjection } from "@/lib/engine/winrate";
import { cn } from "@/lib/kl/cn";
import { points, SIDE_STYLES } from "./labels";

const ROWS = [
  { key: "baseComposition", label: "Champion strength", line: "How strong each pick is right now" },
  { key: "synergies", label: "Teamwork", line: "How well each team's picks work together" },
  { key: "matchups", label: "Head-to-head", line: "Who beats whom in direct matchups" },
  { key: "sideAdvantage", label: "Side", line: "Blue side gets the first pick" },
] as const;

/**
 * Your chance to win from the draft alone, and where it comes from. Each row is in points of
 * win chance for you (50% is a coin flip).
 */
export function WinChance({ projection, side, compact = false }: { projection: WinRateProjection; side: Side; compact?: boolean }) {
  const mine = forSide(projection, side);
  const pct = Math.round(mine.winRate * 100);
  const enemy: Side = side === "blue" ? "red" : "blue";
  return (
    <section aria-label="Win chance" className="rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]" data-testid="win-chance">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-title3 font-semibold text-ink">Your win chance</h2>
        <p className="font-display text-number font-semibold tabular text-ink" data-testid="win-pct">
          {pct}%
        </p>
      </div>
      <div
        className="mt-2 flex h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={`You ${pct}%, opponent ${100 - pct}%`}
      >
        <span className={cn("h-full transition-[width] duration-500", SIDE_STYLES[side].fill)} style={{ width: `${pct}%` }} />
        <span className={cn("h-full flex-1 opacity-35", SIDE_STYLES[enemy].fill)} />
      </div>
      {!compact && (
        <>
          <dl className="mt-4 flex flex-col gap-2.5">
            {ROWS.map((r) => {
              const v = mine.breakdown[r.key];
              return (
                <div key={r.key} className="flex items-start justify-between gap-3">
                  <dt className="min-w-0">
                    <span className="block text-[15px] font-bold text-ink">{r.label}</span>
                    <span className="block text-sm text-ink-2">{r.line}</span>
                  </dt>
                  <dd
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[15px] font-extrabold tabular",
                      v > 0 ? "bg-success-soft text-success-text" : v < 0 ? "bg-danger-soft text-danger-text" : "bg-surface-2 text-ink-2",
                    )}
                  >
                    {points(v)}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-3 text-sm text-ink-2">Points of win chance, from estimated stats.</p>
        </>
      )}
    </section>
  );
}
