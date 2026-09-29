"use client";

import { memo, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Chip, Icon } from "@/components/kl";
import type { Draft, Role } from "@/lib/draft/types";
import { ROLES } from "@/lib/draft/types";
import { CHAMPIONS, playsRole } from "@/lib/engine/champions";
import { cn } from "@/lib/kl/cn";
import { ChampionIcon } from "./ChampionIcon";
import { ROLE_NAMES } from "./labels";

type Status = "open" | "banned" | "picked" | "locked";

function statusMap(draft: Draft): Map<string, Status> {
  const m = new Map<string, Status>()
  for (const c of draft.locked) m.set(c, "locked")
  for (const c of [...draft.blue.bans, ...draft.red.bans]) m.set(c, "banned")
  for (const c of [...draft.blue.picks, ...draft.red.picks]) m.set(c, "picked")
  return m
}

const STATUS_WORDS: Record<Exclude<Status, "open">, string> = { banned: "Banned", picked: "Picked", locked: "Locked" };

const Tile = memo(function Tile({
  champion,
  status,
  rank,
  selected,
  canAct,
  onSelect,
}: {
  champion: string;
  status: Status;
  rank: number | undefined;
  selected: boolean;
  canAct: boolean;
  onSelect: (c: string) => void;
}) {
  const open = status === "open";
  const label = open
    ? `${champion}${rank ? `, suggestion ${rank}` : ""}${selected ? ", selected" : ""}`
    : `${champion}, ${STATUS_WORDS[status as Exclude<Status, "open">].toLowerCase()}`;
  return (
    <button
      type="button"
      onClick={() => onSelect(champion)}
      disabled={!open || !canAct}
      aria-pressed={open ? selected : undefined}
      aria-label={label}
      data-champion={champion}
      className={cn(
        "group relative flex flex-col items-center gap-1 rounded-sm p-1 text-center transition-transform duration-75",
        open && canAct && "cursor-pointer active:scale-95",
        !open && "cursor-not-allowed",
        open && !canAct && "cursor-default",
        selected && "bg-accent-soft ring-2 ring-accent-text",
      )}
    >
      <span className={cn("relative block rounded-xs", rank && !selected && "ring-2 ring-accent-text ring-offset-2 ring-offset-bg")}>
        <ChampionIcon champion={champion} size={60} muted={!open} className="size-14 sm:size-[60px]" />
        {rank && open && (
          <span className="absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-accent-strong text-xs font-extrabold text-on-accent shadow-[var(--shadow-card)]">
            {rank}
          </span>
        )}
      </span>
      <span className={cn("block w-full truncate text-[13px] font-bold leading-tight", open ? "text-ink" : "text-ink-2 line-through")}>
        {champion}
      </span>
      {!open && <span className="sr-only">{STATUS_WORDS[status as Exclude<Status, "open">]}</span>}
    </button>
  );
});

/** Every champion, with search and a role filter. Suggested champions carry their rank. */
export function ChampionGrid({
  draft,
  selected,
  onSelect,
  suggestions,
  canAct,
}: {
  draft: Draft;
  selected: string | null;
  onSelect: (champion: string) => void;
  suggestions: string[];
  canAct: boolean;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const statuses = useMemo(() => statusMap(draft), [draft]);
  const ranks = useMemo(() => new Map(suggestions.map((c, i) => [c, i + 1])), [suggestions]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAMPIONS.filter((c) => (!q || c.name.toLowerCase().includes(q)) && (!role || playsRole(c.name, role)))
      .map((c) => c.name)
      .sort((a, b) => {
        // Open champions first, then alphabetical.
        const oa = statuses.has(a) ? 1 : 0;
        const ob = statuses.has(b) ? 1 : 0;
        return oa - ob || a.localeCompare(b);
      });
  }, [query, role, statuses]);

  return (
    <section aria-label="Champions" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search champions</span>
          <Icon icon={Search} size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search champions"
            className="h-12 w-full rounded-sm bg-surface pl-10 pr-10 text-base text-ink shadow-[var(--shadow-card)] placeholder:text-ink-2"
            data-testid="champion-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-2 hover:text-ink"
            >
              <Icon icon={X} size={18} />
            </button>
          )}
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
          <Chip selected={role === null} onClick={() => setRole(null)}>All</Chip>
          {ROLES.map((r) => (
            <Chip key={r} selected={role === r} onClick={() => setRole(role === r ? null : r)}>
              {ROLE_NAMES[r]}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg bg-surface p-6 text-center text-ink-2 shadow-[var(--shadow-card)]">
          No champion matches &ldquo;{query}&rdquo;{role ? ` in ${ROLE_NAMES[role]}` : ""}.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-x-1 gap-y-2" data-testid="champion-grid">
          {shown.map((c) => (
            <Tile
              key={c}
              champion={c}
              status={statuses.get(c) ?? "open"}
              rank={ranks.get(c)}
              selected={selected === c}
              canAct={canAct}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      <p className="text-center text-sm text-ink-2">
        {shown.length} of {CHAMPIONS.length} champions
      </p>
    </section>
  );
}
