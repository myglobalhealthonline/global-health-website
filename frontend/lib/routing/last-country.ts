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
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";

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
 * Read the remembered country on the client. Returns null until the
 * effect runs (cookie is browser-only), so call sites should handle
 * the null branch gracefully — typically by showing the same UI as
 * "no country selected yet" until the value resolves.
 */
export function useLastCountry(): LastCountry | null {
  const [value, setValue] = useState<LastCountry | null>(null);
  useEffect(() => {
    const raw = readCookie(LAST_COUNTRY_COOKIE);
    const parsed = raw ? decode(raw) : null;
    if (!parsed) return;
    const code = countryCodeFromSlug(parsed.slug);
    if (!code) return;
    // Sanity: confirm the slug round-trips so a stale cookie from a
    // renamed country gets ignored rather than crashing the header.
    if (COUNTRY_CODE_TO_SLUG[code] !== parsed.slug) return;
    setValue({ code, slug: parsed.slug, lang: parsed.lang });
  }, []);
  return value;
}
