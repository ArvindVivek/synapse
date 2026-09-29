import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Specs read the same env as the server (Overdraft's lesson: without this the test process
// sees empty values).
loadEnvConfig(process.cwd());

/** E2E runs against the production build (`npm run build` first). Own port: 3188. */
const PORT = process.env.E2E_PORT ?? "3188";
/** Set to a deployed URL to run specs against it (no local server). */
const BASE_URL = process.env.E2E_BASE_URL;
/**
 * Owner rule: no real OpenAI calls unless someone opts in with E2E_LIVE_AI=1. By default the
 * local server gets an empty key, so every report is code-written and costs nothing.
 */
const LIVE_AI = process.env.E2E_LIVE_AI === "1";

// Server in UTC, browser in Los Angeles: date handling must not depend on the two agreeing.
const browserTimezone = "America/Los_Angeles";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // One worker: this Mac is shared, and a Next server plus several browsers at once runs it
  // out of memory (kitchenlabs-kit docs/web/testing.md).
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: BASE_URL ?? `http://127.0.0.1:${PORT}`, trace: "retain-on-failure", timezoneId: browserTimezone },
  projects: [
    { name: "phone", use: { ...devices["iPhone 14"], browserName: "chromium", timezoneId: browserTimezone } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, timezoneId: browserTimezone } },
  ],
  webServer: BASE_URL ? undefined : {
    command: `npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Never spend on OpenAI by default: an empty key sends the report down the code-written path
    // (the AI path is unit-tested with a stubbed fetch in lib/ai/draft-report.test.ts).
    env: LIVE_AI ? { TZ: "UTC" } : { TZ: "UTC", OPENAI_API_KEY: "" },
  },
});
