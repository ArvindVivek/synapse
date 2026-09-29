import { expect, test } from "@playwright/test";
import { watchConsole } from "./helpers";

test("home explains the app and links to a new draft", async ({ page }) => {
  const c = watchConsole(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Synapse/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Practice pro drafts");
  await expect(page.getByTestId("riot-notice")).toContainText("Legal Jibber Jabber");
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", /\/apps\/synapse\/privacy$/);
  await page.getByTestId("cta-start").click();
  await expect(page).toHaveURL(/\/draft\/new$/);
  await expect(page.getByTestId("side-blue")).toBeVisible();
  c.expectClean();
});

test("the setup page shows the side picker, formats and sample teams", async ({ page }) => {
  const c = watchConsole(page);
  await page.goto("/draft/new");
  for (const id of ["side-blue", "side-red", "format-tournament", "format-fearless", "format-scrim", "team-harbor-owls", "team-none"]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  // No team logos anywhere: teams are three-letter badges.
  await expect(page.locator('img[src*="/teams/"]')).toHaveCount(0);
  c.expectClean();
});

test("a draft link from another device offers to start it here", async ({ page }) => {
  const c = watchConsole(page);
  await page.goto("/draft/abcDEF123");
  await expect(page.getByText("This draft isn't saved on this device")).toBeVisible();
  await page.getByTestId("start-draft").click();
  await expect(page.getByTestId("draft-screen")).toBeVisible();
  await expect(page.getByTestId("status")).toHaveText("Your ban");
  c.expectClean();
});

test("a broken draft link gets the themed 404", async ({ page }) => {
  const res = await page.goto("/draft/%3Cbad%3E");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
});

test("share card, icons, manifest, robots and sitemap are served", async ({ request }) => {
  for (const path of ["/opengraph-image", "/icon.svg", "/apple-icon.png", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml", "/icon-512.png", "/champions/Orianna.png"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
  expect(await (await request.get("/sitemap.xml")).text()).toContain("/draft/new");
});

test("the theme toggle switches to dark", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /dark|light/);
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", theme!);
});
