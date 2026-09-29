import { expect, test } from "@playwright/test";

// OPT-IN, SPENDS MONEY: one real OpenAI call. Skipped unless E2E_LIVE_AI=1 (owner rule: no real
// AI calls until the owner says so). Run it once, against the deployed site:
//   E2E_LIVE_AI=1 E2E_BASE_URL=https://synapse-henna-eight.vercel.app npx playwright test e2e/ai-live.spec.ts --project=desktop
// or locally (the server then keeps OPENAI_API_KEY from .env.local):
//   npm run build && E2E_LIVE_AI=1 npx playwright test e2e/ai-live.spec.ts --project=desktop
test.skip(process.env.E2E_LIVE_AI !== "1", "live AI check is opt-in (E2E_LIVE_AI=1)");
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "one call is enough"));

test("the coach's report is written by the AI when credits are available", async ({ request }) => {
  // A draft unlikely to be in the server's report cache, so this really reaches the model.
  const res = await request.post("/api/draft/liveai01/report", {
    data: {
      userSide: "red",
      blue: { bans: ["Azir", "Viego", "Rell", "Yuumi", "Zeri"], picks: ["Jayce", "Nidalee", "Zoe", "Ezreal", "Karma"] },
      red: { bans: ["Kalista", "Ahri", "Corki", "Vi", "Braum"], picks: ["K'Sante", "Elise", "Sylas", "Xayah", "Rakan"] },
    },
    timeout: 45_000,
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.notice, "notice 'ai_unavailable' means OpenAI refused (credits or key): check the runtime log").toBeNull();
  expect(body.report.source).toBe("ai");
  expect(body.report.strategicAnalysis.teamComp.length).toBeGreaterThan(10);
  expect(body.report.matchupInsights.lanes).toHaveLength(5);
});
