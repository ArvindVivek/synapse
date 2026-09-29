import { Binoculars } from "lucide-react";
import { EmptyState, Icon } from "@/components/kl";
import { availableChampions, isComplete, otherSide } from "@/lib/draft/draft";
import type { Draft } from "@/lib/draft/types";
import { predictPicks } from "@/lib/engine/predict";
import { openRoles } from "@/lib/engine/roles";
import { getTeam } from "@/lib/engine/teams";
import { cn } from "@/lib/kl/cn";
import { ChampionIcon } from "./ChampionIcon";
import { TeamBadge } from "./TeamBadge";
import { ROLE_NAMES } from "./labels";

/**
 * The scouted opponent: each player's most-played champions and, for roles they still have to
 * fill, what they're likely to pick next. Tap a champion to select it (to ban it, say).
 */
export function ScoutingPanel({
  draft,
  onSelect,
  canAct,
}: {
  draft: Draft;
  onSelect: (c: string) => void;
  canAct: boolean;
}) {
  const team = getTeam(draft.opponentTeamId);
  if (!team) {
    return (
      <section aria-label="Scouting" className="rounded-lg bg-surface shadow-[var(--shadow-card)]">
        <EmptyState
          icon={Binoculars}
          tone="neutral"
          title="No scouting this draft"
          message="Pick a sample opponent when you start a draft to see their players' favourite champions here."
        />
      </section>
    );
  }
  const open = new Set(availableChampions(draft));
  const stillToFill = isComplete(draft) ? [] : openRoles(draft[otherSide(draft.userSide)].picks);

  return (
    <section aria-label="Scouting" className="flex flex-col gap-3" data-testid="scouting">
      <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]">
        <TeamBadge tag={team.tag} />
        <div className="min-w-0">
          <h2 className="truncate font-display text-title3 font-semibold text-ink">{team.name}</h2>
          <p className="text-sm text-ink-2">Sample team · made-up players and stats</p>
        </div>
      </div>
      {team.players.map((player) => {
        const likely = stillToFill.includes(player.role) ? predictPicks(draft, player, 2) : [];
        return (
          <article key={player.id} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]" aria-label={`${player.name}, ${ROLE_NAMES[player.role]}`}>
            <header className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold text-ink">{player.name}</h3>
              <span className="text-xs font-extrabold uppercase tracking-wide text-ink-2">{ROLE_NAMES[player.role]}</span>
            </header>
            <ul className="mt-2 flex flex-col gap-1">
              {player.pool.slice(0, 3).map((e) => {
                const available = open.has(e.champion);
                return (
                  <li key={e.champion}>
                    <button
                      type="button"
                      disabled={!available || !canAct}
                      onClick={() => onSelect(e.champion)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-sm px-1.5 py-1 text-left",
                        available && canAct ? "cursor-pointer hover:bg-surface-2" : "cursor-default",
                      )}
                      aria-label={`${e.champion}: ${e.games} games, ${Math.round(e.winRate * 100)}% wins${available ? "" : ", not available"}`}
                    >
                      <ChampionIcon champion={e.champion} size={32} muted={!available} />
                      <span className={cn("min-w-0 flex-1 truncate text-[15px] font-bold", available ? "text-ink" : "text-ink-2 line-through")}>
                        {e.champion}
                      </span>
                      {e.comfort === "signature" && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-extrabold text-warning-text">Signature</span>
                      )}
                      <span className="shrink-0 text-sm tabular text-ink-2">
                        {e.games}g · {Math.round(e.winRate * 100)}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {likely.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-sm bg-accent-soft px-2.5 py-1.5 text-sm text-ink">
                <Icon icon={Binoculars} size={15} className="text-accent-text" />
                <span className="font-bold text-accent-text">Likely next:</span>
                {likely.map((p) => `${p.champion} ${Math.round(p.probability * 100)}%`).join(", ")}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
