import { expect, test } from "@playwright/test";

/**
 * Ranking-growth batch (2026-08-10). `ServicesGrid`/`ServiceCatalog` used to
 * slice to ONE page client-side (`useState`), so a service past position 5
 * was indexable/sitemapped/self-canonical but had NO crawlable link in the
 * initial server HTML at all — only reachable by clicking the pager arrows
 * after hydration. Fixed by rendering every page's items into the DOM and
 * toggling visibility with the `hidden` attribute instead of React state.
 *
 * HTTP-level check (`request.get`, no browser/JS execution) so this proves
 * the RAW server response, not the hydrated DOM — a crawler that never runs
 * client JS sees exactly this. Ireland's general-consultation catalogue had
 * 16 GENERAL services live at the time this test was written — comfortably
 * over the 5-item first page, so item #6+ existing here is a real assertion,
 * not a coincidence of low content.
 */
test.describe("Service catalogue crawlability", () => {
  test("general-consultation hub: service links exist in raw HTML beyond the first page", async ({
    request,
  }) => {
    const res = await request.get("/ireland/en/general-consultation");
    expect(res.status()).toBeLessThan(400);
    const html = await res.text();

    const hrefs = new Set(
      [...html.matchAll(/href="(\/ireland\/en\/services\/[a-z0-9-]+)"/g)].map((m) => m[1]),
    );

    // 5 is PAGE_SIZE_FEATURED — the old bug capped the DOM at exactly this
    // many. A real fix must exceed it, not just avoid an off-by-one.
    expect(
      hrefs.size,
      `expected more than 5 distinct service links in raw HTML, found: ${[...hrefs].join(", ")}`,
    ).toBeGreaterThan(5);
  });

  test("country home catalogue: service links exist in raw HTML beyond the first page", async ({
    request,
  }) => {
    const res = await request.get("/portugal/pt");
    expect(res.status()).toBeLessThan(400);
    const html = await res.text();

    const hrefs = new Set(
      [...html.matchAll(/href="(\/portugal\/pt\/services\/[a-z0-9-]+)"/g)].map((m) => m[1]),
    );

    expect(
      hrefs.size,
      `expected more than 5 distinct service links in raw HTML, found: ${[...hrefs].join(", ")}`,
    ).toBeGreaterThan(5);
  });
});
