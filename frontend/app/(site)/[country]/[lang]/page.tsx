import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeHero, type LiveDoctorItem } from "@/components/sections/HomeHero";
import { TrustRibbon, type TrustRibbonItem } from "@/components/sections/TrustRibbon";
import {
  ServiceCatalog,
  type ServiceCatalogItem,
} from "@/components/sections/ServiceCatalog";
import { DoctorCarousel, type DoctorCarouselItem } from "@/components/sections/DoctorCarousel";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { CountryMarquee, type MarqueeCountry } from "@/components/sections/CountryMarquee";
import { StatsBand, type StatBandItem } from "@/components/sections/StatsBand";
import { HowItWorksNarrative } from "@/components/sections/HowItWorksNarrative";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ReviewBadge } from "@/components/sections/ReviewBadge";
import { countries } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { buildBookHref } from "@/lib/routing/book-href";
import {
  breadcrumbJsonLd,
  medicalBusinessJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { resolveBrandTitle } from "@/lib/seo/page-seo";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import {
  getPublicPage,
  isSupportedLocale,
  type PublicLocale,
} from "@/lib/content/get-public-page";
import {
  getCountryDoctors,
  getCountryHealthTests,
  getCountryServices,
  getCountryPartners,
  type CountryServiceCard,
} from "@/lib/content/get-country-collections";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { VerifiedProfessionals } from "@/components/sections/VerifiedProfessionals";
import { PartnersMarquee } from "@/components/sections/PartnersMarquee";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; lang: string };

export async function generateStaticParams(): Promise<Params[]> {
  const out: Params[] = [];
  for (const c of countries) {
    const slug = COUNTRY_CODE_TO_SLUG[c.code];
    const defaultLocale = c.defaultLocale?.toLowerCase() ?? "en";
    out.push({ country: slug, lang: defaultLocale });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  if (!code) return { title: SITE_NAME };
  const config = await getPublicCountryByCode(code);
  if (!config) return { title: SITE_NAME };
  if (!isSupportedLocale(lang)) return { title: SITE_NAME };

  const { record: page } = await getPublicPage(code, "HOME", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}`;
  const title =
    page?.seoTitle ?? `${config.name} — registered doctors and specialists`;
  const description =
    page?.seoDescription ??
    `Licensed doctors and specialists registered to practise in ${config.name}. View profiles, credentials, specialties and languages.`;
  return {
    title: resolveBrandTitle(title),
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "") },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      ...(page?.ogImage?.src ? { images: [{ url: page.ogImage.src }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p && !/^Dr\.?$/i.test(p));
  if (parts.length === 0) return "·";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "·";
}

function mapServiceToCatalogItem(
  s: CountryServiceCard,
  hrefs: { detailHref: string; bookHref: string },
  labels: { general: string; specialist: string; min: string },
): ServiceCatalogItem {
  return {
    type: s.kind === "GENERAL" ? "general" : "specialist",
    title: s.name,
    tag: s.kind === "GENERAL" ? labels.general : labels.specialist,
    price: s.basePriceCents == null ? null : Math.round(s.basePriceCents / 100),
    currency: s.currencyCode ?? "EUR",
    dur: s.durationMinutes != null ? `${s.durationMinutes} ${labels.min}` : "—",
    // "Learn more" → service detail page; "Book" → consult doctor-pick.
    // `href` kept as the single-CTA fallback (= book) for safety.
    href: hrefs.bookHref,
    detailHref: hrefs.detailHref,
    bookHref: hrefs.bookHref,
    imageSrc: s.imageSrc ?? null,
  };
}

function mapCategoryTile(input: {
  type: "prescription" | "test";
  title: string;
  tag: string;
  price: number | null;
  currency?: string;
  dur: string;
  href: string;
  imageSrc?: string | null;
}): ServiceCatalogItem {
  return {
    type: input.type,
    title: input.title,
    tag: input.tag,
    price: input.price,
    currency: input.currency,
    dur: input.dur,
    href: input.href,
    imageSrc: input.imageSrc ?? null,
  };
}

export default async function CountryLangHomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country: slug, lang } = await params;
  const { home: t, services: tServices, common: cc } = loadLocaleBundle(lang as LocaleCode);
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = await getPublicCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();
  const bookHref = buildBookHref({ country: slug, lang });
  const doctorsHref = `/${slug}/${lang}/doctors`;

  const [
    { record: rawPage, disabled: pageDisabled },
    countryDoctors,
    generalServices,
    specialistServices,
    prescriptionServices,
    healthTests,
    allDoctors,
    countryTrust,
    countryPartners,
  ] =
    await Promise.all([
      getPublicPage(code, "HOME", lang as PublicLocale),
      getCountryDoctors(code, lang),
      getCountryServices(code, "GENERAL", lang),
      getCountryServices(code, "SPECIALIST", lang),
      getCountryServices(code, "PRESCRIPTION", lang),
      getCountryHealthTests(code, lang),
      getPublicDoctorsNormalized(lang),
      getCountryTrust(code),
      getCountryPartners(code),
    ]);

  // Country regulator's public verification page (medicalcouncil.ie /
  // ordemdosmedicos.pt) — every doctor card links here so patients can
  // verify the named clinician against the official register.
  const verifyUrl = doctorVerificationUrl(countryTrust) ?? undefined;

  // Null out CMS content when the page entry is disabled or the "pages"
  // feature is toggled off — structural sections still render with defaults.
  const page = (pageDisabled || !isCountryFeatureEnabled(config, "pages")) ? null : rawPage;

  const totalDoctorsAcrossEurope = allDoctors.length;

  const prescriptionsHref = `/${slug}/${lang}/prescriptions`;
  const testsHref = `/${slug}/${lang}/tests`;
  const catalogLabels = {
    general: cc.homeCatalog.tagGeneral,
    specialist: cc.homeCatalog.tagSpecialist,
    min: cc.extra.minSuffix,
  };
  const serviceCatalogItems: ServiceCatalogItem[] = [
    ...generalServices.map((s) =>
      mapServiceToCatalogItem(s, {
        detailHref: `/${slug}/${lang}/services/${s.slug}`,
        bookHref: `/${slug}/${lang}/consult/${s.slug}`,
      }, catalogLabels),
    ),
    ...specialistServices.map((s) =>
      mapServiceToCatalogItem(s, {
        detailHref: `/${slug}/${lang}/services/${s.slug}`,
        bookHref: `/${slug}/${lang}/consult/${s.slug}`,
      }, catalogLabels),
    ),
    ...(isCountryFeatureEnabled(config, "online-prescriptions") && prescriptionServices.length > 0
      ? (() => {
          // Cheapest prescription price across the catalogue
          const minRx = prescriptionServices.reduce<number | null>((acc, s) => {
            if (s.basePriceCents == null) return acc;
            return acc == null ? s.basePriceCents : Math.min(acc, s.basePriceCents);
          }, null);
          const rxImage = prescriptionServices.find((s) => s.imageSrc)?.imageSrc ?? null;
          const rxCurrency = prescriptionServices[0]?.currencyCode ?? "EUR";
          return [
            mapCategoryTile({
              type: "prescription",
              title: cc.navigation.repeatPrescription,
              tag: cc.homeCatalog.tagPrescription,
              price: minRx != null ? Math.round(minRx / 100) : null,
              currency: rxCurrency,
              dur: `${prescriptionServices.length} ${
                prescriptionServices.length === 1 ? cc.homeCatalog.serviceSingular : cc.homeCatalog.servicePlural
              }`,
              href: prescriptionsHref,
              imageSrc: rxImage,
            }),
          ];
        })()
      : []),
    ...(isCountryFeatureEnabled(config, "health-tests") && healthTests.length > 0
      ? (() => {
          // Cheapest health test price across the catalogue
          const minTest = healthTests.reduce<number>(
            (acc, t) => Math.min(acc, t.priceCents),
            healthTests[0]?.priceCents ?? 0,
          );
          const testImage = healthTests.find((t) => t.imageSrc)?.imageSrc ?? null;
          const testCurrency = healthTests[0]?.currencyCode ?? "EUR";
          return [
            mapCategoryTile({
              type: "test",
              title: cc.navigation.labTests,
              tag: cc.homeCatalog.tagTests,
              price: Math.round(minTest / 100),
              currency: testCurrency,
              dur: `${healthTests.length} ${healthTests.length === 1 ? cc.homeCatalog.testSingular : cc.homeCatalog.testPlural}`,
              href: testsHref,
              imageSrc: testImage,
            }),
          ];
        })()
      : []),
  ];

  const liveDoctors: LiveDoctorItem[] = countryDoctors
    .slice(0, 4)
    .map((d) => ({
      name: d.fullName,
      role:
        d.specialties.length > 0
          ? `${d.specialties[0]}, ${config.name}`
          : `${d.title}, ${config.name}`,
      imageSrc: d.imageSrc,
    }));

  // Hero quick-book wizard data: bookable doctors + the consultations they are
  // assigned to. Only doctors with at least one assigned service can be booked.
  const wizardServices = [...generalServices, ...specialistServices].map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    durationMinutes: s.durationMinutes,
    basePriceCents: s.basePriceCents ?? null,
    currencyCode: s.currencyCode ?? null,
  }));
  const wizardDoctors = countryDoctors
    .filter((d) => d.assignedServiceIds.length > 0)
    .map((d) => ({
      slug: d.slug,
      name: d.fullName,
      role: d.specialties.length > 0 ? `${d.specialties[0]}, ${config.name}` : config.name,
      imageSrc: d.imageSrc ?? null,
      serviceIds: d.assignedServiceIds,
    }));

  // Promote one doctor into the FeaturedDoctor section to break the
  // monotony of the DoctorWall grid (Phase 1 audit finding). Picks the
  // first doctor with both a bio and an image — those are the rows
  // that actually have enough content to fill the featured layout
  // without looking sparse. Falls back to null if no doctor qualifies;
  // the section then doesn't render at all.
  const featuredDoctor =
    countryDoctors.find((d) => d.bio && d.bio.trim().length > 0 && d.imageSrc) ??
    null;
  const generalServiceIdSet = new Set(generalServices.map((s) => s.id));
  const specialistServiceIdSet = new Set(specialistServices.map((s) => s.id));

  const teamDoctorItems: DoctorCarouselItem[] = (featuredDoctor
    ? countryDoctors.filter((d) => d.id !== featuredDoctor.id)
    : countryDoctors
  ).map((d) => {
    const isGP = d.assignedServiceIds.some((id) => generalServiceIdSet.has(id));
    const isSpecialist = d.assignedServiceIds.some((id) => specialistServiceIdSet.has(id));
    return {
      kind: isGP ? "gp" : isSpecialist ? "specialist" : undefined,
      name: d.fullName,
      title: d.specialties.length > 0 ? d.specialties[0] : d.title || cc.homeCatalog.doctorFallback,
      imcRegistration: d.imcRegistration,
      registrationDivision: d.registrationDivision,
      registrationVerified: d.registrationVerified,
      credentials: d.credentials,
      medicalRegistrationUrl: d.medicalRegistrationUrl,
      verificationUrl: verifyUrl,
      country: code,
      languages: d.languages,
      whatsappNumber: d.whatsappNumber,
      bio: "",
      imageSrc: d.imageSrc,
      initials: initialsFromName(d.fullName),
      href: `/${slug}/${lang}/doctors/${d.slug}`,
      bookingHref: buildBookHref({ country: slug, lang, doctor: d.slug }),
      ctaLabel: t.team.ctaView,
    };
  });

  // Regulator-specific trust tile when the country has authority data
  // (Ireland → IMC registry; Portugal → ERS provider registration E179287).
  // Falls back to the generic GDPR tile elsewhere.
  const regulatorAbbrev =
    countryTrust?.authorityLinks.find(
      (l) => l.category === "MEDICAL_REGULATOR" || l.category === "DOCTOR_REGISTRY",
    )?.abbreviation ?? null;
  const regulatorTile: TrustRibbonItem = countryTrust?.providerRegistration?.number
    ? {
        v: countryTrust.providerRegistration.number,
        l: countryTrust.providerRegistration.label ?? t.trust.gdpr,
        icon: "shield",
      }
    : regulatorAbbrev
      ? { v: regulatorAbbrev, l: t.trust.gdpr, icon: "shield" }
      : { v: "GDPR", l: t.trust.gdpr, icon: "lock" };

  const trustItems: TrustRibbonItem[] = [
    {
      v:
        countryDoctors.length >= 10
          ? `${Math.floor(countryDoctors.length / 10) * 10}+`
          : String(countryDoctors.length),
      l: countryDoctors.length === 1 ? t.trust.licensedSingular : t.trust.licensedPlural,
      icon: "doctor",
    },
    {
      v: String(countries.length),
      l: t.trust.markets,
      icon: "globe",
    },
    regulatorTile,
    {
      v: cc.homeCatalog.trustLive,
      l: t.trust.slots,
      icon: "sparkles",
    },
  ];

  const languageLabel = localeDisplayName(
    (config.defaultLocale ?? "en") as LocaleCode,
    "english",
  );

  // Marquee shows every country we cover with its live doctor count
  // alongside the flag. Active doctors per country come from the
  // pre-fetched allDoctors roster; falls back to 0 when a country has
  // no roster yet (still useful — signals coverage).
  const marqueeCountries: MarqueeCountry[] = countries.map((c) => ({
    code: c.code,
    name: c.name,
    doctorCount: allDoctors.filter((d) => d.countryCode === c.code).length,
  }));

  // Stats band — four concrete numbers, no marketing puffery. Pulled
  // from real catalogue data so they update as the platform grows.
  const totalServicesAcrossEurope =
    generalServices.length +
    specialistServices.length +
    prescriptionServices.length +
    healthTests.length;
  const statsItems: StatBandItem[] = [
    {
      value: String(totalDoctorsAcrossEurope),
      label: t.statsBand.stat1Label,
      caption: t.statsBand.stat1Caption,
    },
    {
      value: String(countries.length),
      label: t.statsBand.stat2Label,
      caption: t.statsBand.stat2Caption,
    },
    {
      value: t.statsBand.stat3Value,
      label: t.statsBand.stat3Label,
      caption: t.statsBand.stat3Caption,
    },
    {
      value: String(totalServicesAcrossEurope),
      label: t.statsBand.stat4Label,
      caption: t.statsBand.stat4Caption,
    },
  ];

  const countryUrl = `${getSiteUrl()}/${slug}/${lang}`;

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(
            countryTrust
              ? countryTrust.authorityLinks.filter((l) => l.showInSchema).map((l) => l.url)
              : [],
          ),
          websiteJsonLd(),
          medicalBusinessJsonLd({
            name: config.name,
            url: countryUrl,
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
          }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: config.name, url: `/${slug}/${lang}` },
          ]),
        ]}
      />

      {/* Hero H1 intentionally not CMS-overridable per country: the brand
          headline stays identical everywhere and translates only with the
          language (t.countryHero). */}
      <HomeHero
        countryCode={config.code}
        countryName={config.name}
        doctorCount={countryDoctors.length}
        languageLabel={languageLabel}
        bookHref={page?.ctaHref ?? bookHref}
        totalDoctorsAcrossEurope={totalDoctorsAcrossEurope}
        liveDoctors={liveDoctors}
        wizard={{
          doctors: wizardDoctors,
          services: wizardServices,
          countryCode: code,
          countrySlug: slug,
          lang,
        }}
        heroTitle={null}
        heroSubtitle={page?.heroSubtitle ?? null}
        heroImageSrc={page?.heroImageSrc ?? null}
        ctaLabel={page?.ctaLabel ?? null}
        i18n={t.countryHero}
      />
      <CountryMarquee countries={marqueeCountries} />
      <RichBodySection html={page?.body} theme="light" />
      <TrustRibbon items={trustItems} theme="light" />
      <ReviewBadge countryName={config.name} theme="light" />
      <ServiceCatalog services={serviceCatalogItems} i18n={tServices.catalog} />
      <StatsBand items={statsItems} theme="light" i18n={t.statsBand} />
      {/* ── Team section — featured card + full grid under one heading ── */}
      <section
        className="relative gh-medical-pattern gh-medical-pattern-dark"
        style={{
          background: "linear-gradient(178deg, #12342A 0%, #0F2E25 100%)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="mx-auto px-5 md:px-10 gh-section"
          style={{ maxWidth: "var(--container-width)" }}
        >
          {/* Shared heading */}
          <div className="mb-12 md:mb-16">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <span className="flex items-center gap-3">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.20em",
                    textTransform: "uppercase",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  {t.team.eyebrow}
                </span>
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.14em] [font-variant-numeric:tabular-nums]"
                style={{ color: "rgba(255,255,255,0.42)" }}
              >
                {countryDoctors.length} {countryDoctors.length === 1 ? t.team.registeredSingular : t.team.registeredPlural}
              </span>
            </div>
            <h2
              className="mt-3 max-w-[22ch] text-[length:var(--text-h1)] font-extrabold tracking-[-0.03em] leading-[1.02]"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {t.team.headline}{" "}
              <span style={{ color: "var(--color-brand-accent)" }}>{t.team.headlineAccent}</span>
            </h2>
            <p className="mt-5 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
              {t.team.body}
            </p>
          </div>

          {/* Featured doctor card — only when doctor has bio + image */}
          {featuredDoctor ? (
            <div className="mb-10">
              <FeaturedDoctor
                standalone={false}
                doctor={{
                  name: featuredDoctor.fullName,
                  title: featuredDoctor.title,
                  // Registration ("IMC | 523449") + verification URL —
                  // these the card already renders behind a shield icon
                  // but they were never passed through.
                  imcRegistration: featuredDoctor.imcRegistration,
                  registrationDivision: featuredDoctor.registrationDivision,
                  registrationVerified: featuredDoctor.registrationVerified,
                  medicalRegistrationUrl: featuredDoctor.medicalRegistrationUrl,
                  verificationUrl: verifyUrl,
                  credentials: featuredDoctor.credentials,
                  languages: featuredDoctor.languages,
                  bio: featuredDoctor.bio ?? "",
                  imageSrc: featuredDoctor.imageSrc ?? null,
                  href: `/${slug}/${lang}/doctors/${featuredDoctor.slug}`,
                  bookingHref: buildBookHref({ country: slug, lang, doctor: featuredDoctor.slug }),
                  // Call (WhatsApp) + social links — same fields the
                  // DoctorWall cards surface.
                  whatsappNumber: featuredDoctor.whatsappNumber,
                  instagramUrl: featuredDoctor.instagramUrl,
                  facebookUrl: featuredDoctor.facebookUrl,
                  linkedinUrl: featuredDoctor.linkedinUrl,
                }}
              />
            </div>
          ) : null}

          {/* Doctor carousel — 3 at a time, GP/Specialist filter tabs, prev/next arrows */}
          <DoctorCarousel
            doctors={teamDoctorItems}
            i18n={{
              filterAll: t.team.filterAll,
              filterGP: t.team.filterGP,
              filterSpecialist: t.team.filterSpecialist,
              pickTime: t.team.pickTime,
            }}
          />
        </div>
      </section>
      {countryTrust ? (
        <VerifiedProfessionals trust={countryTrust} locale={lang} />
      ) : null}
      <PartnersMarquee partners={countryPartners} />
      <HowItWorksNarrative theme="light" i18n={t.howItWorks} />
      <FinalCTA primaryHref={bookHref} secondaryHref={doctorsHref} i18n={t.finalCta} />
      <StickyBookingCTA href={bookHref} />
    </>
  );
}
