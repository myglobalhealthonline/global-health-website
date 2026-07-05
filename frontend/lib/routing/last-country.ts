/**
 * Public-site "last visited country" memo. The site has a mix of
 * country-scoped routes (`/[country]/[lang]/*`) and global routes
 * (`/about`, `/blog`, `/faq`, `/contact`). On the global routes the
 * header used to drop the country + language pickers entirely because
 * there was no active country in the URL, which read as "you have to
 * pick again" — confusing once a visitor had already chosen Ireland.
 *
 * This module persists the most recent country slug + lang in a
 * cookie (90-day TTL) so:
 *  - the country switcher on global pages shows the remembered choice
 *    instead of "Choose country"
 *  - the language switcher renders on global pages, scoped to the
 *    remembered country's supported locales
 *  - the header's "Book" CTA points back to that country's general
 *    consultation page instead of bouncing through the root gate
 *
 * Server reads are not currently wired — the cookie is read
 * client-side in SiteHeader via the useLastCountry hook below. That
 * keeps this a pure UX nicety with no SSR contract to honour.
 */

"use client";

import { useEffect, useState } from "react";
import type { CountryCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";

export const LAST_COUNTRY_COOKIE = "gh-last-country";

const ONE_DAY = 60 * 60 * 24;
const TTL_DAYS = 90;

/** Encoded as `<slug>:<lang>` — keeps both pieces of information in
 *  one cookie so the header doesn't need a coordinated pair. */
function encode(slug: string, lang: string): string {
  return `${slug}:${lang}`;
}

function decode(raw: string): { slug: string; lang: string } | null {
  if (!raw) return null;
  const [slug, lang] = raw.split(":");
  if (!slug || !lang) return null;
  return { slug, lang };
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const entry of document.cookie.split("; ")) {
    if (entry.startsWith(prefix)) {
      const raw = entry.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = TTL_DAYS * ONE_DAY;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Remember the current country + lang in a cookie. Call from any
 * page that has a valid country context — typically the country home
 * + country-scoped service pages do this on mount.
 */
export function rememberCountry(slug: string, lang: string) {
  if (!slug || !lang) return;
  writeCookie(LAST_COUNTRY_COOKIE, encode(slug, lang));
}

export type LastCountry = {
  code: CountryCode;
  slug: string;
  lang: string;
};

/**
 * Read the remembered country on the client. Accepts an optional
 * server-resolved initial value (read from the cookie in the layout)
 * so the first paint matches the post-hydration state — no flash of
 * "no country" before the cookie reads in. Pass `null` from the
 * server when the cookie was empty.
 *
 * After mount, the effect re-validates against the live cookie in
 * case it was rotated in another tab.
 */
export function useLastCountry(
  initial?: { slug: string; lang: string } | null,
): LastCountry | null {
  const seed = initial ? resolveLastCountry(initial.slug, initial.lang) : null;
  const [value, setValue] = useState<LastCountry | null>(seed);
  useEffect(() => {
    const raw = readCookie(LAST_COUNTRY_COOKIE);
    const parsed = raw ? decode(raw) : null;
    if (!parsed) return;
    const resolved = resolveLastCountry(parsed.slug, parsed.lang);
    if (!resolved) return;
    // Skip the re-render when the seed already matches — avoids a
    // hydration mismatch dance on the common case where SSR and CSR
    // agree about the cookie.
    if (
      seed &&
      seed.slug === resolved.slug &&
      seed.lang === resolved.lang &&
      seed.code === resolved.code
    ) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cookie is browser-only; reconciling against the SSR seed can't happen during render
    setValue(resolved);
    // intentionally empty dep array — we want this once on mount; the
    // seed snapshot was captured at first render. Cookie rotations from
    // other tabs are rare enough to not warrant a listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

function resolveLastCountry(slug: string, lang: string): LastCountry | null {
  const code = countryCodeFromSlug(slug);
  if (!code) return null;
  // Accept the cookie slug even if it differs from the canonical seeded slug.
  // Admin-added countries may not be in the seed registry yet, and the slug
  // stored in the cookie is still a valid route segment.
  return { code, slug, lang };
}
