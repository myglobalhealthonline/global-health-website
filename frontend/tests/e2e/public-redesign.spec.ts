import { expect, test } from "@playwright/test";

/**
 * Verification suite for the public-website upgrade (phases 1–2).
 *
 * Targets backend-FREE surfaces only — the global static pages (about,
 * contact, faq), the country gate, and config-level redirects — so the
 * suite stays hermetic without a running Fastify/Postgres backend.
 * Country-scoped, data-driven flows (doctors/services/booking) need the
 * backend and are covered by a separate harness.
 *
 * Each assertion maps to a concrete change shipped in the upgrade.
 */
test.describe("Public redesign", () => {
  // §2 — site-wide medical disclaimer renders on every chromed page.
  test("site-wide emergency disclaimer is present", async ({ page }) => {
    const res = await page.goto("/about", { waitUntil: "domcontentloaded" });
    expect(res?.status(), "/about should not 5xx").toBeLessThan(400);
    await expect(page.getByText(/call 112/i).first()).toBeVisible();
  });

  // Imagery — inner-page heroes now carry a real photo (PageHero image slot).
  test("about page renders a hero image", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main img").first()).toBeVisible();
  });

  // ContactForm re-skin — inputs now use the design-token class, not raw
  // slate/emerald utilities. Scope by label so the footer newsletter email
  // field doesn't collide.
  test("contact form uses design-token inputs", async ({ page }) => {
    const res = await page.goto("/contact", { waitUntil: "domcontentloaded" });
    expect(res?.status(), "/contact should not 5xx").toBeLessThan(400);
    const email = page.getByLabel("Email address");
    await expect(email).toBeVisible();
    await expect(email).toHaveClass(/gh-input/);
    await expect(page.getByText(/call 112/i).first()).toBeVisible();
  });

  // §13 — FAQ rewritten; the stale Wix "Wellness plans" / "telemedicine
  // devices" copy must be gone.
  test("faq no longer advertises non-existent products", async ({ page }) => {
    const res = await page.goto("/faq", { waitUntil: "domcontentloaded" });
    expect(res?.status(), "/faq should not 5xx").toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Wellness plans/i);
    await expect(page.locator("body")).not.toContainText(/telemedicine devices/i);
  });

  // Header exposes a primary "Book" action (one-click booking entry).
  test("header surfaces a Book call-to-action", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("banner").getByRole("link", { name: /book/i }).first(),
    ).toBeVisible();
  });
});
