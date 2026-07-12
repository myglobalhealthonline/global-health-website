import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServiceHero } from "@/components/sections/ServiceHero";
import { Stethoscope, ShieldCheck, Lock } from "lucide-react";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import {
  ChecklistSection,
  ImportantInfoSection,
  ProcessStepsSection,
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

  const { record: page } = await getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale);
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
  const [
    { record: rawPage, disabled: pageDisabled },
    services,
    doctors,
    legal,
  ] = await Promise.all([
    getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale),
    getCountryServices(code, "SPECIALIST", lang),
    getCountryDoctors(code, lang),
    getCountryLegal(code),
  ]);

  const page = (pageDisabled || !isCountryFeatureEnabled(overlay, "pages")) ? null : rawPage;

  const hub = getServiceHubContent("specialist", {
    countryName: config.name,
    locale: lang,
    serviceNames: services.map((service) => service.name),
  });
  const heroSubtitle = page?.heroSubtitle ?? hub.overview.body;

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
            title: `${services.length} · ${sp.specialistConsultationsTitle}`,
            subtitle: hub.commonReasons?.intro ?? hub.overview.body,
          },
          {
            icon: <ShieldCheck className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: `${eligibleDoctors.length} · ${sp.doctorsSectionTitle.replace("{country}", config.name)}`,
            subtitle: hub.process.steps[1].body,
          },
          {
            icon: <Lock className="size-[18px]" strokeWidth={2} aria-hidden />,
            title: hub.process.steps[3].title,
            subtitle: hub.process.steps[3].body,
          },
        ]}
        trustStats={[
          {
            icon: <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />,
            title: hub.overview.title,
            subtitle: hub.overview.body,
          },
          {
            icon: <Stethoscope className="size-5" strokeWidth={2} aria-hidden />,
            title: hub.process.title,
            subtitle: hub.process.steps[0].body,
          },
          {
            icon: <Lock className="size-5" strokeWidth={2} aria-hidden />,
            title: hub.whyChoose.title,
            subtitle: hub.whyChoose.items[1],
          },
        ]}
      />

      <ServiceIntro eyebrow={hub.overview.eyebrow} body={hub.overview.body} theme="light" />

      {/* 1 — The product: specialist consultations straight after the hero. */}
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

      <ChecklistSection {...hub.whoFor} theme="light" />
      {hub.commonReasons ? <ChecklistSection {...hub.commonReasons} theme="soft" /> : null}
      <ProcessStepsSection {...hub.process} theme="dark" />

      {/* The clinicians behind the service. */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={`${doctorItems.length} · ${sp.doctorsSectionTitle.replace("{country}", config.name)}`}
          intro={hub.process.steps[1].body}
          doctors={doctorItems}
          theme="light"
          cardTheme="dark"
        />
      ) : (
        <section className="gh2-section-ivory" style={{ padding: "clamp(64px,8vw,120px) 0" }}>
          <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">{hub.process.steps[1].title}</p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">{hub.emptyState.title}</h2>
            <p className="mt-4 max-w-[62ch] leading-relaxed text-[var(--color-text-muted)]">{hub.emptyState.body}</p>
          </div>
        </section>
      )}

      <WhyChooseSection title={hub.whyChoose.title} items={hub.whyChoose.items} theme="soft" />
      <ImportantInfoSection {...hub.importantInformation} theme="light" />

      {/* 5 — Admin-edited rich body sits below the conversion path. */}
      <RichBodySection html={page?.body} theme="light" />

      <FAQSection title={c.extra.consultFaqTitle} items={hub.faq} />

      <DoctifyReviewsSection
        theme="forest"
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
          eyebrow: hub.process.eyebrow,
          liveLabel: config.name,
          calendarLine: hasEligibleDoctor
            ? hub.process.steps[1].body
            : hub.emptyState.body,
          headlinePre: hub.process.steps[0].title,
          headlineAccent: hub.process.steps[1].title,
          headlinePost: "",
          body: hub.process.steps[2].body,
          primaryCta: ctaLabel,
          secondaryCta: sp.secondaryLabel,
        }}
      />
      <StickyBookingCTA href={ctaHref} label={ctaLabel} />
      <MedicalDisclaimer
        paragraphs={[
          ...hub.importantInformation.paragraphs.slice(0, 3),
          ...(legal?.profile?.emergencyNotice ? [legal.profile.emergencyNotice] : []),
        ]}
      />
    </>
  );
}
