import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for visual regression on the Patient Landing hero
 * (PROJECT_PLAN Workstream A carry-over). The goal is a canary: if a
 * font-loading change, a tokens.css edit, or a Logo tweak shifts the
 * hero, this catches it before the PR merges.
 *
 * First run generates baselines under
 * tests/visual/__snapshots__/. Commit them.
 *
 * `npm run test:visual`         — run the tests against baselines
 * `npm run test:visual:update`  — regenerate baselines (only when you
 *                                  intend to change the visual)
 */
const PORT = 3001;

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./tests/visual/.playwright",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Dummy env so client.ts + auth load; data queries fall back
      // to empty via the `safe(...)` helpers on the home page.
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://nobody:nobody@localhost:5432/nobody",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret-not-for-prod",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? `http://localhost:${PORT}`,
    },
  },
  expect: {
    toHaveScreenshot: {
      // Small pixel-diff tolerance for anti-aliasing + font rendering
      // wobble across machines. Tighten to 0 if we pin a render target.
      maxDiffPixelRatio: 0.02,
    },
  },
});
