import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Globe2,
  Mail,
} from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  entitySentence,
  getCountryAbout,
  type AboutCopyTemplates,
} from "@/lib/content/country-about";
import { getCountryContact, fillTemplate, formatOffice } from "@/lib/content/country-contact";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { AboutArchPanel } from "@/components/sections/AboutBlocks";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, countryMedicalOrganizationJsonLd } from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { EU_TRADE_MARK_URL } from "@/lib/brand/trademark";
import { czechiaStaticPageSeo } from "@/lib/content/czechia-static-page-seo";

export const revalidate = 300;

type Params = { country: string; lang: string };

/**
 * Meta keywords per market, in the market's language. Press pages have no
 * generic search demand (verified via OpenSEO 2026-08-30) — these are brand
 * and navigational phrases journalists actually type.
 */
const PRESS_KEYWORDS: Record<string, string[]> = {
  ie: ["Global Health press", "Global Health media", "telemedicine Ireland press"],
  es: ["Global Health prensa", "telemedicina España prensa", "sala de prensa Global Health"],
  pt: ["Global Health imprensa", "telemedicina Portugal imprensa", "sala de imprensa Global Health"],
  cz: ["Global Health pro média", "telemedicína média", "Global Health tisková zpráva"],
  ro: ["Global Health presă", "telemedicină România presă", "comunicat de presă Global Health"],
  br: ["Global Health imprensa", "telemedicina Brasil imprensa", "assessoria de imprensa Global Health"],
};

/**
 * Route params → country config + locale-resolved press copy. Same resolver
 * shape as /about and /careers: templates in company.json (press), market
 * facts from the shared per-country content files. One component serves
 * every market × locale.
 */
async function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  const contact = getCountryContact(code);
  const about = getCountryAbout(code);
  if (!config || !contact || !about) return null;
  const bundle = loadLocaleBundle(lang as LocaleCode);
  const t = bundle.company.press;
  const aboutT = bundle.about.country as unknown as AboutCopyTemplates;
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const languageNames = about.consultLanguages.map(
    (c) => aboutT[`lang_${c}`] ?? c.toUpperCase(),
  );
  const entity = entitySentence(about, aboutT);
  const vars = {
    country: countryName,
    regulator: contact.regulator.name,
    entity,
    email: contact.email,
  };
  return { code, config, contact, about, countryName, languageNames, entity, t, vars };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { config, countryName, t, vars } = resolved;
  const czechiaSeo = czechiaStaticPageSeo(resolved.code, lang, "press");

  return buildPublicMetadata({
    path: `/${country}/${lang}/press`,
    title: czechiaSeo?.title ?? fillTemplate(t.titleTemplate, vars),
    description: czechiaSeo?.description ?? fillTemplate(t.descriptionTemplate, vars),
    brandSuffix: false,
    type: "website",
    kind: "corporate",
    subtitle: countryName,
    sourceImage: "/images/stock/contact.jpg",
    imageAlt: t.heroImageAlt,
    keywords: PRESS_KEYWORDS[resolved.code],
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/press"),
  });
}

export default async function CountryPressPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { config, contact, countryName, languageNames, entity, t, vars } = resolved;

  const base = `/${country}/${lang}`;
  const office = contact.office;
  const pressHref = `mailto:${contact.email}?subject=${encodeURIComponent(`Press — ${SITE_NAME} ${countryName}`)}`;

  // Verifiable facts only — registry data, regulator, markets, languages.
  const facts: Array<{ label: string; value: string; href?: string }> = [
    { label: t.factBrand, value: t.factBrandValue, href: EU_TRADE_MARK_URL },
    { label: t.factOperator, value: entity },
    { label: t.factRegulator, value: contact.regulator.name, href: contact.regulator.url },
    { label: t.factMarkets, value: t.factMarketsValue },
    { label: t.factLanguages, value: languageNames.join(" · ") },
    { label: t.factWebsite, value: "myglobalhealth.online", href: "https://myglobalhealth.online" },
  ];

  const trustCards = [
    {
      icon: <Building2 className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustEntityTitle,
      subtitle: "Global Guest s.r.o.",
    },
    {
      icon: <BadgeCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustRegulatorTitle,
      subtitle: contact.regulator.name,
    },
    {
      icon: <Globe2 className="size-[18px]" strokeWidth={2} aria-hidden />,
      title: t.trustMarketsTitle,
      subtitle: t.trustMarketsSubtitle,
    },
  ];

  return (
    <section>
      <JsonLd
        data={countryMedicalOrganizationJsonLd({
          name: config.name,
          slug: config.slug || country,
          url: `${base}/press`,
          regulator: contact.regulator,
          address: office
            ? {
                streetAddress: office.streetLines.join(", "),
                addressLocality: office.locality,
                postalCode: office.postalCode,
                addressCountry: office.addressCountry,
              }
            : null,
          contactPoint: {
            telephone: contact.phoneE164,
            email: contact.email,
            availableLanguage: contact.phoneLanguages,
          },
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: base },
          { name: t.breadcrumb, url: `${base}/press` },
        ])}
      />

      {/* DARK — hero, same anatomy as /about */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${countryName}`}
        watermark={t.watermark}
        titleLead={t.h1}
        titleAccent=""
        lede={fillTemplate(t.introTemplate, vars)}
        ctaLabel={t.ctaEmail}
        ctaHref="#press-contact"
        secondaryLabel={t.ctaAbout}
        secondaryHref={`${base}/about`}
        trustCards={trustCards}
        rightSlot={
          <AboutArchPanel
            src="/images/stock/contact.jpg"
            alt={t.heroImageAlt}
            floats={trustCards.map(({ title, subtitle }, i) => ({
              icon:
                i === 0 ? (
                  <Building2 className="size-4" strokeWidth={2} aria-hidden />
                ) : i === 1 ? (
                  <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Globe2 className="size-4" strokeWidth={2} aria-hidden />
                ),
              title,
              subtitle,
            }))}
          />
        }
        mobileBgSrc="/images/stock/contact.jpg"
      />

      {/* LIGHT — company boilerplate journalists can lift verbatim */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
            {t.boilerplateEyebrow}
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(2rem,4vw+0.5rem,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t.boilerplateHeading}
          </h2>
          <div className="mt-8 max-w-[68ch] space-y-5 text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-primary)]">
            <p>{t.boilerplateBody1}</p>
            <p>{fillTemplate(t.boilerplateBody2Template, vars)}</p>
            <p className="text-[var(--color-text-muted)]">{t.boilerplateReuse}</p>
          </div>
        </div>
      </section>

      {/* DARK — fast facts, the /about definition-list anatomy on forest */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]">
            {t.factsEyebrow}
          </p>
          <h2 className="mt-4 max-w-[18ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white/92">
            {t.factsHeading}
          </h2>
          <dl className="mt-12 grid gap-x-12 sm:grid-cols-2">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="grid gap-1 border-t border-white/12 py-5 sm:grid-cols-[13rem_1fr] sm:items-baseline sm:gap-6"
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-accent)]">
                  {fact.label}
                </dt>
                <dd className="text-[length:var(--text-body)] leading-relaxed text-white/85">
                  {fact.href ? (
                    <a
                      href={fact.href}
                      {...(fact.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-[var(--color-brand-accent)]"
                    >
                      {fact.value}
                    </a>
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* LIGHT — press contact */}
      <section
        id="press-contact"
        className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
      >
        <SectionSeam theme="light" />
        <div className="mx-auto grid max-w-[var(--container-width)] gap-12 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
              {t.contactEyebrow}
            </p>
            <h2 className="mt-3 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
              {t.contactHeading}
            </h2>
          </div>
          <div className="space-y-5 text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
            <p>{t.contactBody}</p>
            <p className="flex flex-wrap items-center gap-3 pt-2">
              <a href={pressHref} className="gh-btn gh-btn-primary">
                <Mail className="size-4" strokeWidth={1.75} aria-hidden />
                {t.ctaEmail}
              </a>
              {office ? (
                <span className="inline-flex items-center gap-2 text-[15px] text-[var(--color-text-primary)]">
                  <Building2 className="size-4" strokeWidth={1.75} aria-hidden />
                  {formatOffice(office)}
                </span>
              ) : null}
            </p>
            <p className="text-[15px]">
              <Link
                href={`${base}/about`}
                className="inline-flex items-center gap-2 font-medium underline underline-offset-4 text-[var(--color-brand-primary)]"
              >
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
                {t.ctaAbout}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
