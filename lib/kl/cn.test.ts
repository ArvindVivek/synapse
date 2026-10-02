// KL Web 1.0.3, from kitchenlabs-kit/web/kl-web/lib/cn.test.ts. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins classes and drops falsy ones", () => {
    expect(cn("a", false, null, undefined, "b", { c: true, d: false })).toBe("a b c");
  });

  it("lets a later Tailwind class win over an earlier one", () => {
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
    expect(cn("bg-surface", "bg-accent-soft")).toBe("bg-accent-soft");
  });

  it("keeps a KL type size and a text colour together", () => {
    // Without the extended config tailwind-merge sees two colours and drops text-title.
    expect(cn("text-title", "text-ink")).toBe("text-title text-ink");
    expect(cn("text-number text-ink-2", "text-accent-text")).toBe("text-number text-accent-text");
  });

  it("replaces one KL type size with another", () => {
    expect(cn("text-title3", "text-title2")).toBe("text-title2");
    expect(cn("text-hero", "text-lg")).toBe("text-lg");
  });
});
