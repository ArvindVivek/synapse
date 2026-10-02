// KL Web 1.0.3, from kitchenlabs-kit/web/kl-web/lib/demo.test.ts. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
import { describe, expect, it, vi } from "vitest";
import { assertNotDemo, chooseDataLayer, daysAgo, daysFromNow, demoModeFrom, loadFixture } from "./demo";

describe("demo mode", () => {
  it("turns on only for 1 or true", () => {
    expect(demoModeFrom("1")).toBe(true);
    expect(demoModeFrom("true")).toBe(true);
    expect(demoModeFrom("0")).toBe(false);
    expect(demoModeFrom("")).toBe(false);
    expect(demoModeFrom(undefined)).toBe(false);
  });

  it("picks the data layer once", () => {
    const live = { name: "live" };
    const demo = { name: "demo" };
    expect(chooseDataLayer(live, demo, false)).toBe(live);
    expect(chooseDataLayer(live, demo, true)).toBe(demo);
  });

  it("loads a fresh copy of a fixture each time", async () => {
    const fixture = { default: { trips: [{ id: 1, name: "Market Morning" }] } };
    const first = await loadFixture(() => Promise.resolve(fixture));
    first.trips.push({ id: 2, name: "changed in memory" });
    const second = await loadFixture(() => fixture);
    expect(second.trips).toHaveLength(1);
    expect(fixture.default.trips).toHaveLength(1);
  });

  it("builds dates relative to now", () => {
    const now = new Date("2026-09-28T12:00:00Z");
    expect(daysAgo(3, now).toISOString()).toBe("2026-09-25T12:00:00.000Z");
    expect(daysFromNow(2, now).toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });

  it("refuses real actions in demo mode before any network call", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const placeOrder = (demo: boolean) => {
      assertNotDemo("Placing an order", demo);
      return fetch("https://example.invalid/v2/orders");
    };
    expect(() => placeOrder(true)).toThrow("Placing an order is turned off in the demo. Nothing was sent.");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(() => assertNotDemo("Sending", false)).not.toThrow();
    vi.unstubAllGlobals();
  });
});
