import Link from "next/link";
import type { ReactNode } from "react";
import { COPYRIGHT, ThemeToggle, privacyUrl, supportUrl } from "@/components/kl";
import { cn } from "@/lib/kl/cn";
import { RIOT_NOTICE, site } from "@/lib/site";

const WIDTHS = { wide: "max-w-5xl", full: "max-w-[1480px]" } as const;

/**
 * The frame for every page: KL Web's PageShell layout (header with icon, name and theme toggle;
 * studio footer with privacy and support), plus the Riot Games fan-project notice Synapse must
 * show in its footer. (PageShell has no footer slot yet: kit request in CLAUDE.md.)
 */
export function AppShell({
  children,
  width = "wide",
  actions,
  mainClassName,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  actions?: ReactNode;
  mainClassName?: string;
}) {
  const frame = cn("mx-auto w-full px-5", WIDTHS[width]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-ink focus:shadow-[var(--shadow-lift)]"
      >
        Skip to content
      </a>
      <header className="pt-[env(safe-area-inset-top)]">
        <div className={cn(frame, "flex h-16 items-center justify-between gap-3")}>
          <Link href="/" className="-ml-1 flex min-h-11 min-w-0 items-center gap-2.5 rounded-sm px-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- a 32px SVG needs no optimising */}
            <img src="/icon.svg" alt="" width={32} height={32} className="shrink-0 rounded-[9px]" />
            <span className="truncate font-display text-title3 font-semibold text-ink">{site.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className={cn(frame, "flex-1 pb-12 pt-2", mainClassName)}>
        {children}
      </main>

      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className={cn(frame, "border-t border-line pt-5 text-sm text-ink-2")}>
          <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
            <p>{COPYRIGHT}</p>
            <nav aria-label="About this app" className="flex items-center">
              <a href={privacyUrl(site.slug)} className="inline-flex min-h-11 items-center px-3 font-bold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                Privacy
              </a>
              <a href={supportUrl(site.slug)} className="inline-flex min-h-11 items-center px-3 font-bold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                Support
              </a>
            </nav>
          </div>
          <p className="mx-auto mt-3 max-w-3xl text-center text-[13px] leading-snug sm:text-left" data-testid="riot-notice">
            {RIOT_NOTICE} League of Legends and its champions are trademarks of Riot Games, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
