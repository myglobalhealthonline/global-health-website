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
  // Exact-topic overlap: dedicated 1,261-word sick-cert service page already
  // covers this query; the health page cannibalises it (position 56-77 range).
  "ireland:sick-cert-online": "sick-certificate-ireland",
  // "atestado médico" (sick note) — baixa-medica is the dedicated 1,609-word
  // sick-cert service page (chosen over the broader certificados-medicos
  // hub). Confirmed cannibalization: health page pos 14.5 vs service page
  // pos 7.6 for the same query.
  "portugal:atestado-medico-online": "baixa-medica",
  // Only exact slug collision in the whole set.
  "czechia:neschopenka-online": "neschopenka-online",

  // Deliberately left self-canonical — no live /services/ twin:
  //   ireland:arabic-speaking-doctor      (audience page)
  //   ireland:diabetes                    (condition, no twin)
  //   ireland:expat-healthcare            (audience page)
  //   ireland:hypertension                (condition, no twin)
  //   ireland:international-students      (audience page)
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
