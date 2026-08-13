/**
 * `/health/[slug]` → `/services/[slug]` canonical map (SEO audit 2.4b,
 * decided 2026-08-03). 15 `/health/` slugs exist across Ireland, Portugal and
 * Czechia; only the ones covering the SAME search intent as an existing
 * `/services/` page are canonicalized onto that page. Condition pages
 * (diabetes, migraine, hypertension, ...) and audience pages
 * (expat-healthcare, international-students, ...) have no service twin and
 * stay self-canonical — do not force a match; see ACTION-PLAN.md §2.4b for
 * the full reasoning per slug.
 *
 * Keyed by `${countrySlug}:${healthSlug}` → target `/services/` slug.
 */
export const HEALTH_SERVICE_CANONICAL: Record<string, string> = {
  // Only exact slug collision in the whole set.
  "czechia:neschopenka-online": "neschopenka-online",

  // ireland:sick-cert-online moved to HEALTH_RETIRED_REDIRECTS below
  // (2026-08-09 ranking-growth batch) — canonical-only wasn't enough to
  // drop the ES/RO variants from the index.
  //
  // portugal:atestado-medico-online moved to HEALTH_RETIRED_REDIRECTS below
  // (2026-08-11 ranking-growth batch) — same failure mode as Ireland's
  // sick-cert-online: canonical-only left the ES alias ranking Portugal's
  // own "atestado médico online" query instead of the pt page or the
  // baixa-medica service page it was meant to consolidate onto (~108 PT-
  // market impressions/3mo on the ES alias alone). "atestado médico" (sick
  // note) — baixa-medica is the dedicated 1,609-word sick-cert service page
  // (chosen over the broader certificados-medicos hub). Confirmed
  // cannibalization: health page pos 14.5 vs service page pos 7.6 for the
  // same query.

  // Deliberately left self-canonical — no live /services/ twin:
  //   ireland:arabic-speaking-doctor      (audience page)
  //   ireland:diabetes                    (condition, no twin)
  //   ireland:expat-healthcare            (audience page)
  //   ireland:hypertension                (condition, no twin)
  //   ireland:migraine                    (condition, no twin)
  //   ireland:online-prescription-ireland (no dedicated prescription service
  //                                         detail page exists — /prescriptions
  //                                         redirects to the GP hub, not a slug)
  //   ireland:respiratory-infections      (rewrite rule exists in
  //                                         next.config.ts but no published
  //                                         service content behind it — 404)
  //   portugal:diabetes                   (condition, no twin)
  //   portugal:enxaqueca                  (condition, no twin)
  //   portugal:hipertensao                (condition, no twin)
  //   portugal:infecoes-respiratorias     (condition, no twin, same as IE)
};

/** Returns the `/services/` slug this `/health/` page should canonicalize
 *  onto, or `null` when it should stay self-canonical. */
export function resolveHealthCanonicalServiceSlug(
  countrySlug: string,
  healthSlug: string,
): string | null {
  return HEALTH_SERVICE_CANONICAL[`${countrySlug}:${healthSlug}`] ?? null;
}

/**
 * `/health/[slug]` pages RETIRED behind a 301, keyed the same way. Unlike the
 * canonical map above — which keeps a page live and merely consolidates its
 * ranking signals — an entry here means the URL no longer serves content.
 *
 * The redirect itself lives in `next.config.ts` (it has to: redirects are
 * resolved before routing). This table is the single source of truth that
 * `app/sitemap.ts` reads so a retired URL is never submitted, which is what
 * keeps the sitemap's "zero redirecting URLs" property intact.
 *
 * Values are the destination path WITHOUT the `/{country}/{lang}` prefix.
 */
export const HEALTH_RETIRED_REDIRECTS: Record<string, string> = {
  // Retired 2026-08-03 on the user's call. The page held position 4.8 — the
  // best of any /health/ page — but on 5 impressions and 0 clicks in 90 days,
  // which is a good position for something almost nobody searches. An
  // international student arriving in Ireland needs a GP, and the GP
  // consultation page serves that intent far better than a 297-word explainer.
  "ireland:international-students": "gp-consultation-online",
  // Retired 2026-08-09 (ranking-growth batch). Canonical-only (see the
  // history in HEALTH_SERVICE_CANONICAL above) wasn't enough: Google kept
  // the ES/RO variants independently indexed and ranking for the "sick
  // cert" cluster (168 impr/pos 28.1, 13 impr/pos 16.3 over 90 days) despite
  // the foreign canonical. A real redirect is needed to fully consolidate
  // onto the service page.
  "ireland:sick-cert-online": "services/sick-certificate-ireland",
  // Retired 2026-08-11 (ranking-growth batch) — see the note in
  // HEALTH_SERVICE_CANONICAL above for the GSC numbers that forced this.
  "portugal:atestado-medico-online": "services/baixa-medica",
};

/** True when this `/health/` page has been retired behind a 301 and must be
 *  omitted from the sitemap. */
export function isRetiredHealthSlug(countrySlug: string, healthSlug: string): boolean {
  return `${countrySlug}:${healthSlug}` in HEALTH_RETIRED_REDIRECTS;
}
