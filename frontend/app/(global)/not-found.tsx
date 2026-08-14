import { NotFound404 } from "@/components/sections/NotFound404";

/**
 * `notFound()` boundary for the country-less public pages (a blog slug that
 * no longer exists, an unknown legal doc…). This subtree's ROOT layout has
 * already rendered — document, providers and `SiteChrome` — so this file
 * contributes the page body ONLY. Rendering `NotFoundPage` here instead
 * would nest a second `<html>` inside the first and the browser drops it,
 * leaving branded chrome wrapped around an empty `<main>`.
 */
export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function GlobalSubtreeNotFound() {
  return <NotFound404 />;
}
