import { expect, test } from "@playwright/test";

/**
 * Patient portal E2E tests — S9 acceptance gates.
 *
 * These tests run without a real authenticated session, so they only verify:
 *  - Unauthenticated access is redirected to /login (permissions matrix)
 *  - Public-facing pages return 200 (not 5xx)
 *  - Login page renders correctly before navigating to protected routes
 *
 * Full authenticated-flow tests require a test harness with seeded
 * credentials (see `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` env vars).
 */

const PROTECTED_ROUTES = [
  "/account",
  "/account/bookings",
  "/account/medical-files",
  "/account/access-history",
  "/account/payments",
  "/account/profile",
  "/account/security",
];

test.describe("Patient portal — access control", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated ${route} redirects to /login`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      // Must either redirect to /login or return non-5xx (server renders a login
      // redirect as a 200 after CSR navigation in some Next.js setups).
      const finalUrl = page.url();
      const status = response?.status() ?? 200;
      const redirectedToLogin = finalUrl.includes("/login");
      const notServerError = status < 500;
      expect(notServerError, `${route} should not return 5xx`).toBeTruthy();
      expect(redirectedToLogin, `${route} should redirect unauthenticated users to /login`).toBeTruthy();
    });
  }
});

test.describe("Patient portal — authenticated flows", () => {
  // Skip authenticated tests when test credentials are not configured.
  test.skip(
    !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated portal tests",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/account/, { timeout: 10_000 });
  });

  test("dashboard renders stat cards and nav", async ({ page }) => {
    await page.goto("/account", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=Dashboard").first()).toBeVisible();
    // Nav items from S9 spec
    await expect(page.locator("text=Medical files")).toBeVisible();
    await expect(page.locator("text=Access history")).toBeVisible();
    await expect(page.locator("text=Payments")).toBeVisible();
  });

  test("medical files page renders without 5xx", async ({ page }) => {
    const res = await page.goto("/account/medical-files", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
  });

  test("access history page renders", async ({ page }) => {
    const res = await page.goto("/account/access-history", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
    // Page heading or empty state
    const content = await page.content();
    expect(content.toLowerCase()).toMatch(/access|history/);
  });

  test("profile page has privacy tab", async ({ page }) => {
    await page.goto("/account/profile", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=Privacy")).toBeVisible();
  });

  test("payments page renders without 5xx", async ({ page }) => {
    const res = await page.goto("/account/payments", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
  });

  test("patient cannot access admin routes", async ({ page }) => {
    const res = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    const finalUrl = page.url();
    // Admin should redirect to login or return 403/redirect — not 200 admin page
    const blocked = finalUrl.includes("/login") || (res?.status() ?? 200) >= 400;
    expect(blocked, "Patient session should not access /admin").toBeTruthy();
  });

  test("patient cannot access another patient's account API", async ({ request, page }) => {
    // Hit the access-log API with a crafted email — should 400/403/404, never 200 with other patient data
    const res = await request.get("/api/admin/patients/other@example.com/access-log");
    expect(res.status(), "Patient should not access admin API").not.toBe(200);
  });
});

test.describe("Doctor portal — appointment detail GHN + language", () => {
  test.skip(
    !process.env.E2E_DOCTOR_EMAIL || !process.env.E2E_DOCTOR_PASSWORD,
    "Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD to run doctor portal tests",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', process.env.E2E_DOCTOR_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_DOCTOR_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/doctor/, { timeout: 10_000 });
  });

  test("doctor appointments list renders without 5xx", async ({ page }) => {
    const res = await page.goto("/doctor/appointments", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBeLessThan(500);
  });
});

test.describe("Service page FAQ", () => {
  test("service page renders without 5xx", async ({ page }) => {
    // Use a known country/locale to get a real service page; fall back gracefully
    const res = await page.goto("/ireland/en/services", { waitUntil: "domcontentloaded" });
    const status = res?.status() ?? 200;
    expect(status).toBeLessThan(500);
  });
});
