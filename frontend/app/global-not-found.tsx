import type { Metadata } from "next";
import { NotFoundPage } from "./_components/not-found-page";

/**
 * 404 for URLs that match no route at all (`experimental.globalNotFound`).
 * REQUIRED now that there is no `app/layout.tsx`: `/_not-found` would
 * otherwise have no root layout to render inside and the build fails.
 *
 * KNOWN GAP — it does NOT cover `notFound()` thrown by a route that DID
 * match (unknown country slug, unsupported locale, missing doctor/service
 * slug). Next builds that response from a loader tree rooted at the `app`
 * segment, which under multi-root layouts has no layout to supply
 * `<html>`/`<body>`, so it ignores both this file and any `not-found.tsx`
 * and falls back to its own built-in 404. Verified on 16.2.11 in dev and in
 * a production build, with `not-found.tsx` at the app root and at every
 * subtree root. The status code is still 404; only the branding is lost.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return <NotFoundPage />;
}
