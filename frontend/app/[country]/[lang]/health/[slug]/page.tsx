import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryLandingPage,
  getCountryDoctors,
  getLandingAvailableLocales,
} from "@/lib/content/get-country-collections";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { indexableHreflangCluster, ogLocales } from "@/lib/seo/hreflang";
import { eligibleLandingLocales } from "@/lib/seo/landing-locale-eligibility";
import { SITE_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  countryMedicalOrganizationJsonLd,
  faqJsonLd,
} from "@/lib/seo/structured-data";
import { getPublicUrl, getSiteUrl } from "@/lib/seo/site-url";
import { resolveHealthCanonicalServiceSlug } from "@/lib/seo/health-service-canonical";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { doctorCardI18n } from "@/components/cards/doctor-card-i18n";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { FAQSection } from "@/components/sections/FAQSection";
import { AlsoAvailableIn } from "@/components/sections/AlsoAvailableIn";
import { PageHero } from "@/components/sections/PageHero";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { ArrowRight } from "lucide-react";

type Params = { country: string; lang: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, slug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const config = getCountryByCode(code);
  const [page, availableLocales] = await Promise.all([
    getCountryLandingPage(code, slug, lang),
    getLandingAvailableLocales(code, slug),
  ]);
  if (!page) return { title: SITE_NAME };
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? `Learn about ${page.title} in ${config?.name ?? country}.`;
  // International-locale batch (2026-08-09): `getCountryLandingPage` falls
  // back exact-locale -> country-default-locale, so a page with only ONE real
  // translation 200s for every supported locale. `page.resolvedLocale` is
  // WHICH locale actually supplied the rendered content — when it doesn't
  // match the route's own `lang`, this is fallback content, not a genuine
  // translation of this page. Same class of bug `exactLocalesForLegalType`
  // fixed for /legal/* — mirrored here via the landing service's
  // `availableLocales` (the shared source of truth with app/sitemap.ts).
  const isExactLocale = page.resolvedLocale?.toLowerCase() === lang.toLowerCase();
  const metadata = buildPublicMetadata({
    path: `/${country}/${lang}/health/${slug}`,
    title,
    description,
    type: "article",
    kind: "article",
    subtitle: config?.name,
    imageAlt: `${page.title} — ${config?.name ?? country}`,
    locale: config ? ogLocales(config, lang).locale : undefined,
    // A fallback-locale render advertises NO hreflang cluster at all — it is
    // about to be marked noindex below, and hreflang is a reciprocal claim
    // between publishable alternates: a noindexed page has nothing to assert
    // about its siblings, and the real alternates already advertise each
    // other via their own indexable render.
    languages:
      config && isExactLocale
        ? indexableHreflangCluster(
            config,
            `/health/${slug}`,
            eligibleLandingLocales(
              availableLocales,
              config.supportedLocales ?? [],
              config.defaultLocale ?? "en",
            ),
          )
        : undefined,
  });
  if (!isExactLocale) {
    // `noindex, FOLLOW` — mirrors the service-page pattern: the page still
    // renders and links normally (existing product behavior — no redirect on
    // a missing translation), it just stops claiming to be this locale's
    // indexable variant. Not submitted to the sitemap either (app/sitemap.ts).
    metadata.robots = { index: false, follow: true };
  }

  // SEO audit 2.4b — canonical the pages that cannibalise a topically
  // identical /services/ page onto that page instead (see
  // lib/seo/health-service-canonical.ts for the mapping + reasoning per
  // slug). Everything else stays self-canonical.
  const canonicalServiceSlug = resolveHealthCanonicalServiceSlug(country, slug);
  if (canonicalServiceSlug) {
    // Canonical only — the `languages` map is DROPPED, not merged. A page that
    // canonicalizes elsewhere must not also advertise itself (and its sibling
    // locales) as hreflang targets: that names URLs Google has been told are
    // not canonical, and it contradicts the cluster the `/services/` twin
    // already emits for the same locales. The service page owns the cluster.
    metadata.alternates = {
      canonical: getPublicUrl(`/${country}/${lang}/services/${canonicalServiceSlug}`),
    };
  }

  return metadata;
}

/**
 * SEO landing page (condition / audience marketing page). Indexed via the
 * sitemap; intentionally NOT in the main nav or service-listing pages
 * (internal-linking spec, Rule 6). Linked only from related service pages
 * and blog posts.
 */
export default async function CountryLandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, slug } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();

  const [page, countryTrust, availableLocales] = await Promise.all([
    getCountryLandingPage(code, slug, lang),
    getCountryTrust(code, lang as LocaleCode),
    getLandingAvailableLocales(code, slug),
  ]);
  if (!page) notFound();
  const eligibleLocales = eligibleLandingLocales(
    availableLocales,
    config.supportedLocales ?? [],
    config.defaultLocale ?? "en",
  );
  // Same predicate generateMetadata uses to drop the canonical/hreflang
  // signal (SEO ranking-growth batch, 2026-08-09 §AlsoAvailableIn leak): a
  // page that canonicalizes onto a /services/ twin must not ALSO emit real,
  // crawlable reciprocal links to its own sibling-locale /health/ variants —
  // that contradicts the canonical tag this same page already sends.
  const isCanonicalAlias = resolveHealthCanonicalServiceSlug(country, slug) !== null;

  const bodyHtml = page.bodyHtml ? scopeBlogHtml(page.bodyHtml) : null;
  const template = page.template;
  const pageUrl = `${getSiteUrl()}/${country}/${lang}/health/${slug}`;
  const c = loadLocaleBundle(lang as LocaleCode).common;

  let doctors: Awaited<ReturnType<typeof getCountryDoctors>> = [];
  if (template?.doctorLanguage || (template?.doctorSlugs && template.doctorSlugs.length > 0)) {
    const all = await getCountryDoctors(code, lang);
    const slugSet = template?.doctorSlugs ? new Set(template.doctorSlugs) : null;
    const langNeedle = template?.doctorLanguage?.toLowerCase();
    doctors = all.filter((d) => {
      const matchesSlug = slugSet ? slugSet.has(d.slug) : false;
      const matchesLanguage = langNeedle
        ? d.languages.some((l) => l.toLowerCase() === langNeedle)
        : false;
      return matchesSlug || matchesLanguage;
    });
  }

  const ctaHref = `/${country}/${lang}/book${
    template?.ctaService ? `?service=${encodeURIComponent(template.ctaService)}` : ""
  }`;

  // Hero title split — the accent half is the trailing "in Ireland" / country
  // word, matching how every other PageHero on the public site splits its
  // headline. Titles are CMS-authored, so this derives it instead of adding a
  // second field admins would have to fill for 90 pages.
  const titleWords = page.title.trim().split(/\s+/);
  const accentWordCount =
    titleWords.length > 2 && /^(in|for|and|&|—|-)$/i.test(titleWords[titleWords.length - 2] ?? "")
      ? 2
      : 1;
  const titleLead = titleWords.slice(0, -accentWordCount).join(" ");
  const titleAccent = titleWords.slice(-accentWordCount).join(" ");
  const doctorsHref = `/${country}/${lang}/doctors${
    template?.doctorLanguage ? `?lang=${encodeURIComponent(template.doctorLanguage)}` : ""
  }`;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: page.seoTitle ?? page.title,
          description: page.seoDescription,
          url: pageUrl,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: c.countryNames?.[code] ?? config.name, url: `/${country}/${lang}` },
          { name: page.title, url: `/${country}/${lang}/health/${slug}` },
        ])}
      />
      <JsonLd
        data={countryMedicalOrganizationJsonLd({
          name: config.name,
          slug: country,
          url: `${getSiteUrl()}/${country}/${lang}`,
          identifier: countryTrust?.providerRegistration?.number
            ? {
                label: countryTrust.providerRegistration.label,
                value: countryTrust.providerRegistration.number,
              }
            : null,
          sameAs: countryTrust
            ? countryTrust.authorityLinks.filter((l) => l.showInSchema).map((l) => l.url)
            : [],
          regulator: countryTrust?.regulator?.name
            ? { name: countryTrust.regulator.name, url: countryTrust.regulator.url }
            : null,
        })}
      />
      {page.faq && page.faq.length > 0 ? <JsonLd data={faqJsonLd(page.faq)} /> : null}

      {/* Dark hero — same primitive the service, FAQ, pricing and about pages
          use, so a /health/ page reads as part of the site rather than a bare
          article. It owns the <h1>; the body band below is copy only. */}
      <PageHero
        countryCode={code}
        countryLabel={c.countryNames?.[code] ?? config.name}
        titleLead={titleLead}
        titleAccent={titleAccent}
        lede={page.seoDescription ?? undefined}
        ctaLabel={c.doctorProfile.bookConsultation}
        ctaHref={ctaHref}
        secondaryLabel={doctors.length > 0 ? c.doctors.viewDoctors : undefined}
        secondaryHref={doctors.length > 0 ? doctorsHref : undefined}
        heroImage={{
          src: doctors.length > 0 ? "/images/stock/doctors.jpg" : "/images/stock/gp.jpg",
          alt: `${page.title} — ${config.name}`,
          priority: true,
        }}
      />

      {/* Body — ivory band, same rhythm as the service page's
          "About this service" section. */}
      {bodyHtml ? (
        <section className="gh-inline-clamp-section gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <div
              className="gh-article-body max-w-[76ch]"
              // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- bodyHtml = scopeBlogHtml(page.bodyHtml), sanitize-html with a controlled allowlist.
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
            <div className="mt-8">
              <Link href={ctaHref} className="gh2-btn-lime inline-flex items-center gap-2">
                {c.doctorProfile.bookConsultation}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {doctors.length > 0 ? (
        <section className="gh-inline-clamp-section gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <header>
              <h2 className="max-w-[20ch] text-[clamp(1.9rem,3.5vw,2.8rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--color-text-primary)]">
                {c.gpPage.doctorsSectionTitle.replace("{country}", c.countryNames?.[code] ?? config.name)}
              </h2>
              <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-[var(--color-text-muted)]">
                {c.gpPage.doctorsSectionIntro}
              </p>
            </header>
            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <li key={d.id}>
                  <DoctorCard
                    cardI18n={doctorCardI18n(c.doctors)}
                    name={d.fullName}
                    title={d.title}
                    bio={d.bio ?? ""}
                    languages={d.languages}
                    imageSrc={d.imageSrc ?? null}
                    imcRegistration={d.imcRegistration}
                    registrationDivision={d.registrationDivision}
                    registrationVerified={d.registrationVerified}
                    medicalRegistrationUrl={d.medicalRegistrationUrl}
                    credentials={d.credentials}
                    href={`/${country}/${lang}/doctors/${d.slug}`}
                    dark
                  />
                </li>
              ))}
            </ul>
            {template?.doctorLanguage ? (
              <Link
                href={`/${country}/${lang}/doctors?lang=${encodeURIComponent(template.doctorLanguage)}`}
                className="mt-6 inline-block text-[14px] font-semibold text-[var(--color-brand-accent)] underline underline-offset-2"
              >
                {c.healthPage.seeAllLanguageDoctors.replace("{language}", template.doctorLanguage)}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {page.faq && page.faq.length > 0 ? (
        <FAQSection title={c.serviceDetailPage.faqTitle} items={page.faq} />
      ) : null}

      {template?.related && template.related.length > 0 ? (
        <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            {/* Same treatment as the service page's related-topics block —
                brand-primary on ivory (brand-accent is the on-dark colour and
                failed contrast here), 44px touch targets. */}
            <h2
              className="font-extrabold tracking-[-0.02em] leading-tight"
              style={{
                fontSize: "clamp(1.25rem, 1.5vw + 0.75rem, 1.75rem)",
                color: "var(--color-text-primary)",
              }}
            >
              {c.serviceDetailPage.relatedTopicsTitle}
            </h2>
            <ul className="mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
              {template.related.map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-primary)] underline decoration-[rgba(29,75,54,0.28)] underline-offset-4 transition-colors hover:text-[var(--color-brand-primary-hover)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {isCanonicalAlias ? null : (
        <AlsoAvailableIn
          country={config}
          lang={lang}
          suffix={`/health/${slug}`}
          title={c.alsoAvailableIn.title}
          eligibleLocales={eligibleLocales}
        />
      )}

      {/* Short medical disclaimer — same placement as the service page. */}
      <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <MedicalDisclaimer
            variant="short"
            text={c.serviceDetailPage.disclaimer.replace("{country}", config.name)}
          />
        </div>
      </section>

      {/* Closing booking band — visual parity with the service page's
          closing CTA. */}
      <section className="gh-inline-clamp-section gh2-section-forest relative isolate overflow-hidden gh-medical-pattern gh-medical-pattern-dark">
        <SectionSeam theme="dark" />
        <div className="relative mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className="grid items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-brand-accent)]">
                {c.serviceDetailPage.readyEyebrow}
              </p>
              <h2 className="mt-5 max-w-[18ch] text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[1.0] tracking-[-0.035em] text-white/95">
                {page.title}
              </h2>
            </div>
            <div className="flex lg:justify-end">
              <Link href={ctaHref} className="gh2-btn-lime gh-focus-on-dark">
                {c.doctorProfile.bookConsultation}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
