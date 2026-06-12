import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { PageHero } from "@/components/sections/PageHero";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ReviewBadge } from "@/components/sections/ReviewBadge";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ServiceIntro,
  ChecklistSection,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { getGpHubContent } from "@/lib/content/ireland-service-content";
import { countries, getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { buildBookHref } from "@/lib/routing/book-href";
import { getSiteUrl } from "@/lib/seo/site-url";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd, medicalProcedureJsonLd, faqJsonLd } from "@/lib/seo/structured-data";
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

  const { record: page } = await getPublicPage(code, "GENERAL_CONSULTATION", lang as PublicLocale);
  const hub = getGpHubContent(code);
  const url = `${getSiteUrl()}/${country}/${lang}/gp-appointment`;
  const title =
    page?.seoTitle ?? hub?.seoTitle ?? `General practitioners registered in ${config.name}`;
  const description =
    page?.seoDescription ??
    hub?.seoDescription ??
    `General practitioners registered to practise in ${config.name}. View credentials and languages, then book a consultation.`;
  return {
    // resolveBrandTitle returns an absolute title when the (CMS- or hub-)
    // authored title already contains the brand, so the layout's
    // "%s · Global Health" template never doubles it.
    title: resolveBrandTitle(title),
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/gp-appointment") },
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

export default async function CountryLangGeneralConsultationPage({
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
  const gp = c.gpPage;

  // Honor the per-country `general-consultations` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "general-consultations")) notFound();
  const [{ record: rawPage, disabled: pageDisabled }, services, doctors] = await Promise.all([
    getPublicPage(code, "GENERAL_CONSULTATION", lang as PublicLocale),
    getCountryServices(code, "GENERAL", lang),
    getCountryDoctors(code, lang),
  ]);

  const page = (pageDisabled || !isCountryFeatureEnabled(overlay, "pages")) ? null : rawPage;

  // Long-form GP positioning copy (Ireland only for now). When present it
  // reshapes the hero headline and adds the marketing / FAQ / disclaimer
  // sections below the doctor + service grids.
  const gpHub = getGpHubContent(code);

  // Provider-first defaults per Google Ads "restricted services" guidance.
  // Admin can override via the ContentPage row when localised copy lands.
  const heroTitle = page?.heroTitle ?? gp.heroTitle;
  const heroSubtitle =
    page?.heroSubtitle ?? gp.heroSubtitle.replace("{country}", config.name);
  const ctaLabel = page?.ctaLabel ?? c.doctors.bookAppointment;
  // Hero headline composition: GP hub copy takes over the lead/accent for
  // markets with authored copy; generic "Meet our licensed doctors."
  // elsewhere.
  const heroLead = gpHub ? gpHub.h1Lead : gp.heroLead;
  const heroAccent = gpHub ? gpHub.h1Accent : gp.heroAccent;
  const heroTrail = gpHub ? undefined : gp.heroTrail;
  // Cart-first booking: hero CTA jumps to the in-page service list
  // instead of the legacy /book-online form. Admin can still override
  // via the ContentPage row.
  const ctaHref =
    page?.ctaHref ??
    buildBookHref({ country: slug, lang, service: services[0]?.slug ?? null });

  // Map Service rows to the ServicesGrid card shape. Cards auto-appear when
  // admin adds a Service row of kind=GENERAL for this country.
  // Each service card links to the booking form WITH `?service=<slug>`
  // so the backend resolves the catalogue price + triggers Stripe Checkout.
  // Without this the priced services would never actually charge.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    // Two CTAs: "Learn more" opens the read-only service detail page;
    // "Book" enters the consult doctor-pick flow (cart-first booking).
    detailHref: `/${slug}/${lang}/services/${s.slug}`,
    bookHref: `/${slug}/${lang}/consult/${s.slug}`,
    bookLabel: c.doctors.bookAppointment,
    serviceType: "general" as const,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));

  // Doctor cards — admin adding a Doctor row for this country adds a card.
  const doctorItems = doctors.slice(0, 6).map((d) => ({
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
          { name: "GP appointment", url: `/${slug}/${lang}/gp-appointment` },
        ])}
      />
      <JsonLd
        data={medicalProcedureJsonLd({
          name: `General practitioners in ${config.name}`,
          description: `Network of general practitioners registered to practise in ${config.name}. Profiles include credentials, specialties and languages.`,
          countryName: config.name,
          url: `/${slug}/${lang}/gp-appointment`,
          bookingUrl: ctaHref,
        })}
      />

      {/* Hero — dark editorial, shared with every inner page. Admin
        * copy still takes precedence via the heroTitle / heroSubtitle
        * overrides; titleAccent is the only place we baked in the
        * page-type-specific italic word. */}
      {gpHub ? (
        <JsonLd data={faqJsonLd(gpHub.faq)} />
      ) : null}

      <PageHero
        watermark="GP consultation"
        countryCode={config.code}
        countryLabel={
          gpHub
            ? gp.countryLabelGp.replace("{country}", config.name)
            : gp.countryLabelGeneral.replace("{country}", config.name)
        }
        titleLead={heroLead}
        titleAccent={heroAccent}
        titleTrail={heroTrail}
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        secondaryLabel={gp.secondaryLabel}
        secondaryHref={`/${slug}/${lang}/doctors`}
        variant="immersive"
        heroImage={{
          src: "/images/stock/gp.jpg",
          alt: `General practitioner available for an online consultation in ${config.name}`,
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

      {/* 1 — What this is: short authored positioning intro (when present). */}
      {gpHub ? <ServiceIntro body={gpHub.intro} theme="light" /> : null}

      {/* 2 — The product: bookable GP consultations, straight after the hero
          so the offer is visible before any supporting copy. */}
      {serviceItems.length > 0 ? (
        <div id="services" className="scroll-mt-24">
          <ServicesGrid
            eyebrow={gp.practiceAreas}
            title={gp.gpConsultationsTitle}
            intro={gp.gpConsultationsIntro
              .replace("{count}", String(serviceItems.length))
              .replace("{consultation}", serviceItems.length === 1 ? gp.consultation : gp.consultations)
              .replace("{country}", config.name)}
            items={serviceItems}
            variant="dark"
          />
        </div>
      ) : null}

      {/* Who it's for (authored hub copy, when present). */}
      {gpHub ? (
        <ChecklistSection
          eyebrow="Who it's for"
          title={gpHub.whoFor.title}
          intro={gpHub.whoFor.intro}
          items={gpHub.whoFor.items}
          theme="light"
        />
      ) : null}

      {/* 5 — Trust: review badge, then the clinicians behind the service. */}
      <ReviewBadge countryName={config.name} />

      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={gp.doctorsSectionTitle.replace("{country}", config.name)}
          intro={gp.doctorsSectionIntro}
          doctors={doctorItems}
          theme="light"
        />
      ) : null}

      {gpHub ? (
        <WhyChooseSection
          title={gpHub.whyChoose.title}
          items={gpHub.whyChoose.items}
          theme="soft"
        />
      ) : null}

      {/* 7 — Admin-edited rich body (SEO/long-form) sits below the
          conversion path instead of interrupting it. */}
      <RichBodySection html={page?.body} theme="light" />

      {/* 8 — FAQs + closing CTA. */}
      {gpHub ? <FAQSection title={gp.faqTitle} items={gpHub.faq} /> : null}

      <FinalCTA primaryHref={ctaHref} secondaryHref={`/${slug}/${lang}/doctors`} />
      <StickyBookingCTA href={ctaHref} />

      {gpHub ? <MedicalDisclaimer paragraphs={gpHub.disclaimerFull} /> : null}
    </>
  );
}
