import { PublicShell } from "@/components/layout/PublicShell";
import { NotFound404 } from "@/components/sections/NotFound404";

/**
 * The branded 404 WITH its own document, for boundaries that are NOT
 * rendered inside a public root layout: `app/global-not-found.tsx` (URLs
 * matching no route at all).
 *
 * Boundaries that DO sit inside a rendered layout — `(global)/not-found`,
 * `[country]/[lang]/not-found`, `(redirect)/not-found` — must not use this:
 * a second `<html>` inside the first is dropped by the browser, leaving
 * branded chrome around an empty `<main>`. They render `NotFound404`
 * directly, wrapped in `PublicShell` only where their layout supplies no
 * chrome of its own.
 *
 * The old "no dynamic APIs here" rule (P-001) was about `app/not-found.tsx`,
 * which Next inlined into EVERY route's loader tree, so one `cookies()` call
 * there made the whole site render at request time. These files are not
 * inlined anywhere, so reading headers/cookies costs the 404 alone and buys
 * the visitor's real language and country instead of an "en" flash.
 */
export function NotFoundPage() {
  return (
    <PublicShell withDocument>
      <NotFound404 />
    </PublicShell>
  );
}
