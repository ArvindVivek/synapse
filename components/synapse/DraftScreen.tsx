"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import { FolderOpen } from "lucide-react";
import { Card, EmptyState, Skeleton, useToast } from "@/components/kl";
import { actionErrorMessage, isComplete, isUsersTurn, nextFearlessGame, otherSide, turnInfo } from "@/lib/draft/draft";
import { useDraftStore } from "@/lib/draft/store";
import { opponentMove } from "@/lib/engine/opponent";
import { recommend } from "@/lib/engine/recommend";
import { getTeam } from "@/lib/engine/teams";
import { projectWinRate } from "@/lib/engine/winrate";
import { cn } from "@/lib/kl/cn";
import { ActionBar } from "./ActionBar";
import { AdvicePanel } from "./AdvicePanel";
import { ChampionGrid } from "./ChampionGrid";
import { CompleteView } from "./CompleteView";
import { ScoutingPanel } from "./ScoutingPanel";
import { SetupForm } from "./SetupForm";
import { TeamBadge } from "./TeamBadge";
import { TeamPanel } from "./TeamPanel";
import { WinChance } from "./WinChance";
import { FORMAT_NAMES, SIDE_NAMES, SIDE_STYLES } from "./labels";

/** How long the practice opponent "thinks" before each move, so you can follow along. */
const OPPONENT_DELAY_MS = 650;

/** True once the saved drafts have been read from localStorage (always false on the server). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useDraftStore.persist.onFinishHydration(onChange),
    () => useDraftStore.persist.hasHydrated(),
    () => false,
  );
}

/** Desktop layout (three columns) from Tailwind's lg breakpoint; phones get tabs instead. */
const WIDE_QUERY = "(min-width: 1024px)";
function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(WIDE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

type Tab = "champions" | "advice" | "scouting";
const TABS: { id: Tab; label: string }[] = [
  { id: "champions", label: "Champions" },
  { id: "advice", label: "Advice" },
  { id: "scouting", label: "Scouting" },
];

export function DraftScreen({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const hydrated = useHydrated();
  const wide = useWide();
  const draft = useDraftStore((s) => s.drafts[id]);
  const report = useDraftStore((s) => s.reports[id]);
  const play = useDraftStore((s) => s.play);
  const undo = useDraftStore((s) => s.undo);
  const save = useDraftStore((s) => s.save);
  const saveReport = useDraftStore((s) => s.saveReport);
  const [picked, setSelected] = useState<{ turn: number; champion: string } | null>(null);
  const [tab, setTab] = useState<Tab>("champions");

  const turn = draft ? turnInfo(draft) : null;
  const usersTurn = !!draft && isUsersTurn(draft);
  // A selection belongs to the turn it was made on, so it clears itself when the turn moves on.
  const selected = picked && turn && picked.turn === turn.turnNumber && usersTurn ? picked.champion : null;
  const advice = useMemo(() => (draft && usersTurn ? recommend(draft) : null), [draft, usersTurn]);
  const projection = useMemo(() => (draft ? projectWinRate(draft.blue.picks, draft.red.picks) : null), [draft]);

  // The practice opponent plays its turns by itself.
  useEffect(() => {
    if (!draft || !turn || turn.side === draft.userSide) return;
    const timer = window.setTimeout(() => {
      const move = opponentMove(draft);
      if (move) play(draft.id, move, turn.side);
    }, OPPONENT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, turn, play]);

  const select = useCallback(
    (champion: string) => {
      if (!turn) return;
      setSelected((cur) => (cur?.champion === champion && cur.turn === turn.turnNumber ? null : { turn: turn.turnNumber, champion }));
    },
    [turn],
  );

  function confirm() {
    if (!draft || !turn || !selected) return;
    const error = play(draft.id, { type: turn.action === "ban" ? "BAN" : "PICK", champion: selected }, draft.userSide);
    if (error) toast.show(actionErrorMessage(error), { tone: "danger" });
    setSelected(null);
  }

  if (!hydrated) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-col gap-6 pt-2">
        <Card padding="none">
          <EmptyState
            icon={FolderOpen}
            tone="neutral"
            title="This draft isn't saved on this device"
            message="Drafts live in the browser that played them. Set one up below to start it here."
          />
        </Card>
        <SetupForm draftId={id} />
      </div>
    );
  }

  const team = getTeam(draft.opponentTeamId);
  const enemySide = otherSide(draft.userSide);
  const done = isComplete(draft);
  // Scrim only, and only once you've made a move of your own to take back.
  const canUndo = draft.format === "scrim" && usersTurn && draft[draft.userSide].bans.length + draft[draft.userSide].picks.length > 0;
  const status = done
    ? "Draft complete"
    : usersTurn
      ? turn?.action === "ban" ? "Your ban" : "Your pick"
      : turn?.action === "ban" ? "Opponent is banning" : "Opponent is picking";

  // Phones show the opponent's three-letter tag so the label fits on one line.
  const teamLabel = (s: "blue" | "red") =>
    s === draft.userSide ? `${s === "blue" ? "Blue" : "Red"} side` : `${s === "blue" ? "Blue" : "Red"} \u00b7 ${team ? (wide ? team.name : team.tag) : "Opponent"}`;
  const newDraft = () => router.push("/draft/new");
  const nextGame = () => {
    const next = nextFearlessGame(draft, nanoid(10));
    save(next);
    router.push(`/draft/${next.id}`);
  };

  return (
    <div className={cn("flex flex-col gap-4", !done && "pb-28")} data-testid="draft-screen" data-turn={turn?.turnNumber ?? 21}>
      {/* Status line */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-2">
            {FORMAT_NAMES[draft.format]}
            {draft.format === "fearless" && ` · game ${draft.game}`}
            {!done && ` · turn ${turn?.turnNumber} of 20`}
          </p>
          <h1 className={cn("font-display text-title font-semibold", done ? "text-ink" : usersTurn ? "text-accent-text" : "text-ink")} data-testid="status" aria-live="polite">
            {status}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <span className={SIDE_STYLES[draft.userSide].text}>You: {SIDE_NAMES[draft.userSide].toLowerCase()}</span>
          {team && <TeamBadge tag={team.tag} size="sm" />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_340px]">
        {/* Teams */}
        <div className="grid grid-cols-2 gap-3 lg:order-1 lg:grid-cols-1 lg:content-start">
          <TeamPanel draft={draft} side="blue" compact={!wide} label={teamLabel("blue")} />
          <TeamPanel draft={draft} side="red" compact={!wide} label={teamLabel("red")} />
        </div>

        {/* Side panel: win chance, then advice and scouting (tabs on phones) */}
        <div className={cn("flex flex-col gap-3 lg:order-3", done && "max-lg:order-3")}>
          {projection && <WinChance projection={projection} side={draft.userSide} compact={!wide && !done} />}
          {wide && done && <ScoutingPanel draft={draft} onSelect={select} canAct={false} />}
          {wide && !done && (
            <>
              <AdvicePanel draft={draft} advice={advice} selected={selected} onSelect={select} isUsersTurn={usersTurn} />
              <ScoutingPanel draft={draft} onSelect={select} canAct={usersTurn} />
            </>
          )}
        </div>

        {/* Centre: champions (or the finished draft) */}
        <div className={cn("min-w-0 lg:order-2", done && "max-lg:order-2")}>
          {done ? (
            <CompleteView
              draft={draft}
              report={report}
              onReport={(r) => saveReport(draft.id, r)}
              onNewDraft={newDraft}
              onNextGame={draft.format === "fearless" ? nextGame : undefined}
            />
          ) : (
            <>
              {!wide && (
                <div role="tablist" aria-label="Draft views" className="mb-3 grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "min-h-11 cursor-pointer rounded-sm text-[15px] font-bold",
                        tab === t.id ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2",
                      )}
                      data-testid={`tab-${t.id}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              <div className={cn(!wide && tab !== "champions" && "hidden")}>
                <ChampionGrid
                  draft={draft}
                  selected={selected}
                  onSelect={select}
                  suggestions={advice?.recommendations.map((r) => r.champion) ?? []}
                  canAct={usersTurn}
                />
              </div>
              {!wide && tab === "advice" && (
                <div className="flex flex-col gap-3">
                  <AdvicePanel draft={draft} advice={advice} selected={selected} onSelect={select} isUsersTurn={usersTurn} />
                  {projection && <WinChance projection={projection} side={draft.userSide} />}
                </div>
              )}
              {!wide && tab === "scouting" && <ScoutingPanel draft={draft} onSelect={select} canAct={usersTurn} />}
            </>
          )}
        </div>
      </div>

      {!done && (
        <ActionBar
          turn={turn}
          isUsersTurn={usersTurn}
          selected={selected}
          onConfirm={confirm}
          onUndo={() => undo(draft.id)}
          canUndo={canUndo}
        />
      )}
      <span className="sr-only">
        Opponent: {SIDE_NAMES[enemySide]}
        {team ? `, ${team.name}` : ""}.
      </span>
    </div>
  );
}
