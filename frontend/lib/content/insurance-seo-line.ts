import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Compose the "we also accept <insurers>" line in the page's own language.
 *
 * The backend's `buildInsuranceSeoLine` builds this sentence too, but it is
 * hardcoded English by its own admission ("English-only for now"). The service
 * page rendered that value in two places — appended to the meta description and
 * as a visible paragraph in the hero — so every localized service page with
 * insurance coverage shipped an English sentence into both its SERP snippet and
 * its above-the-fold copy. Same defect class as SEO-015; this call site was
 * missed by that pass.
 *
 * Composing here rather than translating the backend keeps the sentence next to
 * the locale bundle that supplies its template, and lets `Intl.ListFormat` do
 * the joining. That matters: the separator is not "and" in five of the six
 * locales, and Czech and Romanian do not use the Oxford-style comma pattern the
 * backend hardcodes. `Intl.ListFormat` ships with Node and every target browser,
 * so this needs no dependency.
 *
 * Returns null when the service has no covering insurer, matching the previous
 * behaviour — the paragraph and the description suffix both disappear.
 */
export function buildLocalizedInsuranceLine(
  names: readonly string[],
  locale: LocaleCode,
  /** Template carrying a single `{list}` placeholder. */
  template: string,
): string | null {
  const clean = names.map((n) => n.trim()).filter((n) => n.length > 0);
  if (clean.length === 0) return null;

  let list: string;
  try {
    list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(clean);
  } catch {
    // An unexpected locale tag must not take down a service page.
    list = clean.join(", ");
  }

  return template.replace("{list}", list);
}

/** Portugal's clinically approved SEO descriptions are exact reviewed copy. */
export function composeServiceMetaDescription(
  baseDescription: string,
  insuranceLine: string | null,
  countryCode: string,
  locale: string,
): string {
  if (!insuranceLine || (countryCode === "pt" && locale === "pt")) return baseDescription;
  return `${baseDescription} ${insuranceLine}`.slice(0, 320);
}
