import { expect, test } from "@playwright/test";
import { isPhone, playToEnd, turnOf, watchConsole } from "./helpers";

test("a full draft on red side against a scouted team, the report, and a reload", async ({ page }, info) => {
  const c = watchConsole(page);
  await page.goto("/draft/new");
  await page.getByTestId("side-red").click();
  await page.getByTestId("team-ironpeak").click();
  await page.getByTestId("start-draft").click();
  await expect(page).toHaveURL(/\/draft\/[\w-]+$/);

  // Blue bans first, so the practice opponent moves before us.
  await expect(page.getByTestId("status")).toHaveText("Your ban", { timeout: 10_000 });
  expect(await turnOf(page)).toBe(2);

  // Advice and scouting (phones reach them through tabs).
  if (isPhone(info)) await page.getByTestId("tab-advice").click();
  await expect(page.getByTestId("advice-1")).toBeVisible();
  await expect(page.getByTestId("advice")).toContainText(/signature pick|comfort pick|Strong right now/);
  if (isPhone(info)) await page.getByTestId("tab-scouting").click();
  await expect(page.getByTestId("scouting")).toContainText("Ironpeak");
  if (isPhone(info)) await page.getByTestId("tab-champions").click();

  // Search and the role filter narrow the grid.
  await page.getByTestId("champion-search").fill("ori");
  await expect(page.getByTestId("champion-grid").getByRole("button")).toHaveCount(1);
  await page.getByTestId("champion-search").fill("");

  await playToEnd(page);
  await expect(page.getByTestId("grade")).toHaveText(/^[SABCD]$/);
  await expect(page.getByTestId("lanes").locator("li")).toHaveCount(5);

  // The report is written only when asked (tests run without an OpenAI key: code-written path).
  await expect(page.getByTestId("report")).toHaveCount(0);
  await page.getByTestId("write-report").click();
  await expect(page.getByTestId("report")).toBeVisible();
  await expect(page.getByTestId("report-source")).toContainText("draft numbers");

  // Saved in this browser: a reload keeps the finished draft and its report.
  await page.reload();
  await expect(page.getByTestId("complete")).toBeVisible();
  await expect(page.getByTestId("report")).toBeVisible();
  c.expectClean();
});

test("scrim lets you take back a move", async ({ page }) => {
  const c = watchConsole(page);
  await page.goto("/draft/new");
  await page.getByTestId("format-scrim").click();
  await page.getByTestId("team-none").click();
  await page.getByTestId("start-draft").click();
  await expect(page.getByTestId("status")).toHaveText("Your ban");
  await page.getByRole("button", { name: /^Azir(,|$)/ }).click();
  await page.getByTestId("confirm").click();
  await expect.poll(() => turnOf(page)).toBe(3); // opponent answered
  await expect(page.getByTestId("status")).toHaveText("Your ban");
  await page.getByTestId("undo").click();
  await expect.poll(() => turnOf(page)).toBe(1);
  await expect(page.getByRole("button", { name: /^Azir(,|$)/ })).toBeEnabled();
  c.expectClean();
});

test("tournament drafts have no undo, and choosing needs a confirm", async ({ page }) => {
  const c = watchConsole(page);
  await page.goto("/draft/new");
  await page.getByTestId("start-draft").click();
  await expect(page.getByTestId("confirm")).toBeDisabled();
  await page.getByRole("button", { name: /^Jinx(,|$)/ }).click();
  await expect(page.getByTestId("action-bar")).toContainText("Ready to ban");
  await expect(page.getByTestId("undo")).toHaveCount(0);
  c.expectClean();
});

test("fearless locks every champion picked in game one", async ({ page }) => {
  const c = watchConsole(page);
  await page.goto("/draft/new");
  await page.getByTestId("format-fearless").click();
  await page.getByTestId("start-draft").click();
  await playToEnd(page);
  const picked = ((await page.getByTestId("team-blue").getAttribute("data-picks")) ?? "").split(",");
  expect(picked).toHaveLength(5);
  await page.getByTestId("next-game").click();
  await expect(page.getByText(/Fearless · game 2/)).toBeVisible();
  for (const champion of picked) await expect(page.getByRole("button", { name: `${champion}, locked` })).toBeDisabled();
  c.expectClean();
});
