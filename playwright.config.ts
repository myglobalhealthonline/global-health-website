import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the frontend funnel smoke tests.
 *
 * Run locally:
 *   pnpm e2e
 *
 * The config assumes the frontend dev server is reachable at
 * `E2E_BASE_URL` (default http://localhost:3000). The `webServer` block
 * auto-starts `next dev` so the suite is hermetic in CI; locally you
 * can also start `pnpm dev:frontend` yourself and Playwright will
 * reuse it.
 *
 * Tests live under `frontend/tests/e2e/*.spec.ts`.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./frontend/tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        // CI runs against a production build — dev mode skips the standalone
        // output + prod caching behavior, so a prod-only regression could
        // pass in CI while actually broken. Locally, keep `next dev` for
        // fast iteration (and Playwright reuses an already-running one).
        command: process.env.CI
          ? "pnpm --filter frontend build && pnpm --filter frontend start"
          : "pnpm --filter frontend dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 180_000 : 120_000,
      },
});
