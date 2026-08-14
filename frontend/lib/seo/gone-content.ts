/**
 * Permanently removed entities — the single source of truth for both halves of
 * the 410 mechanism.
 *
 * A departed clinician is NOT a redirect problem. There is no successor page,
 * so redirecting to another doctor would misrepresent who a patient is about to
 * book, and redirecting to the `/doctors` listing answers a navigational query
 * ("Dr X") with a page that never names them. Both also keep the dead URL alive
 * in the index. 410 says it once, and Google retires a 410 faster than a 404.
 *
 * Two things have to agree for that to actually happen, which is why this file
 * exists rather than a list inside `proxy.ts`:
 *
 *   1. `proxy.ts` answers 410 for every URL shape the entity was reachable at.
 *   2. `next.config.ts` EXCLUDES those slugs from the broad
 *      `/{country}-doctors/:slug` redirects.
 *
 * Step 2 is not optional. Next runs `redirects()` BEFORE middleware — verified
 * empirically on 2026-08-08: with only step 1 in place,
 * `/ireland-doctors/dr-grainne-ahern` still answered 308 and the 410 was never
 * reached, leaving the exact two-hop `legacy -> 308 -> dead URL` shape the
 * removal was meant to eliminate.
 *
 * Anything listed here must ALSO be absent from the roster API, the sitemap and
 * every internal link. This is the last mile, not the whole removal.
 */

export type GoneDoctor = {
  /** Country slug in the current URL shape, e.g. `ireland`. */
  country: string;
  /** Legacy Wix collection prefix, e.g. `ireland-doctors`. */
  legacyPrefix: string;
  /** The doctor slug, lowercase. */
  slug: string;
  /**
   * What answering 410 here costs, in measured search traffic. Required, and
   * required to be non-empty, because a 410 is a deliberate decision to throw
   * traffic away: the number is what makes that a decision rather than an
   * oversight. Quote the window (e.g. "74 clicks / 600 impressions over 90
   * days across 4 URL variants, average position 3.8").
   */
  clickCost: string;
  /**
   * The human who confirmed this entity is gone, and when. Required because
   * absence from the roster is NOT evidence of removal — that mistake was made
   * once (mudr-jana-cyplinska, 410'd and reverted the same day, 2026-08-08) and
   * this field is what makes repeating it impossible to do silently.
   */
  approvedBy: string;
};

/**
 * dr-grainne-ahern — confirmed departed 2026-08-08 (owner decision). Was the
 * site's highest-traffic legacy URL: 74 clicks / 600 impressions over 90 days
 * across 4 URL variants, average position 3.8.
 *
 * mudr-jana-cyplinska is deliberately NOT here. 2026-08-08: a same-day 410 was
 * shipped on database-absence evidence alone (no matching row across every
 * Czechia doctor, active or not), then reverted the same day after a wider
 * evidence search — no owner statement, no datasheet (unlike Ireland/Portugal/
 * Spain, no `czechia-doctors-datasheet.ts` was ever authored, so she may never
 * have been migrated to this platform's Czechia roster at all, which is a
 * migration gap, not a departure), and zero `AuditLog` rows mention her name
 * (860 Doctor-entity rows exist, so the table is populated — the zero is a
 * real negative, not an empty table). Three independent negatives, still no
 * positive confirmation. Absence is not evidence of removal on its own — see
 * legacy-redirect-recovery-2026-08-08.md. Restored to the pre-410 state: her
 * URLs 404 (308 -> dead slug -> 404) pending a human confirming which of
 * CONFIRMED RETIRED / LIVE UNDER ANOTHER IDENTITY it actually is.
 */
export const GONE_DOCTORS: readonly GoneDoctor[] = [
  {
    country: "ireland",
    legacyPrefix: "ireland-doctors",
    slug: "dr-grainne-ahern",
    clickCost:
      "74 clicks / 600 impressions over 90 days across 4 URL variants, average position 3.8 (measured 2026-08-08)",
    approvedBy: "Owner decision, 2026-08-08 — confirmed departed",
  },
];

/** Site locales — the `[lang]` segment, and the legacy Wix locale prefix. */
export const GONE_LOCALES = ["en", "pt", "es", "cs", "ro", "de"] as const;

/** Every URL shape a removed entity was reachable at. */
export const GONE_PATHS: ReadonlySet<string> = new Set(
  GONE_DOCTORS.flatMap(({ country, legacyPrefix, slug }) => [
    `/${legacyPrefix}/${slug}`,
    ...GONE_LOCALES.map((l) => `/${l}/${legacyPrefix}/${slug}`),
    ...GONE_LOCALES.map((l) => `/${country}/${l}/doctors/${slug}`),
  ]),
);

/** Case- and trailing-slash-insensitive; tolerates percent-encoded paths. */
export function isGonePath(pathname: string): boolean {
  let p = pathname;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    // Malformed escape sequence — fall through and match the raw form.
  }
  p = p.toLowerCase().replace(/\/+$/, "");
  return GONE_PATHS.has(p === "" ? "/" : p);
}

/**
 * A `:slug` matcher for the broad legacy-doctor redirects that refuses to match
 * a removed slug, so the request falls through to the middleware's 410 instead
 * of being 308'd onto a dead URL.
 *
 * Returns a plain `:slug` when nothing is removed for that prefix — no reason
 * to carry a lookahead that excludes nothing.
 */
export function slugMatcherExcludingGone(legacyPrefix: string): string {
  const slugs = GONE_DOCTORS.filter((d) => d.legacyPrefix === legacyPrefix).map((d) => d.slug);
  if (slugs.length === 0) return ":slug";
  const alternation = slugs.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  // Two details, both found live on 2026-08-08 rather than reasoned out — the
  // trailing-slash form kept answering 308 while every other shape answered 410:
  //
  //   `[^/]+` not `.*`  — a bare `:slug` is single-segment; `.*` spans `/`, so
  //                       the slug captured "<slug>/" and never equalled the
  //                       excluded value.
  //   `/?$` not `$`     — path-to-regexp compiles non-strict, appending an
  //                       optional trailing slash. Anchored on `$` alone the
  //                       lookahead saw "<slug>/", failed to match, and so
  //                       failed to EXCLUDE (a negative lookahead that doesn't
  //                       match lets the rule through).
  return `:slug((?!(?:${alternation})/?$)[^/]+)`;
}
