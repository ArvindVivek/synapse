import { Ban } from "lucide-react";
import { Icon } from "@/components/kl";
import { turnInfo } from "@/lib/draft/draft";
import type { Draft, Side } from "@/lib/draft/types";
import { assignRoles } from "@/lib/engine/roles";
import { cn } from "@/lib/kl/cn";
import { ChampionIcon } from "./ChampionIcon";
import { ROLE_NAMES, ROLE_SHORT, SIDE_NAMES, SIDE_STYLES } from "./labels";

/** One side of the draft: its five ban slots, its five picks (with the role each will play). */
export function TeamPanel({
  draft,
  side,
  label,
  compact = false,
  className,
}: {
  draft: Draft;
  side: Side;
  label: string;
  /** Phones: picks as one row of icons, so both teams and the champion grid share the screen. */
  compact?: boolean;
  className?: string;
}) {
  const team = draft[side];
  const turn = turnInfo(draft);
  const styles = SIDE_STYLES[side];
  const roles = assignRoles(team.picks);
  const activeBan = turn?.side === side && turn.action === "ban" ? team.bans.length : -1;
  const activePick = turn?.side === side && turn.action === "pick" ? team.picks.length : -1;
  const isUser = side === draft.userSide;

  return (
    <section aria-label={`${SIDE_NAMES[side]}: ${label}`} className={cn("min-w-0 rounded-lg bg-surface p-3 shadow-[var(--shadow-card)]", className)} data-testid={`team-${side}`} data-picks={team.picks.join(",")}>
      <header className="flex items-center gap-2">
        <span aria-hidden="true" className={cn("h-5 w-1.5 rounded-full", styles.fill)} />
        <h2 className={cn("min-w-0 truncate font-display text-[17px] font-semibold", styles.text)}>{label}</h2>
        {isUser && <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-xs font-extrabold uppercase text-accent-text">You</span>}
      </header>

      <div className="mt-2.5">
        <h3 className="sr-only">Bans</h3>
        <ol className="grid grid-cols-5 gap-1.5" aria-label="Bans">
          {Array.from({ length: 5 }, (_, i) => {
            const champion = team.bans[i];
            return (
              <li
                key={i}
                className={cn(
                  "relative grid aspect-square w-full max-w-8 place-items-center overflow-hidden rounded-xs bg-surface-2",
                  i === activeBan && "ring-2 ring-accent-text",
                )}
              >
                {champion ? (
                  <>
                    <ChampionIcon champion={champion} size={32} muted alt={`Banned ${champion}`} className="size-full" />
                    <span aria-hidden="true" className="absolute h-0.5 w-10 rotate-45 bg-danger" />
                  </>
                ) : (
                  <Icon icon={Ban} size={14} className="text-ink-2" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {compact ? (
        <ol className="mt-2.5 grid grid-cols-5 gap-1.5" aria-label="Picks">
          {Array.from({ length: 5 }, (_, i) => {
            const champion = team.picks[i];
            return (
              <li key={i} className="flex min-w-0 flex-col items-center gap-0.5">
                <span className={cn("grid aspect-square w-full max-w-11 place-items-center overflow-hidden rounded-xs bg-surface-2", i === activePick && "ring-2 ring-accent-text")}>
                  {champion ? <ChampionIcon champion={champion} size={44} alt={champion} className="size-full" /> : null}
                </span>
                <span className="w-full truncate text-center text-xs font-bold text-ink-2">
                  {champion ? ROLE_SHORT[roles[champion]] : "\u00a0"}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
      <ol className="mt-3 flex flex-col gap-1.5" aria-label="Picks">
        {Array.from({ length: 5 }, (_, i) => {
          const champion = team.picks[i];
          const active = i === activePick;
          return (
            <li
              key={i}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-sm px-1.5 py-1",
                active ? cn("ring-2 ring-inset ring-accent-text", styles.soft) : "bg-surface-2",
              )}
            >
              {champion ? (
                <ChampionIcon champion={champion} size={36} />
              ) : (
                <span aria-hidden="true" className="size-9 shrink-0 rounded-xs border-2 border-dashed border-line" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">{champion ?? (active ? "Choosing…" : "—")}</span>
                {champion && <span className="block text-xs font-bold uppercase tracking-wide text-ink-2">{ROLE_NAMES[roles[champion]]}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      )}
    </section>
  );
}
