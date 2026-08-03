import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryLandingPage, getCountryDoctors } from "@/lib/content/get-country-collections";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  countryMedicalOrganizationJsonLd,
  faqJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { doctorCardI18n } from "@/components/cards/doctor-card-i18n";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { FAQSection } from "@/components/sections/FAQSection";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

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
  const page = await getCountryLandingPage(code, slug, lang);
  if (!page) return { title: SITE_NAME };
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? `Learn about ${page.title} in ${config?.name ?? country}.`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/health/${slug}`,
    title,
    description,
    type: "article",
    kind: "article",
    subtitle: config?.name,
    imageAlt: `${page.title} — ${config?.name ?? country}`,
    locale: config ? ogLocales(config, lang).locale : undefined,
    languages: config ? hreflangAlternates(config, `/health/${slug}`) : undefined,
  });
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

  const [page, countryTrust] = await Promise.all([
    getCountryLandingPage(code, slug, lang),
    getCountryTrust(code, lang as LocaleCode),
  ]);
  if (!page) notFound();

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
          { name: config.name, url: `/${country}/${lang}` },
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

      {/* Header + body — ivory band, same rhythm as the service page's
          "About this service" section. */}
      <section className="gh-inline-clamp-section gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
            {config.name}
          </p>
          <h1 className="mt-3 max-w-[20ch] text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {page.title}
          </h1>
          {bodyHtml ? (
            <div
              className="gh2-card-ivory gh-article-body mt-8 max-w-[76ch] border-t-2 border-t-[rgba(176,241,34,0.24)] p-6 md:p-8"
              // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml -- bodyHtml = scopeBlogHtml(page.bodyHtml), sanitize-html with a controlled allowlist.
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : null}
          <div className="mt-8">
            <Link href={ctaHref} className="gh2-btn-lime inline-flex items-center gap-2">
              {c.doctorProfile.bookConsultation}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {doctors.length > 0 ? (
        <section className="gh-inline-clamp-section gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <h2 className="max-w-[20ch] text-[clamp(1.9rem,3.5vw,2.8rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--color-text-primary)]">
              {c.gpPage.doctorsSectionTitle.replace("{country}", config.name)}
            </h2>
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
        <FAQSection title={c.serviceDetailPage.faqTitle} items={page.faq} theme="light" />
      ) : null}

      {template?.related && template.related.length > 0 ? (
        <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
          <SectionSeam theme="light" />
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <h2 className="text-[clamp(1.2rem,2vw,1.6rem)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              {c.serviceDetailPage.relatedTopicsTitle}
            </h2>
            <ul className="mt-4 space-y-2">
              {template.related.map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    className="text-[15px] font-medium text-[var(--color-brand-accent)] underline underline-offset-2"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

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
