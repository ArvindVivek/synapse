import { CircleCheck, CircleDashed, Hourglass, Lightbulb } from "lucide-react";
import { Icon } from "@/components/kl";
import type { Draft } from "@/lib/draft/types";
import { NEED_LABELS, teamNeeds, type Need } from "@/lib/engine/composition";
import type { RecommendationSet } from "@/lib/engine/recommend";
import { cn } from "@/lib/kl/cn";
import { ChampionIcon } from "./ChampionIcon";

const CHECKS: { need: Need; label: string }[] = [
  { need: "ap_damage", label: "Magic damage" },
  { need: "ad_damage", label: "Physical damage" },
  { need: "engage", label: "A fight starter" },
  { need: "frontline", label: "A frontline" },
];

/** What your team has so far, against the four things a pro draft checks. */
function TeamChecklist({ picks }: { picks: string[] }) {
  const needs = teamNeeds(picks);
  // Needs only count once there are enough picks (2 for damage, 3 for the rest).
  const judged = (n: Need) => (n === "ap_damage" || n === "ad_damage" ? picks.length >= 2 : picks.length >= 3);
  return (
    <section aria-label="Your team so far" className="rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-title3 font-semibold text-ink">Your team so far</h2>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {CHECKS.map(({ need, label }) => {
          const missing = needs.includes(need);
          const pending = !judged(need);
          return (
            <li key={need} className="flex items-center gap-1.5 text-[15px]">
              <Icon
                icon={pending ? CircleDashed : missing ? CircleDashed : CircleCheck}
                size={18}
                className={pending ? "text-ink-2" : missing ? "text-warning-text" : "text-success-text"}
              />
              <span className={cn("font-bold", pending ? "text-ink-2" : missing ? "text-warning-text" : "text-ink")}>{label}</span>
              <span className="sr-only">{pending ? "(too early to tell)" : missing ? "(missing)" : "(covered)"}</span>
            </li>
          );
        })}
      </ul>
      {needs.length > 0 && (
        <p className="mt-2 text-sm text-ink-2">Still missing {needs.map((n) => NEED_LABELS[n]).join(" and ")}.</p>
      )}
    </section>
  );
}

/** Synapse's suggestions for your move, each with its reasons. Tap one to select it. */
export function AdvicePanel({
  draft,
  advice,
  selected,
  onSelect,
  isUsersTurn,
}: {
  draft: Draft;
  advice: RecommendationSet | null;
  selected: string | null;
  onSelect: (c: string) => void;
  isUsersTurn: boolean;
}) {
  const verb = advice?.action === "ban" ? "Ban" : "Pick";
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Suggestions" className="rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]" data-testid="advice">
        <div className="flex items-center gap-2">
          <Icon icon={Lightbulb} size={20} className="text-accent-text" />
          <h2 className="font-display text-title3 font-semibold text-ink">
            {isUsersTurn && advice ? `${verb} suggestions` : "Suggestions"}
          </h2>
        </div>
        {!isUsersTurn || !advice ? (
          <p className="mt-3 flex items-center gap-2 text-[15px] text-ink-2">
            <Icon icon={Hourglass} size={16} />
            New ideas as soon as it&apos;s your move.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {advice.recommendations.map((r, i) => {
              const isSelected = selected === r.champion;
              return (
                <li key={r.champion}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.champion)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-md p-2.5 text-left transition-colors",
                      isSelected ? "bg-accent-soft ring-2 ring-inset ring-accent-text" : "bg-surface-2 hover:bg-accent-soft",
                    )}
                    data-testid={`advice-${i + 1}`}
                  >
                    <span className="relative">
                      <ChampionIcon champion={r.champion} size={44} />
                      <span className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent-strong text-[11px] font-extrabold text-on-accent">
                        {i + 1}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-bold text-ink">{r.champion}</span>
                        <span className="shrink-0 text-sm font-bold tabular text-ink-2" title="Synapse's score out of 100">
                          {Math.round(r.totalScore * 100)}
                        </span>
                      </span>
                      {r.reasoning.length > 0 ? (
                        <ul className="mt-0.5 flex flex-col gap-0.5">
                          {r.reasoning.slice(0, 3).map((reason) => (
                            <li key={reason} className={cn("text-sm leading-snug", reason.startsWith("Careful") || reason.startsWith("Your team already") ? "text-warning-text" : "text-ink-2")}>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="mt-0.5 block text-sm text-ink-2">A solid all-round {advice.action}.</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <TeamChecklist picks={draft[draft.userSide].picks} />
    </div>
  );
}
