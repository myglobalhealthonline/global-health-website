import { expect, test } from "@playwright/test";
import { storageStatePath } from "./fixtures/storage-state.js";

/**
 * Security-audit phase 5 (docs/audits/security/audit-authz-matrix-2026-08-02.md):
 * cross-portal boundary checks — a session authenticated for one portal
 * must never render another portal's pages. Builds on the existing
 * unauthenticated-redirect pattern in patient-portal.spec.ts (line ~91: an
 * admin route must redirect to /login or return >= 400), extended to
 * authenticated-but-wrong-role sessions using the storageState fixtures
 * auth.setup.ts produces.
 *
 * Skipped entirely if a role's E2E_* credentials aren't configured — same
 * convention as the rest of this suite's authenticated tests.
 */

function blockedOrRedirected(status: number | undefined, finalUrl: string): boolean {
  const notServerError = (status ?? 200) < 500;
  const redirectedAway = finalUrl.includes("/login") || finalUrl.includes("/unauthorized");
  const explicitlyDenied = (status ?? 200) >= 400;
  return notServerError && (redirectedAway || explicitlyDenied);
}

test.describe("Patient session cannot reach other portals", () => {
  test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD");
  test.use({ storageState: storageStatePath("patient") });

  // `/admin/memberships` is listed explicitly rather than left to the
  // `/admin` check: membership routes are auto-loaded, so a new one is live
  // the moment its file lands, and member PII plus what people pay both sit
  // behind this section (§14).
  for (const route of ["/admin", "/doctor", "/corporate", "/admin/memberships"]) {
    test(`patient session hitting ${route} is blocked or redirected`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(blockedOrRedirected(response?.status(), page.url()), `${route} must not render for a patient session`).toBeTruthy();
    });
  }

  // A member may only read their OWN enrollment (§16.3). The id here belongs
  // to nobody, so anything other than a 404/403 — in particular a 200 with
  // somebody's card on it — is the failure this guards.
  test("patient cannot read another member's enrollment", async ({ page }) => {
    const response = await page.request.get("/api/me/memberships/enr-e2e-not-mine");
    expect(response.status(), "a foreign enrollment id must not resolve").toBeGreaterThanOrEqual(400);
  });

  // The cart-level benefit choice decides which pricing engine runs (§6.4), so
  // it must reject a membership the session does not hold rather than quietly
  // recording it and surprising the patient at checkout.
  test("patient cannot attach a membership they do not hold", async ({ page }) => {
    const response = await page.request.put("/api/me/cart/benefit", {
      data: { source: "MEMBERSHIP", refId: "enr-e2e-not-mine" },
    });
    expect(response.status(), "a foreign enrollment must not be attachable").toBeGreaterThanOrEqual(400);
  });
});

test.describe("Doctor session cannot reach admin/corporate portals", () => {
  test.skip(!process.env.E2E_DOCTOR_EMAIL || !process.env.E2E_DOCTOR_PASSWORD, "Set E2E_DOCTOR_EMAIL/E2E_DOCTOR_PASSWORD");
  test.use({ storageState: storageStatePath("doctor") });

  for (const route of ["/admin", "/corporate"]) {
    test(`doctor session hitting ${route} is blocked or redirected`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(blockedOrRedirected(response?.status(), page.url()), `${route} must not render for a doctor session`).toBeTruthy();
    });
  }
});

test.describe("LOCAL_ADMIN session cannot escalate to super-admin-only settings", () => {
  test.skip(
    !process.env.E2E_LOCAL_ADMIN_EMAIL || !process.env.E2E_LOCAL_ADMIN_PASSWORD,
    "Set E2E_LOCAL_ADMIN_EMAIL/E2E_LOCAL_ADMIN_PASSWORD",
  );
  test.use({ storageState: storageStatePath("local-admin") });

  // S-003 (SECURITY_AUDIT2): LOCAL_ADMIN must not reach global/super-admin
  // surfaces such as country-wide settings or user-role management.
  for (const route of ["/admin/settings", "/admin/users"]) {
    test(`local-admin session hitting ${route} is blocked or redirected`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(blockedOrRedirected(response?.status(), page.url()), `${route} must not render for a LOCAL_ADMIN session`).toBeTruthy();
    });
  }
});

test.describe("Corporate-admin session cannot reach clinical portals", () => {
  test.skip(
    !process.env.E2E_CORPORATE_ADMIN_EMAIL || !process.env.E2E_CORPORATE_ADMIN_PASSWORD,
    "Set E2E_CORPORATE_ADMIN_EMAIL/E2E_CORPORATE_ADMIN_PASSWORD",
  );
  test.use({ storageState: storageStatePath("corporate-admin") });

  for (const route of ["/admin", "/doctor", "/account"]) {
    test(`corporate-admin session hitting ${route} is blocked or redirected`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(blockedOrRedirected(response?.status(), page.url()), `${route} must not render for a corporate-admin session`).toBeTruthy();
    });
  }
});
