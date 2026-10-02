// KL Web 1.0.3, from kitchenlabs-kit/web/kl-web/lib/rate-limit.test.ts. Kit-owned: change it in the kit, then run scripts/sync-web-kit.sh.
import { describe, expect, it, vi } from "vitest";
import {
  clientIp,
  consumeDailyQuota,
  createRateLimiter,
  quotaResponse,
  rateLimitKey,
  rateLimitedResponse,
  waitText,
  type QuotaClient,
} from "./rate-limit";

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows `limit` calls per window, then refuses with a wait time", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: c.now });
    expect(limiter.check("ip:1")).toMatchObject({ ok: true, remaining: 2 });
    expect(limiter.check("ip:1")).toMatchObject({ ok: true, remaining: 1 });
    expect(limiter.check("ip:1")).toMatchObject({ ok: true, remaining: 0, retryAfterSeconds: 0 });
    c.advance(15_000);
    expect(limiter.check("ip:1")).toEqual({ ok: false, limit: 3, remaining: 0, retryAfterSeconds: 45 });
  });

  it("starts a fresh window once the old one ends", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: c.now });
    expect(limiter.check("k").ok).toBe(true);
    expect(limiter.check("k").ok).toBe(false);
    c.advance(10_000);
    expect(limiter.check("k").ok).toBe(true);
  });

  it("counts each key separately and can reset one", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: clock().now });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
    limiter.reset("a");
    expect(limiter.check("a").ok).toBe(true);
  });

  it("never tracks more than maxKeys, dropping expired then oldest windows", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 5, windowMs: 1_000, now: c.now, maxKeys: 3 });
    limiter.check("a");
    limiter.check("b");
    c.advance(2_000); // a and b expire
    limiter.check("c");
    limiter.check("d"); // evicts the expired a and b
    expect(limiter.size()).toBe(2);
    limiter.check("e");
    limiter.check("f"); // full with live keys: the oldest (c) goes
    expect(limiter.size()).toBe(3);
    expect(limiter.check("d")).toMatchObject({ remaining: 3 }); // d kept its count
  });
});

describe("request helpers", () => {
  it("reads the first forwarded IP", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    expect(clientIp(req)).toBe("203.0.113.7");
    expect(clientIp(new Request("https://x.test", { headers: { "x-real-ip": "198.51.100.2" } }))).toBe("198.51.100.2");
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });

  it("keys by user when signed in, else by IP", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "203.0.113.7" } });
    expect(rateLimitKey(req, "u-1")).toBe("user:u-1");
    expect(rateLimitKey(req, null)).toBe("ip:203.0.113.7");
  });

  it("says the wait in plain words", () => {
    expect(waitText(1)).toBe("1 second");
    expect(waitText(45)).toBe("45 seconds");
    expect(waitText(90)).toBe("2 minutes");
    expect(waitText(3600)).toBe("60 minutes");
  });

  it("answers 429 with Retry-After and a friendly message", async () => {
    const res = rateLimitedResponse({ ok: false, limit: 3, remaining: 0, retryAfterSeconds: 30 });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(await res.json()).toEqual({
      error: { code: "rate_limited", message: "That's a lot of tries in a row. Please wait 30 seconds and try again." },
    });
  });
});

describe("consumeDailyQuota", () => {
  const client = (result: { data: unknown; error: unknown }) => {
    const rpc = vi.fn(async () => result);
    return { db: { rpc } as QuotaClient, rpc };
  };

  it("counts one use and reports what's left", async () => {
    const { db, rpc } = client({ data: 4, error: null });
    expect(await consumeDailyQuota(db, "tips", 20)).toEqual({ ok: true, used: 4, remaining: 16 });
    expect(rpc).toHaveBeenCalledWith("consume_ai_quota", { p_kind: "tips" });
  });

  it("allows the last use and refuses the one after it", async () => {
    expect((await consumeDailyQuota(client({ data: 20, error: null }).db, "tips", 20)).ok).toBe(true);
    const over = await consumeDailyQuota(client({ data: 21, error: null }).db, "tips", 20, "That's today's 20 tips.");
    expect(over).toEqual({ ok: false, reason: "limit", message: "That's today's 20 tips." });
    const res = quotaResponse(over as Extract<typeof over, { ok: false }>);
    expect(res.status).toBe(429);
  });

  it("turns a database error into a friendly failure and logs the real one", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await consumeDailyQuota(client({ data: null, error: { message: "not authenticated" } }).db, "tips", 20);
    expect(result).toEqual({ ok: false, reason: "error", message: "We couldn't check your usage. Please try again." });
    expect(log).toHaveBeenCalled();
    expect(quotaResponse(result as Extract<typeof result, { ok: false }>).status).toBe(503);
    log.mockRestore();
  });
});
