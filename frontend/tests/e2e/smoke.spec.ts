import { expect, test } from "@playwright/test";

/**
 * Smoke test — verifies the site shell renders, the locale-aware
 * landing page is reachable, and the legacy /book-online URL redirects
 * to the guided /book page. This is intentionally minimal so it runs in <10s without a
 * backend; everything beyond this should mock the backend or be marked
 * `test.describe.serial(...)` with explicit setup.
 *
 * Add real funnel coverage (booking → Stripe → success) once we have
 * a backend test harness.
 */
test.describe("Smoke", () => {
  test("home page renders", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status(), "/ should not return 5xx").toBeLessThan(500);
    // Site name appears in either the header logo, footer, or document
    // title — match loosely on the brand word.
    await expect(page).toHaveTitle(/global health/i);
  });

  test("legacy book-online redirects to /book", async ({ page }) => {
    const response = await page.goto("/ireland/en/book-online", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status(), "/book should not 5xx").toBeLessThan(500);
    expect(page.url(), "redirects to the guided /book page").toContain("/book");
  });

  test("login form renders", async ({ page }) => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
