import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/sections/PageHero";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ReviewBadge } from "@/components/sections/ReviewBadge";
import { countries, getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { buildBookHref } from "@/lib/routing/book-href";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd, medicalProcedureJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import {
  getCountryDoctors,
  getCountryServices,
} from "@/lib/content/get-country-collections";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({
    country: COUNTRY_CODE_TO_SLUG[c.code],
    lang: (c.defaultLocale ?? "EN").toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const { record: page } = await getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/see-a-specialist`;
  const title = page?.seoTitle ?? `See a Specialist in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Specialists registered to practise in ${config.name}. Cardiology, dermatology, nutrition, and more.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/see-a-specialist") },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

function formatPrice(cents: number | null, currency: string | null): string | undefined {
  if (cents == null) return undefined;
  return formatPriceRounded(cents, currency);
}

function formatDuration(minutes: number | null): string | undefined {
  if (minutes == null) return undefined;
  return `${minutes} min`;
}

export default async function CountryLangSpecialistConsultationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const { common: c } = loadLocaleBundle(lang as LocaleCode);
  const sp = c.specialistPage;

  // Honor the per-country `specialist-consultations` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "specialist-consultations")) notFound();
  const [{ record: rawPage, disabled: pageDisabled }, services, doctors] = await Promise.all([
    getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale),
    getCountryServices(code, "SPECIALIST", lang),
    getCountryDoctors(code, lang),
  ]);

  const page = (pageDisabled || !isCountryFeatureEnabled(overlay, "pages")) ? null : rawPage;

  // Provider-first defaults per Google Ads "restricted services" guidance.
  const heroTitle = page?.heroTitle ?? sp.heroTitle;
  const heroSubtitle =
    page?.heroSubtitle ?? sp.heroSubtitle.replace("{country}", config.name);
  const ctaLabel = page?.ctaLabel ?? c.doctors.bookAppointment;
  // Cart-first booking: hero CTA scrolls to the in-page service grid
  // rather than dumping into the legacy /book-online form. Admin can
  // still override via ContentPage.
  const ctaHref =
    page?.ctaHref ??
    buildBookHref({ country: slug, lang, service: services[0]?.slug ?? null });

  // Specialist service cards — auto from Service rows where kind=SPECIALIST.
  // Each card is tagged with its specialty (the category it falls under) via
  // `audience` — so specialties surface as labels on the consultations rather
  // than as a separate browse section.
  // Each card links to the booking form WITH `?service=<slug>` so the
  // backend stamps catalogue price + triggers Stripe Checkout.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    // Pickslot page lets the patient choose doctor + time, then adds
    // the consultation to the cart with the selected timeSlotId.
    href: buildBookHref({ country: slug, lang, service: s.slug }),
    serviceType: "specialist" as const,
    audience: s.specialtyName ?? undefined,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));

  // Doctor cards filtered to those with at least one specialty link.
  const doctorItems = doctors
    .filter((d) => d.specialties.length > 0)
    .slice(0, 6)
    .map((d) => ({
      name: d.fullName,
      title: d.title,
      bio: d.bio ?? "",
      languages: d.languages,
      country: config.name,
      imageSrc: d.imageSrc ?? null,
      href: `/${slug}/${lang}/doctors/${d.slug}`,
      bookingHref: buildBookHref({ country: slug, lang, doctor: d.slug }),
      whatsappNumber: d.whatsappNumber,
      ctaLabel: c.doctors.viewProfile,
    }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "See a specialist", url: `/${slug}/${lang}/see-a-specialist` },
        ])}
      />
      <JsonLd
        data={medicalProcedureJsonLd({
          name: `Specialists in ${config.name}`,
          description: `Network of specialists (cardiology, dermatology, psychiatry, nutrition, and more) registered to practise in ${config.name}.`,
          countryName: config.name,
          url: `/${slug}/${lang}/see-a-specialist`,
          bookingUrl: ctaHref,
        })}
      />

      <PageHero
        countryCode={config.code}
        countryLabel={sp.countryLabel.replace("{country}", config.name)}
        titleLead={sp.heroLead}
        titleAccent={sp.heroAccent}
        titleTrail={sp.heroTrail}
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        secondaryLabel={sp.secondaryLabel}
        secondaryHref={`/${slug}/${lang}/doctors`}
        heroImage={{
          src: "/images/stock/specialist.jpg",
          alt: `Specialist available for an online consultation in ${config.name}`,
          priority: true,
        }}
      />

      {page?.heroImageSrc ? (
        <section style={{ background: "var(--color-background-dark)" }}>
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10 -mt-16 relative">
            <div className="overflow-hidden rounded-[var(--radius-card)]" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.heroImageSrc}
                alt={heroTitle}
                className="block w-full"
                style={{ maxHeight: 480, objectFit: "cover" }}
              />
            </div>
          </div>
        </section>
      ) : null}

      <RichBodySection html={page?.body} theme="light" />

      <ReviewBadge countryName={config.name} />

      {/* Specialist service cards — auto from Service rows kind=SPECIALIST.
          Specialty = the category each consultation falls under, shown as a
          tag on the card (not a separate section). */}
      {serviceItems.length > 0 ? (
        <div id="services" className="scroll-mt-24">
          <ServicesGrid
            eyebrow={sp.specialtyAreas}
            title={sp.specialistConsultationsTitle}
            intro={sp.specialistConsultationsIntro}
            items={serviceItems}
            variant="dark"
          />
        </div>
      ) : null}

      {/* Doctor cards — only specialists shown here */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={sp.doctorsSectionTitle.replace("{country}", config.name)}
          intro={sp.doctorsSectionIntro}
          doctors={doctorItems}
          theme="light"
        />
      ) : null}

      <FinalCTA primaryHref={ctaHref} secondaryHref={`/${slug}/${lang}/doctors`} />
      <StickyBookingCTA href={ctaHref} />
    </>
  );
}
