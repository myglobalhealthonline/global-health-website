import Link from "next/link";
import type { CountryConfig } from "@/data/countries";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { localizedLanguageLabel } from "@/lib/content/languages";

/**
 * Cross-silo internal linking (SEO audit 3.7). Every content page already
 * computes `hreflangAlternates(country, suffix)` for its `<link rel="alternate">`
 * tags — that map IS the trustworthy cluster (454 pages, zero reciprocity
 * failures). This just surfaces it as real, crawlable `<a>` links instead of
 * letting it live only in `<head>`, so PageRank earned by one locale's article
 * can flow to its sibling-language version of the same page. Must render in
 * the raw server HTML (no client JS) — the footer locale-switcher bug this
 * project already paid for once was exactly a JS-only link row.
 *
 * Deliberately does NOT cross country silos (Ireland → Spain): the hreflang
 * map only clusters same-country, same-content, different-language variants —
 * there's no reliable slug-equivalence mapping across separately authored
 * per-country content to link to instead.
 */
export function AlsoAvailableIn({
  country,
  lang,
  suffix = "",
  title,
}: {
  country: CountryConfig;
  lang: string;
  suffix?: string;
  title: string;
}) {
  const current = lang.toLowerCase();
  const links = Object.entries(hreflangAlternates(country, suffix))
    .filter(([tag]) => tag !== "x-default")
    .map(([tag, href]) => ({ tag, targetLang: tag.split("-")[0], href }))
    .filter((l) => l.targetLang !== current);

  if (links.length === 0) return null;

  return (
    <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <h2
          className="font-extrabold tracking-[-0.02em] leading-tight"
          style={{ fontSize: "clamp(1.25rem, 1.5vw + 0.75rem, 1.75rem)", color: "var(--color-text-primary)" }}
        >
          {title}
        </h2>
        <ul className="mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
          {links.map((l) => (
            <li key={l.tag}>
              <Link
                href={l.href}
                hrefLang={l.tag}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline decoration-[rgba(29,75,54,0.28)] underline-offset-4 transition-colors hover:text-[var(--color-brand-primary-hover)]"
              >
                {localizedLanguageLabel(l.targetLang, current)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
