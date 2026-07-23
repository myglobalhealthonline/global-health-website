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
  faqJsonLd,
  medicalBusinessJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { DoctorCard } from "@/components/cards/DoctorCard";

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
    getCountryTrust(code),
  ]);
  if (!page) notFound();

  const bodyHtml = page.bodyHtml ? scopeBlogHtml(page.bodyHtml) : null;
  const template = page.template;
  const pageUrl = `${getSiteUrl()}/${country}/${lang}/health/${slug}`;

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
        data={medicalBusinessJsonLd({
          name: config.name,
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

      <div style={{ background: "var(--color-background-page)" }}>
      <article className="mx-auto max-w-[var(--container-width)] px-5 py-[clamp(48px,7vw,96px)] md:px-10">
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-0.02em] text-[var(--color-text-primary)]">
          {page.title}
        </h1>
        {bodyHtml ? (
          <div
            className="gh-article-body mt-8 max-w-[76ch]"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : null}

        {doctors.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-[clamp(1.4rem,2.4vw,2rem)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              Doctors who can help
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <DoctorCard
                  key={d.id}
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
                />
              ))}
            </div>
            {template?.doctorLanguage ? (
              <Link
                href={`/${country}/${lang}/doctors?lang=${encodeURIComponent(template.doctorLanguage)}`}
                className="mt-6 inline-block text-[14px] font-semibold text-[var(--color-brand-accent)] underline underline-offset-2"
              >
                See all {template.doctorLanguage}-speaking doctors
              </Link>
            ) : null}
          </section>
        ) : null}

        <section className="mt-16">
          <Link href={ctaHref} className="gh2-btn-lime inline-flex">
            Book a consultation
          </Link>
        </section>

        {page.faq && page.faq.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-[clamp(1.4rem,2.4vw,2rem)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              Frequently asked questions
            </h2>
            <div className="mt-6 space-y-5 max-w-[76ch]">
              {page.faq.map((item, idx) => (
                <div key={idx} className="border-b border-[var(--color-border-subtle)] pb-5">
                  <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {template?.related && template.related.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-[clamp(1.2rem,2vw,1.6rem)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              You might also need
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
          </section>
        ) : null}
      </article>
      </div>
    </>
  );
}
