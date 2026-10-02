// KL Web 1.0.3, from kitchenlabs-kit/web/kl-web/lib/contrast.test.ts. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
import { describe, expect, it } from "vitest";
import { bestLabel, contrast, parseHex } from "./contrast";

describe("contrast", () => {
  it("matches the reference values in docs/brand/palettes.md", () => {
    expect(contrast("#2A1C06", "#FFB020")).toBeCloseTo(9.06, 2);
    expect(contrast("#FFFFFF", "#FFB020")).toBeCloseTo(1.83, 2);
    expect(contrast("#936200", "#FFFFFF")).toBeCloseTo(5.27, 2);
  });

  it("is symmetric and spans 1 to 21", () => {
    expect(contrast("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrast("#fff", "#000")).toBeCloseTo(21, 5);
    expect(contrast("#5A6479", "#5A6479")).toBe(1);
  });

  it("rejects things that aren't hex colours", () => {
    expect(() => parseHex("rgb(0,0,0)")).toThrow();
    expect(parseHex("#0af")).toEqual([0, 170, 255]);
  });

  it("picks the readable label for a background", () => {
    expect(bestLabel("#FFB020")).toBe("#121829"); // saffron needs dark ink
    expect(bestLabel("#3B5BFF")).toBe("#FFFFFF"); // cobalt takes white
  });
});
