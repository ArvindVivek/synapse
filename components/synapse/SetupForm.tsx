"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { nanoid } from "nanoid";
import { ArrowRight, Check, EyeOff } from "lucide-react";
import { Button, Icon } from "@/components/kl";
import { newDraft } from "@/lib/draft/draft";
import { useDraftStore } from "@/lib/draft/store";
import type { DraftFormat, Side } from "@/lib/draft/types";
import { TEAMS } from "@/lib/engine/teams";
import { cn } from "@/lib/kl/cn";
import { TeamBadge } from "./TeamBadge";
import { FORMATS, ROLE_NAMES, SIDE_STYLES } from "./labels";

const SIDES: { value: Side; title: string; line: string }[] = [
  { value: "blue", title: "Blue side", line: "You ban first and take the first pick." },
  { value: "red", title: "Red side", line: "You answer their picks and take the last one." },
];

function Legend({ children, hint }: { children: string; hint?: string }) {
  return (
    <legend className="mb-3">
      <span className="block font-display text-title3 font-semibold text-ink">{children}</span>
      {hint && <span className="mt-0.5 block text-[15px] text-ink-2">{hint}</span>}
    </legend>
  );
}

/** Radio card: a whole card you tap, with a check when chosen. */
function Choice({
  name,
  checked,
  onChange,
  children,
  className,
  testId,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <label
      data-testid={testId}
      className={cn(
        "relative flex cursor-pointer gap-3 rounded-md bg-surface p-4 shadow-[var(--shadow-card)] ring-2 ring-inset transition-colors",
        checked ? "ring-accent-text" : "ring-transparent hover:ring-line",
        className,
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "absolute right-3 top-3 grid size-6 place-items-center rounded-full",
          checked ? "bg-accent-strong text-on-accent" : "bg-surface-2 text-transparent",
        )}
      >
        <Icon icon={Check} size={15} strokeWidth={3} />
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text" />
    </label>
  );
}

/**
 * Side, format and (optionally) a sample opponent to scout. Starting saves the draft in this
 * browser and opens it. `draftId` reuses an id (a draft link opened on another device).
 */
export function SetupForm({ draftId }: { draftId?: string }) {
  const router = useRouter();
  const save = useDraftStore((s) => s.save);
  const [side, setSide] = useState<Side>("blue");
  const [format, setFormat] = useState<DraftFormat>("tournament");
  const [teamId, setTeamId] = useState<string | null>(TEAMS[0].id);
  const [starting, setStarting] = useState(false);

  function start(e: React.FormEvent) {
    e.preventDefault();
    setStarting(true);
    const id = draftId ?? nanoid(10);
    save(newDraft({ id, userSide: side, format, opponentTeamId: teamId }));
    if (draftId) setStarting(false);
    else router.push(`/draft/${id}`);
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-8" aria-label="Set up a draft">
      <fieldset>
        <Legend>Your side</Legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIDES.map((s) => (
            <Choice key={s.value} name="side" checked={side === s.value} onChange={() => setSide(s.value)} testId={`side-${s.value}`}>
              <span aria-hidden="true" className={cn("mt-1 h-10 w-1.5 shrink-0 rounded-full", SIDE_STYLES[s.value].fill)} />
              <span className="pr-8">
                <span className={cn("block font-display text-title3 font-semibold", SIDE_STYLES[s.value].text)}>{s.title}</span>
                <span className="block text-[15px] text-ink-2">{s.line}</span>
              </span>
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <Legend>Format</Legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {FORMATS.map((f) => (
            <Choice key={f.value} name="format" checked={format === f.value} onChange={() => setFormat(f.value)} testId={`format-${f.value}`}>
              <span className="pr-8">
                <span className="block font-bold text-ink">{f.label}</span>
                <span className="block text-[15px] text-ink-2">{f.line}</span>
              </span>
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <Legend hint="Synapse scouts their players' favourite champions and plays like them. These teams are made-up samples.">
          Opponent to scout
        </Legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEAMS.map((t) => (
            <Choice key={t.id} name="team" checked={teamId === t.id} onChange={() => setTeamId(t.id)} testId={`team-${t.id}`}>
              <TeamBadge tag={t.tag} />
              <span className="min-w-0 pr-8">
                <span className="block font-bold text-ink">{t.name}</span>
                <span className="block truncate text-sm text-ink-2">
                  {t.players.map((p) => p.name).join(" · ")}
                </span>
                <span className="sr-only">Players by role: {t.players.map((p) => `${ROLE_NAMES[p.role]} ${p.name}`).join(", ")}</span>
              </span>
            </Choice>
          ))}
          <Choice name="team" checked={teamId === null} onChange={() => setTeamId(null)} testId="team-none">
            <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xs bg-surface-2 text-ink-2">
              <Icon icon={EyeOff} size={20} />
            </span>
            <span className="pr-8">
              <span className="block font-bold text-ink">No scouting</span>
              <span className="block text-sm text-ink-2">A general opponent that plays the strongest picks.</span>
            </span>
          </Choice>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px] text-ink-2">Your draft is saved in this browser. No account needed.</p>
        <Button type="submit" size="lg" iconRight={ArrowRight} loading={starting} className="sm:min-w-56" data-testid="start-draft">
          Start the draft
        </Button>
      </div>
    </form>
  );
}
