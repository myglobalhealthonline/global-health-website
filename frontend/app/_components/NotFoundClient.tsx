"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { toSupportedLocale } from "@/lib/i18n/resolve-locale";
import type { LocaleCode } from "@/lib/i18n/types";

export type NotFoundCopy = { title: string; body: string; cta: string };

/**
 * Locale picker for the root 404 (P-001).
 *
 * `app/not-found.tsx` is rendered into EVERY route's RSC payload as that
 * route's not-found boundary, so any Next.js dynamic API it touches forces
 * the whole route dynamic. It used to call `getPageLocale()` ->
 * `cookies()`/`headers()`, which is why zero pages were being statically
 * generated — that single call site accounted for all of them.
 *
 * The six `notFound` copy slices are ~30 short strings total, so shipping
 * all of them and choosing on the client costs less than a request-time
 * render of the entire site. Same "render the logged-out/default shape on
 * the server, upgrade after mount" convention as PublicAuthProvider, so the
 * first client render always matches the server HTML.
 */
export function NotFoundClient({ copy }: { copy: Record<LocaleCode, NotFoundCopy> }) {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    // Same precedence as resolveLocale(), minus the `x-gh-locale` header
    // (unavailable client-side): explicit cookie first, then the browser's
    // language list, then the "en" default already rendered.
    const cookieLocale = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("gh_locale="))
      ?.slice("gh_locale=".length);

    const resolved =
      toSupportedLocale(decodeURIComponent(cookieLocale ?? "")) ??
      navigator.languages.map((l) => toSupportedLocale(l)).find(Boolean) ??
      "en";

    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate post-mount upgrade: the first client render must match the server's "en" HTML
    if (resolved !== "en") setLocale(resolved);
  }, []);

  const t = copy[locale] ?? copy.en;

  return (
    <GH2StatusPage status="error" title={t.title} body={t.body}>
      <Link href="/" className="gh2-btn-lime">
        {t.cta}
      </Link>
    </GH2StatusPage>
  );
}
