import Link from "next/link";
import { cookies, headers } from "next/headers";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { getSelectedLocale } from "@/lib/i18n/selected-locale";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug, countrySlug } from "@/lib/routing/country-slug";
import { toSupportedLocale } from "@/lib/i18n/resolve-locale";
import type { CountryCode } from "@/data/countries";

/**
 * The 404 body: a vitals-monitor panel whose ECG trace flatlines across the
 * missing URL. Rendered inside the normal public shell (header, footer,
 * trust bar) by `app/_components/not-found-page.tsx`, so this component owns
 * only the section — no document, no chrome, no emergency notice (the shell's
 * trust bar / medical disclaimer already carries it).
 *
 * The recovery links stay inside the visitor's country scope whenever the
 * dead URL still carried one (`/portugal/pt/typo`) or the `gh-last-country`
 * cookie remembers one; otherwise they fall back to the country-less global
 * pages rather than guessing a market.
 */
export async function NotFound404() {
  const [requestHeaders, cookieStore, countries] = await Promise.all([
    headers(),
    cookies(),
    getPublicCountriesMerged(),
  ]);

  // Country scope, in the same precedence the header uses: the dead URL's own
  // first segment, then the remembered country, then none.
  const pathname = requestHeaders.get("x-gh-pathname") ?? "/";
  const [urlSlug, urlLang] = pathname.split("/").filter(Boolean);
  const [cookieSlug, cookieLang] = (cookieStore.get("gh-last-country")?.value ?? "").split(":");

  const knownCodes = new Set(countries.map((c) => c.code));
  const resolveScope = (slug?: string, lang?: string) => {
    if (!slug) return null;
    const code = countryCodeFromSlug(slug);
    if (!code || !knownCodes.has(code as CountryCode)) return null;
    return { code: code as CountryCode, lang: toSupportedLocale(lang) };
  };
  const scope = resolveScope(urlSlug, urlLang) ?? resolveScope(cookieSlug, cookieLang);

  const scopeConfig = scope ? countries.find((c) => c.code === scope.code) : undefined;
  const locale = await getSelectedLocale(scopeConfig?.defaultLocale);
  const t = getCommonLocale(locale);

  // Country-scoped base only when both halves are known — a `/{country}` URL
  // without a language segment would otherwise build `/portugal/undefined/...`.
  const base = scope ? `/${countrySlug(scope.code)}/${scope.lang ?? locale}` : null;

  const bookHref = base ? `${base}/book` : "/ireland/en/book";
  const links = base
    ? [
        { label: t.navigation.doctors, href: `${base}/doctors` },
        { label: t.navigation.services, href: `${base}/services` },
        { label: t.navigation.healthTests, href: `${base}/tests` },
        { label: t.navigation.contact, href: `${base}/contact` },
      ]
    : [
        // No country scope resolved (a 404 outside `/{country}/{lang}`).
        // About/blog/FAQ only exist per market since 2026-08-15, so these fall
        // back to Ireland — the same default the bare URLs 301 to — rather than
        // linking a redirect. /contact is still a real global page.
        { label: t.navigation.about, href: "/ireland/en/about" },
        { label: t.navigation.blog, href: "/ireland/en/blog" },
        { label: t.navigation.faq, href: "/ireland/en/faq" },
        { label: t.navigation.contact, href: "/contact" },
      ];

  return (
    <section className="gh2-404">
      <div className="gh2-404-inner">
        <span className="gh2-404-eyebrow">
          <span className="gh2-live-dot" aria-hidden />
          {t.notFound.eyebrow}
        </span>

        <div className="gh2-404-monitor">
          <div className="gh2-404-monitor-top">
            <span>{t.notFound.monitorLabel}</span>
            <span className="gh2-404-code">HTTP 404</span>
          </div>
          {/* Decorative: the flatline says nothing the headline below doesn't,
              so the whole trace (label included) is hidden from AT. */}
          <svg className="gh2-404-ecg" viewBox="0 0 620 150" preserveAspectRatio="none" aria-hidden>
            <path
              className="gh2-404-trace"
              d="M0,95 L70,95 L82,95 L92,72 L102,118 L112,60 L124,95 L150,95 L180,95 L215,95 L245,95 L400,95 L420,95 L432,95 L442,72 L452,118 L462,60 L474,95 L500,95 L620,95"
            />
            <text className="gh2-404-flatlabel" x="310" y="80" textAnchor="middle">
              {t.notFound.noSignal}
            </text>
          </svg>
          <nav className="gh2-404-monitor-bottom" aria-label={t.notFound.quickLinksLabel}>
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="gh2-404-quicklink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <h1 className="gh2-404-title">{t.notFound.title}</h1>
        <p className="gh2-404-lede">{t.notFound.body}</p>

        <div className="gh2-404-actions">
          <Link href={base ?? "/"} className="gh2-btn-lime">
            {t.notFound.cta}
          </Link>
          <Link href={bookHref} className="gh2-btn-ghost">
            {t.navigation.bookOnline}
          </Link>
        </div>
      </div>
    </section>
  );
}
