/**
 * Country clamp for the country-director consultation list.
 *
 * Extracted from the route so the security-critical decision is a pure
 * function with no Fastify/Prisma dependency — it is unit-tested exhaustively
 * in country-director-scope.test.ts, which runs without a database.
 *
 * The rule: start from the GRANT, never from the query. A `countryCode` in the
 * query may only NARROW the granted set. Asking for a country outside the grant
 * is refused outright rather than returning an empty page, so a director
 * probing another market gets a clear 403 instead of a result they might read
 * as "that market has no consultations".
 */

export type DirectorCountryScope =
  | { ok: true; /** `null` = no country restriction (ADMIN). */ codes: string[] | null }
  | { ok: false; reason: "not-granted" };

/**
 * @param granted Lowercase codes the caller may read, or `null` for an
 *   unrestricted caller (ADMIN). An EMPTY ARRAY means "granted nothing" and is
 *   never conflated with `null`.
 * @param requested Raw `countryCode` from the query string, if any.
 */
export function resolveDirectorCountryScope(
  granted: string[] | null,
  requested: string | undefined,
): DirectorCountryScope {
  const wanted = requested?.trim().toLowerCase();
  if (granted === null) {
    // Unrestricted caller: a requested code still applies as a plain filter.
    return { ok: true, codes: wanted ? [wanted] : null };
  }
  const grantedLower = granted.map((c) => c.toLowerCase());
  if (wanted) {
    if (!grantedLower.includes(wanted)) return { ok: false, reason: "not-granted" };
    return { ok: true, codes: [wanted] };
  }
  // No country asked for → the whole grant. An empty grant must NOT fall
  // through to "unrestricted"; the caller's auth gate already refuses that
  // case, and returning `null` here would be a privilege escalation.
  if (grantedLower.length === 0) return { ok: false, reason: "not-granted" };
  return { ok: true, codes: grantedLower };
}
