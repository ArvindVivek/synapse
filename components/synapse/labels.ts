import type { DraftFormat, Role, Side } from "@/lib/draft/types";

export const ROLE_NAMES: Record<Role, string> = { top: "Top", jungle: "Jungle", mid: "Mid", adc: "Bot", support: "Support" };

/** Three-letter lane names for tight spaces (phone team strips). */
export const ROLE_SHORT: Record<Role, string> = { top: "Top", jungle: "Jg", mid: "Mid", adc: "Bot", support: "Sup" };

export const SIDE_NAMES: Record<Side, string> = { blue: "Blue side", red: "Red side" };

export const FORMATS: { value: DraftFormat; label: string; line: string }[] = [
  { value: "tournament", label: "Tournament", line: "The standard pro draft: 10 bans, 10 picks." },
  { value: "fearless", label: "Fearless", line: "A series: champions picked in one game are locked for the next." },
  { value: "scrim", label: "Scrim", line: "Practice mode: you can take back your last move." },
];

export const FORMAT_NAMES: Record<DraftFormat, string> = { tournament: "Tournament", fearless: "Fearless", scrim: "Scrim" };

/** Side colour classes: text passes 4.5:1 on its tint and on the page (lib/tokens.test.ts). */
export const SIDE_STYLES: Record<Side, { text: string; soft: string; ring: string; fill: string }> = {
  blue: { text: "text-blue-text", soft: "bg-blue-soft", ring: "ring-blue-side", fill: "bg-blue-side" },
  red: { text: "text-red-text", soft: "bg-red-soft", ring: "ring-red-side", fill: "bg-red-side" },
};

/** "+2.5" / "-1" / "0": points of win chance from a 0-1 fraction. */
export function points(v: number): string {
  const p = Math.round(v * 1000) / 10;
  if (p === 0) return "0";
  return `${p > 0 ? "+" : "−"}${Math.abs(p)}`;
}
