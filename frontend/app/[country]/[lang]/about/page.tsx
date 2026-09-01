import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FlaskConical,
  Globe2,
  Languages,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import {
  entitySentence,
  getCountryAbout,
  getCountryContact,
  resolveAboutCopy,
  type AboutCopyTemplates,
  type AboutOfferingKey,
} from "@/lib/content/country-about";
import { formatOffice } from "@/lib/content/country-contact";
import { SITE_NAME } from "@/lib/constants";
import { PageHero } from "@/components/sections/PageHero";
import { AboutArchPanel, Pillar } from "@/components/sections/AboutBlocks";
import { SectionSeam } from "@/components/ui/SectionSeam";
import { FAQSection } from "@/components/sections/FAQSection";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";
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
import { irelandStaticPageSeo } from "@/lib/content/ireland-static-page-seo";
import { czechiaStaticPageSeo } from "@/lib/content/czechia-static-page-seo";

export const revalidate = 300;

type Params = { country: string; lang: string };

/** Offering → its pillar icon. Same icon set as the global /about pillars. */
const OFFERING_ICON: Record<AboutOfferingKey, React.ReactNode> = {
  gp: <Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />,
  certificates: <ClipboardCheck className="size-5" strokeWidth={1.5} aria-hidden />,
  specialist: <BadgeCheck className="size-5" strokeWidth={1.5} aria-hidden />,
  labTests: <FlaskConical className="size-5" strokeWidth={1.5} aria-hidden />,
  plans: <Sparkles className="size-5" strokeWidth={1.5} aria-hidden />,
};

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
  const countryName = getCommonLocale(lang as LocaleCode).countryNames?.[code] ?? config.name;
  const baseCopy = resolveAboutCopy(config, contact, about, t, countryName);
  const irelandSeo = code === "ie" ? irelandStaticPageSeo("ABOUT", lang as LocaleCode) : null;
  const czechiaSeo = czechiaStaticPageSeo(code, lang, "about");
  return {
    code,
    config,
    contact,
    about,
    countryName,
    copy: czechiaSeo
      ? { ...baseCopy, ...czechiaSeo }
      : irelandSeo
        ? { ...baseCopy, ...irelandSeo }
        : baseCopy,
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
  const { config, copy, countryName } = resolved;

  const metadata = buildPublicMetadata({
    path: `/${country}/${lang}/about`,
    title: copy.title,
    description: copy.description,
    // The title already carries the brand; the layout suffix would push it
    // past the ~60-char display budget for no gain.
    brandSuffix: false,
    type: "website",
    kind: "corporate",
    subtitle: countryName,
    sourceImage: "/images/stock/about.jpg",
    imageAlt: copy.h1,
    locale: ogLocales(config, lang).locale,
    languages: hreflangAlternates(config, "/about"),
  });
  const czechiaSeo = czechiaStaticPageSeo(resolved.code, lang, "about");
  return czechiaSeo ? { ...metadata, title: { absolute: czechiaSeo.title } } : metadata;
}

export default async function CountryAboutPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = await resolve(country, lang);
  if (!resolved) notFound();
  const { config, contact, about, copy, countryName, t } = resolved;

  const office = contact.office;
  const base = `/${country}/${lang}`;
  const bookHref = buildBookHref({ country, lang });
  const heroAlt = t.heroImageAlt.replace("{country}", countryName);
  const { about: aboutBundle } = loadLocaleBundle(lang as LocaleCode);

  // Market facts, in the visitor's language. Registry/regulator strings are
  // proper nouns and stay as published — translating a register's name would
  // make it unverifiable.
  const facts: Array<{ label: string; value: string; href?: string }> = [
    { label: t.factRegulator, value: contact.regulator.name, href: contact.regulator.url },
    office
      ? { label: t.factOffice, value: formatOffice(office) }
      : { label: t.factOnlineLabel, value: t.trustOnlineSubtitle.replace("{country}", countryName) },
    { label: t.factLanguages, value: copy.languageNames.join(" · ") },
    { label: t.factPhone, value: contact.phoneDisplay, href: `tel:${contact.phoneE164}` },
    { label: t.factEmail, value: contact.email, href: `mailto:${contact.email}` },
    { label: t.factOperator, value: entitySentence(about, t) },
  ];

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

      {/* DARK — hero. Same anatomy as the global /about hero: plus-masked
          photo panel with floating badges on the right, trust cards below
          the CTAs. The badges carry this market's facts, not generic ones. */}
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
        rightSlot={
          <AboutArchPanel
            src="/images/stock/about.jpg"
            alt={heroAlt}
            floats={[
              {
                icon: <BadgeCheck className="size-4" strokeWidth={2} aria-hidden />,
                title: t.trustDoctorsTitle,
                subtitle: contact.regulator.name,
              },
              {
                icon: <Languages className="size-4" strokeWidth={2} aria-hidden />,
                title: t.trustLanguagesTitle,
                subtitle: copy.languageNames.join(" · "),
              },
              office
                ? {
                    icon: <Building2 className="size-4" strokeWidth={2} aria-hidden />,
                    title: t.trustBaseTitle,
                    subtitle: `${office.locality}, ${office.countryName}`,
                  }
                : {
                    icon: <Video className="size-4" strokeWidth={2} aria-hidden />,
                    title: t.trustOnlineTitle,
                    subtitle: t.trustOnlineSubtitle.replace("{country}", countryName),
                  },
            ]}
          />
        }
        mobileBgSrc="/images/stock/about.jpg"
      />

      {/* LIGHT — what this market can actually book, as the /about pillars */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-primary)]">
            {t.offerEyebrow}
          </p>
          <h2 className="mt-3 max-w-[20ch] text-[clamp(2rem,4vw+0.5rem,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {copy.offerHeading}
          </h2>
          <p className="mt-6 max-w-[62ch] text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-muted)]">
            {copy.offerBody}
          </p>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {copy.offerings.map((offering, i) => (
              <Pillar
                key={offering.key}
                icon={OFFERING_ICON[offering.key]}
                eyebrow={String(i + 1).padStart(2, "0")}
                title={offering.title}
                body={offering.body}
              />
            ))}
          </div>

          <div className="mt-14 flex flex-wrap gap-3">
            <Link href={bookHref} className="gh-btn gh-btn-primary">
              {t.ctaBook}
              <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
            </Link>
            <Link href={`${base}/contact`} className="gh-btn gh-btn-outline">
              {t.ctaContact}
            </Link>
          </div>
        </div>
      </section>

      {/* DARK — languages, in the /about mission layout */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest">
        <SectionSeam theme="dark" />
        <div className="mx-auto grid max-w-[var(--container-width)] gap-12 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]">
              {t.languagesEyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white/92">
              {copy.languagesHeading}
            </h2>
            <ul className="mt-7 flex flex-wrap gap-2">
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
          <div className="space-y-5 text-[length:var(--text-body)] leading-relaxed text-white/70">
            <p>{copy.languagesBody}</p>
            <p className="font-medium text-white/90">{copy.whoBody}</p>
            <p className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-[15px]">
              <a
                href={contact.regulator.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium underline underline-offset-4"
                style={{ color: "var(--color-brand-accent)" }}
              >
                <BadgeCheck className="size-4" strokeWidth={1.75} aria-hidden />
                {contact.regulator.name}
              </a>
              {/* The one link back up to the whole company. The global /about
                  page it used to point at was retired on 2026-08-15 (it carried
                  no country signal and 301s here-ish now — next.config.ts), so
                  this is the entry gate, which is what "worldwide" means today:
                  every market we operate in, one hop away. */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-medium underline underline-offset-4"
                style={{ color: "var(--color-brand-accent)" }}
              >
                <Globe2 className="size-4" strokeWidth={1.75} aria-hidden />
                {t.globalLinkLabel}
                <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden />
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* LIGHT — market facts, same definition list as the global /about */}
      <section className="gh-inline-clamp-section-pricing relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel">
        <SectionSeam theme="light" />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p className="gh-eyebrow text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
            {t.factsEyebrow}
          </p>
          <h2 className="mt-3 max-w-[18ch] text-[clamp(1.75rem,3vw+0.5rem,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">
            {t.factsHeading.replace("{country}", countryName)}
          </h2>
          <dl className="mt-12 grid gap-x-12 sm:grid-cols-2">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="grid gap-1 border-t border-[rgba(29,75,54,0.12)] py-5 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-6"
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">
                  {fact.label}
                </dt>
                <dd className="text-[length:var(--text-body)] leading-relaxed text-[var(--color-text-primary)]">
                  {fact.href ? (
                    <a
                      href={fact.href}
                      {...(fact.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="underline decoration-[rgba(29,75,54,0.3)] underline-offset-4 transition-colors hover:decoration-[var(--color-brand-primary)]"
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

      <FAQSection title={copy.faqHeading} items={copy.faqs} theme="dark" eyebrow={t.faqEyebrow} />

      {/* Doctify — independent verified patient reviews, as on /about */}
      <DoctifyReviewsSection
        theme="ivory"
        variant="grid"
        language={lang as LocaleCode}
        headline={aboutBundle.doctify_headline}
        headlineAccent={aboutBundle.doctify_headline_accent}
      />
    </section>
  );
}
