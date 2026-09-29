import { expect, test } from "@playwright/test";

// API behaviour doesn't depend on the screen size: run it once.
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "API checks run on desktop only"));

const FULL = {
  userSide: "blue",
  blue: { bans: ["Azir", "Viego", "Rell", "Yuumi", "Zeri"], picks: ["Gnar", "Sejuani", "Orianna", "Jinx", "Lulu"] },
  red: { bans: ["Kalista", "Ahri", "Corki", "Vi", "Braum"], picks: ["Aatrox", "Lee Sin", "Syndra", "Kai'Sa", "Nautilus"] },
};

test("GET /api/teams lists the eight sample teams", async ({ request }) => {
  const res = await request.get("/api/teams");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.teams).toHaveLength(8);
  expect(body.teams[0].players).toHaveLength(5);
  expect(body.meta.sample).toBe(true);
});

test("GET /api/analytics/players/:id returns a pool, or 404", async ({ request }) => {
  const ok = await (await request.get("/api/analytics/players/ironpeak-mid")).json();
  expect(ok.playerName).toBe("Cinder");
  expect(ok.championPool.length).toBeGreaterThanOrEqual(5);
  expect(ok.championPool[0]).toMatchObject({ champion: expect.any(String), gamesPlayed: expect.any(Number), comfortLevel: expect.any(String) });
  const byName = await request.get("/api/analytics/players/cinder");
  expect(byName.status()).toBe(200);
  expect((await request.get("/api/analytics/players/Faker")).status()).toBe(404);
});

test("POST /api/draft and GET /api/draft/:id", async ({ request }) => {
  const created = await request.post("/api/draft", { data: { userSide: "red", opponentTeamId: "lowtide" } });
  expect(created.status()).toBe(201);
  const d = await created.json();
  expect(d).toMatchObject({ userSide: "red", currentTurn: 1, phase: "ban1", nextMove: { side: "blue", action: "ban" }, storedIn: "browser" });
  expect((await request.post("/api/draft", { data: { userSide: "green" } })).status()).toBe(400);
  const got = await (await request.get(`/api/draft/${d.id}?userSide=red`)).json();
  expect(got).toMatchObject({ id: d.id, userSide: "red", currentTurn: 1 });
});

test("POST /api/draft/:id/action plays legal moves and refuses illegal ones", async ({ request }) => {
  const ok = await request.post("/api/draft/test1234/action", { data: { userSide: "blue", type: "BAN", champion: "Azir" } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).state).toMatchObject({ currentTurn: 2, blue: { bans: ["Azir"] } });
  const taken = await request.post("/api/draft/test1234/action", {
    data: { userSide: "blue", blue: { bans: ["Azir"] }, type: "BAN", champion: "Azir" },
  });
  expect(taken.status()).toBe(400);
  expect((await taken.json()).error.code).toBe("CHAMPION_NOT_AVAILABLE");
  const wrong = await request.post("/api/draft/test1234/action", { data: { type: "PICK", champion: "Azir" } });
  expect((await wrong.json()).error.code).toBe("WRONG_PHASE");
  const outOfOrder = await request.post("/api/draft/test1234/action", { data: { blue: { picks: ["Jinx"] }, type: "BAN", champion: "Azir" } });
  expect((await outOfOrder.json()).error.code).toBe("out_of_order");
});

test("recommendations, win rate and predictions answer from the fixtures", async ({ request }) => {
  const recs = await (await request.post("/api/draft/test1234/recommendations", { data: { userSide: "blue", opponentTeamId: "ironpeak" } })).json();
  expect(recs.recommendations).toHaveLength(5);
  expect(recs.meta).toMatchObject({ action: "ban", teamAware: true });
  const recsGet = await (await request.get("/api/draft/test1234/recommendations?userSide=red")).json();
  expect(recsGet.recommendations).toHaveLength(5);

  const a = await (await request.get("/api/draft/test1234/winrate?bluePicks=Orianna,Sejuani&redPicks=Aatrox")).json();
  const b = await (await request.get("/api/draft/test1234/winrate?bluePicks=Sejuani,Orianna&redPicks=Aatrox&userSide=red")).json();
  expect(b.projection).toEqual(a.projection); // order no longer matters
  expect(b.user.winRate).toBeCloseTo(1 - a.projection.blueWinRate, 6);
  expect((await request.get("/api/draft/test1234/winrate?bluePicks=Clippy")).status()).toBe(400);

  const p = await (await request.get("/api/draft/test1234/predictions?playerId=ironpeak-adc&blueBans=Jinx")).json();
  expect(p.player).toMatchObject({ name: "Talon", role: "adc" });
  expect(p.predictions.map((x: { champion: string }) => x.champion)).not.toContain("Jinx");
  const total = p.predictions.reduce((s: number, x: { probability: number }) => s + x.probability, 0);
  expect(total).toBeLessThanOrEqual(1.0001);
  expect((await request.get("/api/draft/test1234/predictions?playerId=nobody")).status()).toBe(404);
});

test("POST /api/draft/:id/report needs a finished draft and always returns a report", async ({ request }) => {
  const early = await request.post("/api/draft/test1234/report", { data: { userSide: "blue", blue: { bans: ["Azir"] } } });
  expect(early.status()).toBe(400);
  expect((await early.json()).error.code).toBe("not_finished");
  const res = await request.post("/api/draft/test1234/report", { data: FULL });
  expect(res.status()).toBe(200);
  const body = await res.json();
  // The test server has no OpenAI key, so this is the code-written report.
  expect(body.report.source).toBe("fallback");
  expect(body.report.summary.grade).toMatch(/^[SABCD]$/);
  expect(body.report.matchupInsights.lanes).toHaveLength(5);
});
