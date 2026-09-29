import { Ban, Lock, Undo2 } from "lucide-react";
import { Button } from "@/components/kl";
import type { DraftTurn } from "@/lib/draft/types";
import { cn } from "@/lib/kl/cn";
import { ChampionIcon } from "./ChampionIcon";

/**
 * Pinned to the bottom of the screen: the champion you've chosen and the button that locks it
 * in. Two steps on purpose (choose, then confirm), so a stray tap never bans a champion.
 */
export function ActionBar({
  turn,
  isUsersTurn,
  selected,
  onConfirm,
  onUndo,
  canUndo,
}: {
  turn: DraftTurn | null;
  isUsersTurn: boolean;
  selected: string | null;
  onConfirm: () => void;
  onUndo?: () => void;
  canUndo: boolean;
}) {
  if (!turn) return null;
  const ban = turn.action === "ban";
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-lift)] backdrop-blur" data-testid="action-bar">
      <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3" aria-live="polite">
          {isUsersTurn && selected ? (
            <>
              <ChampionIcon champion={selected} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{selected}</span>
                <span className="block text-sm text-ink-2">{ban ? "Ready to ban" : "Ready to lock in"}</span>
              </span>
            </>
          ) : isUsersTurn ? (
            <span className="text-[15px] font-bold text-ink">
              {ban ? "Choose a champion to ban" : "Choose your pick"}
              <span className="block text-sm font-normal text-ink-2">Tap a champion or a suggestion</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-[15px] font-bold text-ink-2">
              <span className="size-2.5 animate-pulse rounded-full bg-accent-text" aria-hidden="true" />
              Opponent is {ban ? "banning" : "picking"}&hellip;
            </span>
          )}
        </div>
        {canUndo && onUndo && (
          <Button variant="secondary" size="sm" icon={Undo2} onClick={onUndo} data-testid="undo">
            Undo
          </Button>
        )}
        <Button
          variant={ban ? "danger" : "primary"}
          size="md"
          icon={ban ? Ban : Lock}
          disabled={!isUsersTurn || !selected}
          onClick={onConfirm}
          className={cn("shrink-0", "min-w-32 sm:min-w-44")}
          data-testid="confirm"
        >
          {ban ? "Ban" : "Lock in"}
          <span className="hidden sm:inline">{selected && isUsersTurn ? ` ${selected}` : ""}</span>
        </Button>
      </div>
    </div>
  );
}
