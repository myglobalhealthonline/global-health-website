import { NotFound404 } from "@/components/sections/NotFound404";

/**
 * `notFound()` boundary for everything under `/{country}/{lang}` — an unknown
 * doctor or service slug, a retired page. Body only: the country root layout
 * around it has already supplied the document and `SiteChrome` (see the
 * sibling `(global)/not-found.tsx` for why nesting a second document breaks).
 *
 * When the country layout ITSELF throws (unknown country slug, locale not
 * enabled for that market) there is no rendered layout to hold this boundary
 * — that case falls through to `app/global-not-found.tsx`, which brings its
 * own document.
 */
export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function CountryNotFound() {
  return <NotFound404 />;
}
