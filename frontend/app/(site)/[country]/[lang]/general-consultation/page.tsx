import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { PageHero } from "@/components/sections/PageHero";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FinalCTA } from "@/components/sections/FinalCTA";
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
import { getSiteUrl } from "@/lib/seo/site-url";
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

  const page = await getPublicPage(code, "GENERAL_CONSULTATION", lang as PublicLocale);
  const hub = getGpHubContent(code);
  const url = `${getSiteUrl()}/${country}/${lang}/gp-appointment`;
  const title =
    page?.seoTitle ?? hub?.seoTitle ?? `Book a GP Appointment in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    hub?.seoDescription ??
    `General practitioners registered to practise in ${config.name}.`;
  // The authored hub title already carries the "| Global Health" brand, so
  // bypass the layout's "%s · Global Health" template to avoid doubling it.
  const useAbsoluteTitle = !page?.seoTitle && !!hub;
  return {
    title: useAbsoluteTitle ? { absolute: title } : title,
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

  // Honor the per-country `general-consultations` toggle from /admin/country-features.
  const overlay = await getPublicCountryByCode(code);
  if (!isCountryFeatureEnabled(overlay, "general-consultations")) notFound();

  const [page, services, doctors] = await Promise.all([
    getPublicPage(code, "GENERAL_CONSULTATION", lang as PublicLocale),
    getCountryServices(code, "GENERAL", lang),
    getCountryDoctors(code),
  ]);

  // Long-form GP positioning copy (Ireland only for now). When present it
  // reshapes the hero headline and adds the marketing / FAQ / disclaimer
  // sections below the doctor + service grids.
  const gpHub = getGpHubContent(code);

  // Provider-first defaults per Google Ads "restricted services" guidance.
  // Admin can override via the ContentPage row when localised copy lands.
  const heroTitle = page?.heroTitle ?? "Meet our general practitioners";
  const heroSubtitle =
    page?.heroSubtitle ?? `General practitioners registered to practise in ${config.name}.`;
  const ctaLabel = page?.ctaLabel ?? (gpHub ? "Book a consultation" : "Meet the doctors");
  // Hero headline composition: GP hub copy takes over the lead/accent for
  // markets with authored copy; generic "Meet our licensed doctors."
  // elsewhere.
  const heroLead = gpHub ? gpHub.h1Lead : "Meet our";
  const heroAccent = gpHub ? gpHub.h1Accent : "licensed";
  const heroTrail = gpHub ? undefined : "doctors.";
  // Cart-first booking: hero CTA jumps to the in-page service list
  // instead of the legacy /book-online form. Admin can still override
  // via the ContentPage row.
  const ctaHref = page?.ctaHref ?? "#services";

  // Map Service rows to the ServicesGrid card shape. Cards auto-appear when
  // admin adds a Service row of kind=GENERAL for this country.
  // Each service card links to the booking form WITH `?service=<slug>`
  // so the backend resolves the catalogue price + triggers Stripe Checkout.
  // Without this the priced services would never actually charge.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    // Pickslot page lets the patient choose doctor + time, then adds
    // the consultation to the cart with the selected timeSlotId.
    href: `/${slug}/${lang}/consult/${encodeURIComponent(s.slug)}`,
    serviceType: "general" as const,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));

  // Doctor cards — admin adding a Doctor row for this country adds a card.
  const doctorItems = doctors.slice(0, 12).map((d) => ({
    name: d.fullName,
    title: d.title,
    bio: d.bio ?? "",
    languages: d.languages,
    country: config.name,
    imageSrc: d.imageSrc ?? null,
    href: `/${slug}/${lang}/doctors/${d.slug}`,
    // Book → THIS doctor's profile, scrolled to their services. The
    // profile page always renders an `id="services"` anchor.
    bookingHref: `/${slug}/${lang}/doctors/${d.slug}#services`,
    whatsappNumber: d.whatsappNumber,
    ctaLabel: "View profile",
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
        countryCode={config.code}
        countryLabel={
          gpHub ? `${config.name} · Online GP consultation` : `${config.name} · General practitioners`
        }
        titleLead={heroLead}
        titleAccent={heroAccent}
        titleTrail={heroTrail}
        lede={heroSubtitle}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        secondaryLabel="View profiles"
        secondaryHref={`/${slug}/${lang}/doctors`}
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

      {gpHub ? (
        <>
          <ServiceIntro body={gpHub.intro} theme="light" />
          <ChecklistSection
            eyebrow="Who it's for"
            title={gpHub.whoFor.title}
            intro={gpHub.whoFor.intro}
            items={gpHub.whoFor.items}
            theme="soft"
          />
        </>
      ) : null}

      <ReviewBadge countryName={config.name} />

      <TrustRibbon theme="light" />

      {/* Service cards — auto from Service rows where kind=GENERAL, country=X */}
      {serviceItems.length > 0 ? (
        <div id="services" className="scroll-mt-24">
          <ServicesGrid
            eyebrow="Practice areas"
            title="General practitioners available"
            intro={`${serviceItems.length} ${serviceItems.length === 1 ? "doctor" : "doctors"} currently in our ${config.name} network. Profiles update as the team adds or retires clinicians.`}
            items={serviceItems}
            variant="dark"
          />
        </div>
      ) : null}

      {/* Doctor cards — auto from Doctor rows for this country */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={`Doctors in ${config.name}`}
          intro="Licensed GPs available for online consultations. Each profile lists qualifications, languages, and registration."
          doctors={doctorItems}
          theme="light"
        />
      ) : null}

      {gpHub ? (
        <>
          <WhyChooseSection
            title={gpHub.whyChoose.title}
            items={gpHub.whyChoose.items}
            theme="light"
          />
          <FAQSection title="Frequently asked questions" items={gpHub.faq} />
        </>
      ) : null}

      <FinalCTA primaryHref={ctaHref} secondaryHref={`/${slug}/${lang}/doctors`} />

      {gpHub ? <MedicalDisclaimer paragraphs={gpHub.disclaimerFull} /> : null}
    </>
  );
}
