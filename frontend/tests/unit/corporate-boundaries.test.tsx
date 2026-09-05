import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * FE-2: the corporate portal was the one signed-in route group with no
 * `loading.tsx` and no `error.tsx`. A slow employees query showed a blank
 * frame with no announcement, and any thrown error escaped to the nearest
 * ancestor boundary — which for `(portal)/(corporate)` is the root one, so a
 * corporate admin lost the portal chrome and got a full-page failure with no
 * way back other than the browser's own reload.
 *
 * One pair of boundaries at the route-group root covers all four corporate
 * pages (dashboard, employees, employees/[id], requests, settings). Both are
 * asserted here for the properties that actually matter to a user: the
 * loading frame announces itself, and the error frame hands back a real
 * control rather than a dead-end message.
 */

vi.mock("@/lib/i18n/get-portal-locale", () => ({
  getPortalLocale: async () => "en" as const,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import CorporateLoading from "@/app/(portal)/(corporate)/corporate/loading";
import CorporateError from "@/app/(portal)/(corporate)/corporate/error";

describe("corporate loading boundary", () => {
  it("announces itself to assistive tech instead of rendering silent shimmer", async () => {
    const html = renderToStaticMarkup(await CorporateLoading());

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    // A live region is announced by its CONTENTS, not by its accessible name,
    // and every skeleton inside is `aria-hidden` — so the announcement has to
    // be a real text node or nothing is spoken at all.
    expect(html).toContain('class="sr-only">Loading corporate portal<');
  });

  it("hides the decorative shimmer from the accessibility tree", async () => {
    const html = renderToStaticMarkup(await CorporateLoading());

    // The skeleton primitives are `aria-hidden`; without that the status
    // region reads out a wall of empty boxes.
    expect(html).toContain("aria-hidden");
  });
});

describe("corporate error boundary", () => {
  const error = Object.assign(new Error("employees query failed"), {
    digest: "test-digest",
  });

  it("offers a usable retry control", () => {
    const html = renderToStaticMarkup(
      <CorporateError error={error} reset={() => {}} />,
    );

    // A real <button>, reachable by keyboard, not a paragraph telling the
    // user to reload.
    expect(html).toMatch(/<button[^>]*>/);
    expect(html).not.toContain("disabled");
  });

  it("explains the failure without leaking the raw error text", () => {
    const html = renderToStaticMarkup(
      <CorporateError error={error} reset={() => {}} />,
    );

    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain("employees query failed");
    expect(html).not.toContain("test-digest");
  });
});
