/**
 * `{name}`-style interpolation for tool copy — the same placeholder syntax
 * `scripts/check-locale-keys.mjs` validates across locales.
 *
 * Deliberately its own module: the widgets are client components, and
 * importing this from `registry.ts` (which pulls in the locale loader and
 * every locale JSON) would drag all six languages into the browser bundle.
 */
export function fillPlaceholders(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
