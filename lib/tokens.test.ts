// Measures every text/background pair the kit uses, straight from the CSS files that ship, so
// a token change that breaks 4.5:1 fails the gate instead of shipping (docs/brand/palettes.md).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast } from "@/lib/kl/contrast";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, "utf8");

/** `--name: #hex;` declarations inside the first block whose selector is exactly `selector`. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}

const tokens = read("styles/kl-tokens.css");
const theme = read("styles/theme.css");
const light = { ...block(tokens, ":root"), ...block(theme, ":root") };
const dark = { ...light, ...block(tokens, '[data-theme="dark"]'), ...block(theme, '[data-theme="dark"]') };

const TEXT_PAIRS: [string, string][] = [
  ["ink", "bg"], ["ink", "surface"], ["ink", "surface-2"],
  ["ink-2", "bg"], ["ink-2", "surface"], ["ink-2", "surface-2"], // secondary text, disabled buttons
  ["accent-text", "bg"], ["accent-text", "surface"], ["accent-text", "accent-soft"],
  ["on-accent", "accent-strong"], // primary button label
  ["ink", "button-secondary"], // secondary button label
  ["success-text", "bg"], ["success-text", "surface"], ["success-text", "success-soft"],
  ["warning-text", "bg"], ["warning-text", "surface"], ["warning-text", "warning-soft"],
  ["danger-text", "bg"], ["danger-text", "surface"], ["danger-text", "danger-soft"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("%s tokens", (_name, t) => {
  it.each(TEXT_PAIRS)("%s on %s reaches 4.5:1", (fg, bg) => {
    expect(t[fg], `--${fg} missing`).toBeDefined();
    expect(t[bg], `--${bg} missing`).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("danger button label (white) reaches 4.5:1 on its face", () => {
    expect(contrast("#FFFFFF", t["danger-strong"])).toBeGreaterThanOrEqual(4.5);
  });

  it("focus ring (accent-text) reaches 3:1 on bg and surface", () => {
    expect(contrast(t["accent-text"], t.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(t["accent-text"], t.surface)).toBeGreaterThanOrEqual(3);
  });
});

describe("OnArtPill", () => {
  it("keeps white text at 4.5:1 even over pure white art", () => {
    const blended = Math.round(255 * (1 - 0.55)); // 55% black over white
    const hex = `#${blended.toString(16).padStart(2, "0").repeat(3)}`;
    expect(contrast("#FFFFFF", hex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Synapse side colours", () => {
  it.each([
    ["blue-text", "bg"], ["blue-text", "surface"], ["blue-text", "blue-soft"], ["blue-text", "surface-2"],
    ["red-text", "bg"], ["red-text", "surface"], ["red-text", "red-soft"], ["red-text", "surface-2"],
  ])("%s on %s reaches 4.5:1 in light and dark", (fg, bg) => {
    expect(contrast(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark[fg], dark[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("side fills stand out from the page (3:1 for non-text)", () => {
    for (const t of [light, dark]) {
      expect(contrast(t["blue-side"], t.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(t["red-side"], t.bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it("white on the plum button face reaches 4.5:1", () => {
    expect(light["on-accent"].toLowerCase()).toBe("#ffffff");
    expect(contrast(light["on-accent"], light["accent-strong"])).toBeGreaterThanOrEqual(4.5);
  });

  it("dark-mode accent text (lavender) passes on every dark surface", () => {
    for (const bg of ["bg", "surface", "surface-2", "accent-soft"]) {
      expect(contrast(dark["accent-text"], dark[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
