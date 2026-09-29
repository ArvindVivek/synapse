// KL Web 1.0.1, from kitchenlabs-kit/web/kl-web/components/Providers.tsx. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
"use client";

import type { ComponentProps, ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "./Theme";
import { ToastProvider } from "./Toast";

/** Every motion animation follows the person's Reduce Motion setting. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Everything the kit needs, in one wrapper for app/layout.tsx:
 * theme (data-theme, no flash) → reduced motion → toasts.
 */
export function KLProviders({
  children,
  forcedTheme,
}: {
  children: ReactNode;
  /** "light" or "dark" for an app that has only one look (Overdraft, Cosmiq). */
  forcedTheme?: ComponentProps<typeof ThemeProvider>["forcedTheme"];
}) {
  return (
    <ThemeProvider forcedTheme={forcedTheme}>
      <MotionProvider>
        <ToastProvider>{children}</ToastProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
