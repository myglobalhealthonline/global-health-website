import { PublicShell } from "@/components/layout/PublicShell";
import { NotFound404 } from "@/components/sections/NotFound404";

/**
 * THE high-traffic 404 boundary, despite the obscure folder.
 *
 * `(redirect)/[country]/page.tsx` matches every single-segment URL on the
 * domain — so every dead legacy link, mistyped path and stale inbound link
 * of the form `/whatever` lands there, fails `countryCodeFromSlug`, and
 * calls `notFound()`. Without this file that boundary had nothing to render
 * and Next served its own bare black-and-white 404 for the single most
 * common 404 shape the site gets.
 *
 * Chrome comes from `PublicShell` (no `withDocument`): the (redirect) root
 * layout already rendered `RootDocument`, and nesting a second `<html>`
 * leaves the browser showing chrome around an empty page.
 */
export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function RedirectNotFound() {
  return (
    <PublicShell>
      <NotFound404 />
    </PublicShell>
  );
}
