import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Globe2,
  Languages,
  Stethoscope,
  Video,
} from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  getCountryAbout,
  getCountryContact,
  resolveAboutCopy,
  type AboutCopyTemplates,
} from "@/lib/content/country-about";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { FAQSection } from "@/components/sections/FAQSection";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  countryMedicalOrganizationJsonLd,
  faqJsonLd,
} from "@/lib/seo/structured-data";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { buildBookHref } from "@/lib/routing/book-href";

export const revalidate = 300;

type Params = { country: string; lang: string };

/**
 * Route params → country config, market facts and locale-resolved copy.
 * The config comes from the live merge (not the static seed) because the
 * "what we offer" list is driven by that market's enabled features.
 */
async function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = (await getPublicCountryByCode(code)) ?? getCountryByCode(code);
  const contact = getCountryContact(code);
  const about = getCountryAbout(code);
  if (!config || !contact || !about) return null;
  const t = loadLocaleBundle(lang as LocaleCode).about.country as unknown as AboutCopyTemplates;
  // Market name in the page's own language ("Brasil", "Česko"), not the
  // English seed name. Schema keeps the English name — it names the entity.
  const countryName =
    getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  return {
    code,
    config,
    contact,
    about,
    countryName,
    copy: resolveAboutCopy(config, contact, about, t, countryName),
    t,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) return { title: SITE_NAME };
  const { config, copy } = resolved;

  return buildPublicMetadata({
    path: `/${country}/${lang}/about`,
    title: copy.title,
    description: copy.description,
    // The title already carries the brand; the layout suffix would push it
    // past the ~60-char display budget for no gain.
    brandSuffix: false,
    type: "website",
    kind: "corporate",
    subtitle: config.name,
    sourceImage: "/images/stock/about.jpg",
    imageAlt: `${copy.h1}`,
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/about"),
  });
}

export default async function CountryAboutPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { config, contact, copy, countryName, t } = resolved;

  const office = contact.office;
  const base = `/${country}/${lang}`;
  const bookHref = buildBookHref({ country, lang });

  return (
    <section>
      <JsonLd
        data={countryMedicalOrganizationJsonLd({
          name: config.name,
          slug: config.slug || country,
          url: `${base}/about`,
          regulator: contact.regulator,
          // Registered office only, never LocalBusiness — see country-contact.ts.
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
      <JsonLd data={faqJsonLd(copy.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: countryName, url: base },
          { name: t.breadcrumb, url: `${base}/about` },
        ])}
      />

      {/* DARK — hero, same primitive and rhythm as the country contact page */}
      <PageHero
        countryCode={config.code}
        countryLabel={`${SITE_NAME} · ${countryName}`}
        watermark={t.watermark}
        titleLead={copy.h1}
        titleAccent=""
        lede={copy.intro}
        ctaLabel={t.ctaBook}
        ctaHref={bookHref}
        secondaryLabel={t.ctaDoctors}
        secondaryHref={`${base}/doctors`}
        trustCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.trustDoctorsTitle,
            subtitle: contact.regulator.name,
          },
          {
            icon: <Languages className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: t.trustLanguagesTitle,
            subtitle: copy.languageNames.join(" · "),
          },
          office
            ? {
                icon: <Building2 className="size-[18px]" strokeWidth={2} aria-hidden />,
                title: t.trustBaseTitle,
                subtitle: `${office.locality}, ${office.countryName}`,
              }
            : {
                icon: <Video className="size-[18px]" strokeWidth={2} aria-hidden />,
                title: t.trustOnlineTitle,
                subtitle: t.trustOnlineSubtitle.replace("{country}", countryName),
              },
        ]}
        mobileBgSrc="/images/stock/about.jpg"
      />

      {/* LIGHT — what this market can actually book */}
      <section className="relative gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] gh-section px-5 md:px-10">
          <h2
            className="text-2xl font-extrabold tracking-[-0.015em]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {copy.offerHeading}
          </h2>
          <p
            className="mt-4 max-w-[62ch] text-[16px] leading-[1.7]"
            style={{ color: "var(--color-text-body)" }}
          >
            {copy.offerBody}
          </p>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {copy.offerings.map((offering, i) => (
              <article key={offering.key}>
                <span
                  className="text-xs font-bold uppercase tracking-[0.16em] [font-variant-numeric:tabular-nums]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="mt-4 text-xl font-extrabold tracking-[-0.015em]"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {offering.title}
                </h3>
                <p
                  className="mt-3 max-w-[42ch] text-[16px] leading-[1.7]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {offering.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link href={bookHref} className="gh2-btn gh2-btn-primary">
              {t.ctaBook}
            </Link>
            <Link href={`${base}/contact`} className="gh2-btn gh2-btn-ghost">
              {t.ctaContact}
            </Link>
          </div>
        </div>
      </section>

      {/* DARK — languages, then who is behind the market */}
      <section className="relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto max-w-[var(--container-width)] gh-section px-5 md:px-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-white/92">
                {copy.languagesHeading}
              </h2>
              <p className="mt-4 max-w-[52ch] text-[16px] leading-[1.7] text-white/70">
                {copy.languagesBody}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {copy.languageNames.map((name) => (
                  <li
                    key={name}
                    className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/90"
                    style={{
                      background: "rgba(176,241,34,0.10)",
                      border: "1px solid rgba(176,241,34,0.18)",
                    }}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-white/92">
                {copy.whoHeading}
              </h2>
              <p className="mt-4 max-w-[52ch] text-[16px] leading-[1.7] text-white/70">
                {copy.whoBody}
              </p>
              <p className="mt-4 text-[15px]">
                <a
                  href={contact.regulator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium underline underline-offset-2"
                  style={{ color: "var(--color-brand-accent)" }}
                >
                  <BadgeCheck className="size-4" strokeWidth={1.75} aria-hidden />
                  {contact.regulator.name}
                </a>
              </p>
              {/* The one link back up to the global company page. */}
              <p className="mt-3 text-[15px]">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 font-medium underline underline-offset-2"
                  style={{ color: "var(--color-brand-accent)" }}
                >
                  <Globe2 className="size-4" strokeWidth={1.75} aria-hidden />
                  {t.globalLinkLabel}
                  <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <FAQSection title={copy.faqHeading} items={copy.faqs} theme="light" eyebrow={t.faqEyebrow} />
    </section>
  );
}
