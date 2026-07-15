import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServiceHero } from "@/components/sections/ServiceHero";
import { Stethoscope, ShieldCheck, Lock } from "lucide-react";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ChecklistSection,
  ServiceIntro,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { getCountryByCode } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { buildBookHref } from "@/lib/routing/book-href";
import { getSiteUrl } from "@/lib/seo/site-url";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
import { breadcrumbJsonLd, faqJsonLd, medicalServiceHubJsonLd } from "@/lib/seo/structured-data";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import {
  getPageContent,
  isSupportedLocale,
  themeProp,
  type PublicLocale,
} from "@/lib/content/get-page-content";
import {
  getCountryDoctors,
  getCountryServices,
} from "@/lib/content/get-country-collections";
import { SITE_NAME } from "@/lib/constants";
import { formatPriceRounded } from "@/lib/format-currency";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";
import { getCountryLegal } from "@/lib/content/get-country-legal";
import { getServiceHubContent } from "@/lib/content/service-hub-content";
import { selectSpecialistDoctors } from "@/lib/content/specialist-doctor-selection";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  return countryLangParams();
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

  const { record: page } = await getPageContent(code, "SPECIALIST_CONSULTATION", lang as PublicLocale);
  const hub = getServiceHubContent("specialist", {
    countryName: config.name,
    locale: lang,
    serviceNames: [],
  });
  const url = `${getSiteUrl()}/${country}/${lang}/see-a-specialist`;
  const title = page?.seoTitle ?? `${hub.overview.title} · ${config.name}`;
  const description = page?.seoDescription ?? hub.overview.body;
  return {
    title: resolveBrandTitle(title),
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/see-a-specialist") },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      ...ogLocales(config, lang),
      ...(page?.ogImageSrc ? { images: [{ url: page.ogImageSrc }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(page?.ogImageSrc ? { images: [{ url: page.ogImageSrc }] } : {}),
    },
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
  const [
    { record: rawPage, disabled: pageDisabled },
    services,
    doctors,
    legal,
  ] = await Promise.all([
    getPageContent(code, "SPECIALIST_CONSULTATION", lang as PublicLocale),
    getCountryServices(code, "SPECIALIST", lang),
    getCountryDoctors(code, lang),
    getCountryLegal(code),
  ]);

  // Structured PageContent self-gates via publish status; legacy "pages"
  // country-feature no longer gates it.
  const page = pageDisabled ? null : rawPage;

  const hub = getServiceHubContent("specialist", {
    countryName: config.name,
    locale: lang,
    serviceNames: services.map((service) => service.name),
  });
  const heroSubtitle = page?.heroSubtitle ?? sp.heroSubtitle.replace("{country}", config.name);

  // Specialist service cards — auto from Service rows where kind=SPECIALIST.
  // Each card links to the booking form WITH `?service=<slug>` so the
  // backend stamps catalogue price + triggers Stripe Checkout.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    // Two CTAs: "Learn more" opens the read-only service detail page;
    // "Book" enters the consult doctor-pick flow (cart-first booking).
    detailHref: `/${slug}/${lang}/services/${s.slug}`,
    bookHref: buildBookHref({ country: slug, lang, service: s.slug }),
    bookLabel: c.doctors.bookAppointment,
    serviceType: "specialist" as const,
    audience: undefined,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));

  const eligibleDoctors = selectSpecialistDoctors(doctors, services);
  const firstEligible = eligibleDoctors[0];
  const hasEligibleDoctor = Boolean(firstEligible);
  const ctaLabel = hasEligibleDoctor
    ? page?.ctaLabel ?? c.doctors.bookAppointment
    : sp.specialistConsultationsTitle;
  const ctaHref = hasEligibleDoctor && firstEligible
    ? page?.ctaHref ?? buildBookHref({
        country: slug,
        lang,
        service: firstEligible.serviceSlug,
        doctor: firstEligible.doctor.slug,
      })
    : services.length > 0 ? "#services" : `/${slug}/${lang}`;
  const doctorItems = eligibleDoctors.map(({ doctor: d, serviceSlug, serviceNames }) => ({
      name: d.fullName,
      title: d.specialties.length > 0 ? d.specialties.join(", ") : serviceNames.join(", ") || d.title,
      bio: d.bio ?? "",
      languages: d.languages,
      country: config.code,
      imageSrc: d.imageSrc ?? null,
      imageAltText: d.imageAltText,
      imageTitle: d.imageTitle,
      imageCaption: d.imageCaption,
      imageDescription: d.imageDescription,
      imcRegistration: d.imcRegistration,
      registrationDivision: d.registrationDivision,
      registrationVerified: d.registrationVerified,
      credentials: d.credentials,
      medicalRegistrationUrl: d.medicalRegistrationUrl,
      verificationUrl: legal?.profile?.medicalRegulatorUrl ?? undefined,
      href: `/${slug}/${lang}/doctors/${d.slug}`,
      bookingHref: buildBookHref({ country: slug, lang, service: serviceSlug, doctor: d.slug }),
      ctaLabel: c.doctors.viewProfile,
      bookLabel: c.doctors.bookAppointment,
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
      <JsonLd data={faqJsonLd(hub.faq)} />
      <JsonLd
        data={medicalServiceHubJsonLd({
          name: hub.overview.title,
          description: hub.overview.body,
          countryName: config.name,
          url: `/${slug}/${lang}/see-a-specialist`,
          bookingUrl: hasEligibleDoctor ? ctaHref : null,
        })}
      />

      <ServiceHero
        countryCode={config.code}
        countryLabel={sp.countryLabel.replace("{country}", config.name)}
        titleLead={page?.heroTitle ?? sp.heroLead}
        titleAccent={page?.heroTitle ? "" : sp.heroAccent}
        titleTrail={page?.heroTitle ? undefined : sp.heroTrail}
        lede={heroSubtitle}
        primaryCta={{ label: ctaLabel, href: ctaHref }}
        secondaryCta={{
          label: sp.secondaryLabel,
          href: `/${slug}/${lang}/doctors`,
        }}
        heroImage={{
          src: page?.heroImageSrc ?? "/images/stock/specialist.jpg",
          alt: `Specialist available for an online consultation in ${config.name}`,
          priority: true,
        }}
        featureCards={[
          {
            icon: <Stethoscope className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: sp.hero.feature1Title,
            subtitle: sp.hero.feature1Subtitle,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: sp.hero.feature2Title.replace("{country}", config.name),
            subtitle: sp.hero.feature2Subtitle.replace("{country}", config.name),
          },
          {
            icon: <Lock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: sp.hero.feature3Title,
            subtitle: sp.hero.feature3Subtitle,
          },
        ]}
        trustStats={[
          {
            icon: <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />,
            title: sp.hero.stat1Title.replace("{country}", config.name),
            subtitle: sp.hero.stat1Subtitle.replace("{country}", config.name),
          },
          {
            icon: <Stethoscope className="size-5" strokeWidth={2} aria-hidden />,
            title: sp.hero.stat2Title.replace("{country}", config.name),
            subtitle: sp.hero.stat2Subtitle.replace("{country}", config.name),
          },
          {
            icon: <Lock className="size-5" strokeWidth={2} aria-hidden />,
            title: sp.hero.stat3Title.replace("{country}", config.name),
            subtitle: sp.hero.stat3Subtitle.replace("{country}", config.name),
          },
        ]}
      />

      {/* Admin-authored structured sections (DB-backed, toggle-gated per
          country). Off by default — additive to the existing hub copy
          below, in the same GP-hub relative order (Part B.3). */}
      {page?.sections.intro ? (
        <ServiceIntro body={page.intro!} theme={themeProp(page?.introTheme, "light")} />
      ) : serviceItems.length > 0 ? (
        <ServiceIntro body={hub.overview.body} theme={themeProp(page?.introTheme, "light")} />
      ) : null}

      {/* 1 — The product: specialist consultations straight after the hero. */}
      {serviceItems.length > 0 ? (
        <div id="services" className="scroll-mt-24">
          <ServicesGrid
            eyebrow={sp.specialtyAreas}
            title={sp.specialistConsultationsTitle}
            intro={sp.specialistConsultationsIntro}
            items={serviceItems}
            variant="dark"
            previousPageLabel={c.a11y.previousPage}
            nextPageLabel={c.a11y.nextPage}
          />
        </div>
      ) : null}

      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow="Who it's for"
          title={page.whoForTitle!}
          intro={page.whoForIntro ?? undefined}
          items={page.whoForItems}
          theme={themeProp(page?.whoForTheme, "light")}
        />
      ) : (
        <ChecklistSection {...hub.whoFor} theme={themeProp(page?.whoForTheme, "light")} />
      )}

      {/* The clinicians behind the service. */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={`${doctorItems.length} · ${sp.doctorsSectionTitle.replace("{country}", config.name)}`}
          intro={sp.doctorsSectionIntro}
          doctors={doctorItems}
          theme="dark"
          previousPageLabel={c.a11y.previousPage}
          nextPageLabel={c.a11y.nextPage}
        />
      ) : null}

      {page?.sections.whyChoose ? (
        <WhyChooseSection
          title={page.whyChooseTitle!}
          items={page.whyChooseItems}
          theme={themeProp(page?.whyChooseTheme, "soft")}
        />
      ) : (
        <WhyChooseSection
          title={hub.whyChoose.title}
          items={hub.whyChoose.items}
          theme={themeProp(page?.whyChooseTheme, "soft")}
        />
      )}

      {page?.sections.faq ? (
        <FAQSection
          title={c.extra.consultFaqTitle}
          items={page.faq}
          theme={themeProp(page?.faqTheme, "dark")}
        />
      ) : (
        <FAQSection title={c.extra.consultFaqTitle} items={hub.faq} />
      )}

      <DoctifyReviewsSection
        theme="ivory"
        variant="carousel"
        language={lang}
        eyebrow={hub.whyChoose.eyebrow}
        headline={hub.whyChoose.title}
        headlineAccent=""
        body={hub.overview.body}
      />

      <FinalCTA
        primaryHref={ctaHref}
        secondaryHref={`/${slug}/${lang}/doctors`}
        i18n={{
          eyebrow: sp.specialtyAreas,
          liveLabel: config.name,
          calendarLine: sp.specialistConsultationsIntro,
          headlinePre: sp.heroLead,
          headlineAccent: sp.heroAccent,
          headlinePost: sp.heroTrail,
          body: heroSubtitle,
          primaryCta: ctaLabel,
          secondaryCta: sp.secondaryLabel,
        }}
      />
      <StickyBookingCTA href={ctaHref} label={ctaLabel} />

      {page?.sections.disclaimer ? (
        <MedicalDisclaimer
          paragraphs={page.disclaimerParagraphs}
          theme={themeProp(page?.disclaimerTheme, "dark")}
          title={c.a11y.medicalDisclaimer}
        />
      ) : null}
    </>
  );
}
