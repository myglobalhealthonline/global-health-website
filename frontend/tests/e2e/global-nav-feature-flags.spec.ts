import { expect, test } from "@playwright/test";

/**
 * Ranking-audit follow-up (2026-08-10, from a Screaming Frog export): the
 * cart page linked to `/ireland/en/repeat-prescription-request`, which 404s
 * — `online-prescriptions` is off in every market (Ads compliance, see
 * next.config.ts). Root cause: SiteHeader/SiteFooter/MobileNav all read
 * `activeFeatures` as `undefined` on a global page with no active country
 * (no URL country segment, no gh-last-country cookie — true of every
 * crawler's first hit), and their `enabled()`/`isFeatureEnabled()` helpers
 * treat `undefined` as "assume on." Correct for a flag that varies by
 * market; wrong for one that's off everywhere. Fixed by unioning every
 * market's enabled-feature list when there's no active country, so a flag
 * only fails open if at least one market actually has it on.
 *
 * HTTP-level (`request.get`, no JS) so this proves the raw server response.
 */
test.describe("Global-page nav feature-flag gating", () => {
  for (const path of ["/cart", "/about"]) {
    test(`${path}: no dead link to the site-wide-disabled prescriptions route`, async ({
      request,
    }) => {
      const res = await request.get(path);
      expect(res.status()).toBeLessThan(400);
      const html = await res.text();
      expect(html).not.toContain("repeat-prescription-request");
    });

    test(`${path}: a market-varying flag (GP consultations) still renders`, async ({
      request,
    }) => {
      // Positive control — proves the fix hides a genuinely-everywhere-off
      // flag without collapsing every nav link into nothing.
      const res = await request.get(path);
      const html = await res.text();
      expect(html).toContain("gp-consultation-online");
    });
  }
});
