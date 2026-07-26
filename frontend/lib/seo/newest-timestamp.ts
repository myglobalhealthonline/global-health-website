/**
 * Newest of a set of ISO timestamps, or undefined when none parse.
 *
 * Used by the sitemap to date hub/list pages (country home, /doctors,
 * /pricing …) from the child content beneath them — those routes have no
 * timestamp of their own. String comparison is NOT safe here: the values come
 * from several APIs and are not guaranteed to share an offset or precision,
 * so everything goes through Date.parse.
 */
export function newestTimestamp(
  ...values: Array<string | null | undefined>
): string | undefined {
  let best: string | undefined;
  let bestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isNaN(ms) || ms <= bestMs) continue;
    best = value;
    bestMs = ms;
  }
  return best;
}
