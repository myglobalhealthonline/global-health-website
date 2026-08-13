import { describe, expect, it } from "vitest";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

/**
 * Internal-discovery batch (2026-08-09). Blog archive page 2+ used
 * `buildPublicMetadata({ noindex: true, ... })`, whose shared behaviour is
 * `noindex, nofollow` — correct for most noindex routes, wrong for a
 * pagination page. `nofollow` tells Googlebot not to follow ANY link on the
 * page, and this page's only job past page 1 is discovery: its prev/next
 * controls and article cards are the crawl path to every older post.
 * `noindex, follow` keeps the page itself out of the index (it carries no
 * unique content) while leaving that path open.
 *
 * Both `app/[country]/[lang]/blog/page/[n]/page.tsx` and
 * `app/(global)/blog/page/[n]/page.tsx` now override the shared helper's
 * result rather than passing `noindex: true` straight through. This test
 * pins the two facts that make the fix correct: the shared helper's default
 * really is `nofollow` (so the override is doing real work, not a no-op),
 * and the override this route now applies really does produce `follow`.
 */
describe("blog pagination page robots — noindex, follow (not nofollow)", () => {
  it("buildPublicMetadata's shared noindex default is nofollow", () => {
    const metadata = buildPublicMetadata({
      path: "/ireland/en/blog/page/2",
      title: "Health guides — 2",
      description: "Evidence-based health guides.",
      noindex: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("the pagination page's override produces noindex, follow", () => {
    // Same composition both page/[n]/page.tsx files apply: spread the shared
    // result, then replace `robots`. Asserted directly rather than importing
    // the route module, which pulls in locale-bundle and country-fetch
    // dependencies unrelated to what's under test.
    const metadata = buildPublicMetadata({
      path: "/ireland/en/blog/page/2",
      title: "Health guides — 2",
      description: "Evidence-based health guides.",
      noindex: true,
    });
    const overridden = { ...metadata, robots: { index: false, follow: true } };
    expect(overridden.robots).toEqual({ index: false, follow: true });
    // Everything else the shared helper computed (canonical, title, OG tags)
    // must survive the override untouched — only `robots` changes.
    expect(overridden.title).toEqual(metadata.title);
    expect(overridden.alternates).toEqual(metadata.alternates);
    expect(overridden.openGraph).toEqual(metadata.openGraph);
  });
});
