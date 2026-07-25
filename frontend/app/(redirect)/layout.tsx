import type { ReactNode } from "react";
import { RootDocument } from "@/app/_components/RootDocument";

/**
 * ROOT layout for `/{country}` — a bare country root that only ever
 * `redirect()`s to `/{country}/{lang}`.
 *
 * Its own root rather than a member of `(global)`: that layout fetches site
 * context, assets, footer and trust rows on every render, and this route
 * throws a redirect before any of it is used. `/{country}` is the hop every
 * entry-gate click takes, so paying four backend round-trips for markup
 * nobody sees would be a regression on the hottest path on the site.
 *
 * It cannot live under `app/[country]/` either: a layout there would become
 * the root layout for `[country]/[lang]`, which would demote `lang` out of
 * root-param scope and take `<html lang>` back to a hardcoded value.
 */
export default function RedirectRootLayout({ children }: { children: ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
