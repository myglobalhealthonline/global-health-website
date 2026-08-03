/**
 * Some blog posts have `title`/`seoTitle` authored in ALL CAPS in the DB
 * (e.g. "HAND, FOOT AND MOUTH DISEASE: SIGNS AND TREATMENT"). Google
 * routinely rewrites shouting titles and they read as low quality on a YMYL
 * site, but we can't rewrite stored content — so this is a render-time
 * display transform only, applied where the title is emitted.
 *
 * ponytail: naive shout-detector + naive sentence-caser — flags a string only
 * when EVERY letter in it is uppercase, so mixed-case titles ("COVID-19
 * update") pass through untouched, and it doesn't special-case acronyms
 * inside a shouting title (an all-caps "... NHS GUIDANCE" becomes "... Nhs
 * guidance"). Upgrade path: allowlist known acronyms if that starts showing
 * up in real titles.
 */
export function sentenceCaseIfShouting(value: string): string {
  if (!/\p{L}/u.test(value) || value !== value.toUpperCase()) return value;
  return value.toLowerCase().replace(/(^\s*\p{L}|[.!?:]\s+\p{L})/gu, (m) => m.toUpperCase());
}
