"use client";

import { useState } from "react";
import { ArrowRight, NotebookPen, Plus, RotateCcw, Sparkles } from "lucide-react";
import { Badge, Button, Card, Icon } from "@/components/kl";
import type { Draft } from "@/lib/draft/types";
import { draftFacts, GRADE_LABELS, ROLE_LABELS, type Advantage, type DraftReport } from "@/lib/engine/report";
import { cn } from "@/lib/kl/cn";
import { ChampionIcon } from "./ChampionIcon";

const ADVANTAGE: Record<Advantage, { label: string; tone: "success" | "neutral" | "danger" }> = {
  favorable: { label: "Your edge", tone: "success" },
  even: { label: "Even", tone: "neutral" },
  unfavorable: { label: "Their edge", tone: "danger" },
};

export type ReportNotice = "ai_unavailable" | "rate_limited" | null;

const NOTICES: Record<Exclude<ReportNotice, null>, string> = {
  ai_unavailable: "The AI writer isn't available right now, so Synapse wrote this report from the draft numbers.",
  rate_limited: "You've asked for several reports in a row, so Synapse wrote this one from the draft numbers.",
};

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[15px] leading-snug text-ink">
          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-text" />
          {t}
        </li>
      ))}
    </ul>
  );
}

function ReportView({ report, notice }: { report: DraftReport; notice: ReportNotice }) {
  return (
    <section aria-label="Coach's report" className="flex flex-col gap-3" data-testid="report">
      <Card padding="md">
        <div className="flex items-center gap-2">
          <Icon icon={NotebookPen} size={20} className="text-accent-text" />
          <h2 className="font-display text-title2 font-semibold text-ink">Coach&apos;s report</h2>
        </div>
        <p className="mt-1 text-sm text-ink-2" data-testid="report-source">
          {report.source === "ai" ? "Written by AI from the numbers above." : notice ? NOTICES[notice] : "Written from the draft numbers above."}
        </p>
        <p className="mt-3 text-[17px] leading-relaxed text-ink">{report.strategicAnalysis.teamComp}</p>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        <Card padding="md">
          <h3 className="font-bold text-ink">Strengths</h3>
          <List items={report.summary.keyStrengths} />
        </Card>
        <Card padding="md">
          <h3 className="font-bold text-ink">How you win</h3>
          <List items={report.strategicAnalysis.winConditions} />
        </Card>
        <Card padding="md">
          <h3 className="font-bold text-ink">Power spikes</h3>
          <List items={report.strategicAnalysis.powerSpikes} />
        </Card>
        <Card padding="md">
          <h3 className="font-bold text-ink">Objectives</h3>
          <List items={report.matchupInsights.objectivePriorities} />
        </Card>
      </div>
      <Card padding="md">
        <h3 className="font-bold text-ink">Lane by lane</h3>
        <ul className="mt-2 flex flex-col gap-2.5">
          {report.matchupInsights.lanes.map((l) => (
            <li key={l.role} className="text-[15px] leading-snug text-ink">
              <span className="font-bold">{l.label}: </span>
              {l.tip}
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {(
          [
            ["Early game", report.recommendations.earlyGame],
            ["Mid game", report.recommendations.midGame],
            ["Late game", report.recommendations.lateGame],
          ] as const
        ).map(([title, items]) => (
          <Card key={title} padding="md">
            <h3 className="font-bold text-ink">{title}</h3>
            <List items={[...items]} />
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * The finished draft: grade, win chance and every lane (computed, free), then the coach's report
 * only when someone asks for it (the one AI call in Synapse).
 */
export function CompleteView({
  draft,
  report,
  onReport,
  onNewDraft,
  onNextGame,
}: {
  draft: Draft;
  report: DraftReport | undefined;
  onReport: (report: DraftReport) => void;
  onNewDraft: () => void;
  onNextGame?: () => void;
}) {
  const facts = draftFacts(draft);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<ReportNotice>(null);
  const [failed, setFailed] = useState(false);

  async function askForReport() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/draft/${encodeURIComponent(draft.id)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSide: draft.userSide,
          format: draft.format,
          opponentTeamId: draft.opponentTeamId,
          locked: draft.locked,
          blue: draft.blue,
          red: draft.red,
        }),
      });
      if (!res.ok) throw new Error(`report ${res.status}`);
      const data = (await res.json()) as { report: DraftReport; notice: ReportNotice };
      setNotice(data.notice);
      onReport(data.report);
    } catch (err) {
      console.error("[synapse] report request failed", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="complete">
      <Card padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="grid size-20 shrink-0 place-items-center rounded-lg bg-accent-strong font-display text-[44px] font-semibold text-on-accent"
          aria-label={`Grade ${facts.grade}`}
          data-testid="grade"
        >
          {facts.grade}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-title2 font-semibold text-ink">{GRADE_LABELS[facts.grade]}</h2>
          <p className="mt-0.5 text-ink-2">
            Draft complete. From the picks alone you have a <strong className="text-ink">{facts.winProbability}%</strong> chance to win.
            {draft.format === "fearless" && ` Game ${draft.game} of your fearless series.`}
          </p>
        </div>
      </Card>

      <Card padding="md">
        <h2 className="font-display text-title3 font-semibold text-ink">Lanes</h2>
        <ul className="mt-2 flex flex-col divide-y divide-line" data-testid="lanes">
          {facts.lanes.map((l) => (
            <li key={l.role} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5 max-sm:grid-cols-[minmax(0,1fr)_auto]">
              <span className="text-sm font-extrabold uppercase tracking-wide text-ink-2">{ROLE_LABELS[l.role]}</span>
              <span className="flex min-w-0 items-center gap-2 max-sm:col-span-2 max-sm:row-start-2">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {l.yours && <ChampionIcon champion={l.yours} size={32} />}
                  <span className="truncate font-bold text-ink">{l.yours}</span>
                </span>
                <span className="shrink-0 text-sm text-ink-2">vs</span>
                <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <span className="truncate text-right font-bold text-ink">{l.theirs}</span>
                  {l.theirs && <ChampionIcon champion={l.theirs} size={32} />}
                </span>
              </span>
              <Badge tone={ADVANTAGE[l.advantage].tone} className="justify-self-end max-sm:col-start-2 max-sm:row-start-1">
                {ADVANTAGE[l.advantage].label}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      {!report && (
        <Card padding="md" tone="accent" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-ink">Want the full coaching report?</h2>
            <p className="text-[15px] text-ink">Win conditions, power spikes and a plan for every lane, written from this draft.</p>
            {failed && (
              <p className="mt-1 text-[15px] font-bold text-danger-text" role="alert">
                We couldn&apos;t reach Synapse just now. Check your connection and try again.
              </p>
            )}
          </div>
          <Button icon={Sparkles} loading={loading} onClick={askForReport} className="shrink-0" data-testid="write-report">
            Write the coach&apos;s report
          </Button>
        </Card>
      )}

      {report && <ReportView report={report} notice={notice} />}

      <div className={cn("flex flex-col gap-3 sm:flex-row", onNextGame ? "sm:justify-between" : "sm:justify-end")}>
        {onNextGame && (
          <Button variant="secondary" icon={RotateCcw} iconRight={ArrowRight} onClick={onNextGame} data-testid="next-game">
            Play game {draft.game + 1} (locks {draft.locked.length + 10} champions)
          </Button>
        )}
        <Button variant={onNextGame ? "ghost" : "secondary"} icon={Plus} onClick={onNewDraft} data-testid="new-draft">
          Start a new draft
        </Button>
      </div>
    </div>
  );
}
