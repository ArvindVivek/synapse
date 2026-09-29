import { cn } from "@/lib/kl/cn";

/**
 * A team shown as its three letters on a neutral tile. Synapse never shows team or league
 * logos, and the sample teams are fictional anyway.
 */
export function TeamBadge({ tag, size = "md", className }: { tag: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-xs bg-surface-2 font-display font-semibold tracking-wide text-ink ring-1 ring-inset ring-line",
        size === "sm" ? "h-8 w-11 text-[13px]" : "h-11 w-14 text-base",
        className,
      )}
    >
      {tag}
    </span>
  );
}
