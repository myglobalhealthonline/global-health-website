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
import { TrustMarquee, type TrustMarqueeItem } from "@/components/sections/TrustMarquee";
import { fetchPublicReviewConfig } from "@/lib/api/reviews-config";
import { localizedLanguageLabel } from "@/lib/content/languages";
import { StatsBand, type StatBandItem } from "@/components/sections/StatsBand";
import { HowItWorksNarrative } from "@/components/sections/HowItWorksNarrative";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { StickyBookingCTA } from "@/components/sections/StickyBookingCTA";
import { FAQSection } from "@/components/sections/FAQSection";
import { MedicalDisclaimer } from "@/components/sections/MedicalDisclaimer";
import { SectionSeam } from "@/components/ui/SectionSeam";
import {
  ServiceIntro,
  ChecklistSection,
  WhyChooseSection,
} from "@/components/sections/ServiceContentSections";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { buildBookHref } from "@/lib/routing/book-href";
import {
  breadcrumbJsonLd,
  medicalBusinessJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  faqJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import {
  getPageContent,
  isSupportedLocale,
  themeProp,
  type PublicLocale,
} from "@/lib/content/get-page-content";
import { homePageExtras, overrideHomeBundle } from "@/lib/content/country-home-copy";
import {
  getCountryDoctors,
  getCountryServices,
  type CountryServiceCard,
} from "@/lib/content/get-country-collections";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { getPublicDoctorsCount } from "@/lib/content/get-public-doctors";
import { getGpLanguages } from "@/lib/content/get-gp-availability";
import { getCountryTrust, doctorVerificationUrl } from "@/lib/content/get-country-trust";
import { VerifiedProfessionals } from "@/components/sections/VerifiedProfessionals";
import { CountryCertificationLogos } from "@/components/sections/CountryCertificationLogos";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { SITE_NAME } from "@/lib/constants";
import { Stethoscope, ShieldCheck, Activity, Languages } from "lucide-react";
import { DoctifyReviewsSectionLazy as DoctifyReviewsSection } from "@/components/sections/DoctifyReviewsLazy";

// Marquee language-chip priority: majority consultation languages surface
// ahead of the rest of the (alphabetical) GP language pool. See
// gpLanguageNames below — booking's own language picker is unaffected.
const MARQUEE_PRIORITY_LANGUAGES = ["english", "portuguese", "spanish", "french", "german"];

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
  if (!code) return { title: SITE_NAME };
  const config = await getPublicCountryByCode(code);
  if (!config) return { title: SITE_NAME };
  if (!isSupportedLocale(lang)) return { title: SITE_NAME };

  const { record: page } = await getPageContent(code, "HOME", lang as PublicLocale);
  const extras = homePageExtras(code, lang);
  const { common: metaCommon } = loadLocaleBundle(lang as LocaleCode);
  const path = `/${country}/${lang}`;
  const title =
    page?.seoTitle ?? extras?.seoTitle ?? metaCommon.homeMeta.titleTemplate.replace("{country}", config.name);
  const description =
    page?.seoDescription ??
    extras?.seoDescription ??
    metaCommon.homeMeta.descriptionTemplate.replace("{country}", config.name);
  // OG/Twitter may carry a distinct social-optimised variant; fall back to
  // the page title/description otherwise.
  const ogTitle = extras?.ogTitle ?? title;
  const ogDescription = extras?.ogDescription ?? description;
  return buildPublicMetadata({
    path,
    title,
    description,
    socialTitle: ogTitle,
    socialDescription: ogDescription,
    imageTitle: (page?.heroTitle ?? extras?.heroTitle ?? ogTitle).split(/[—|]/u)[0]?.trim() || ogTitle,
    locale: ogLocales(config, lang).locale,
    kind: "country",
    subtitle: config.name,
    sourceImage: page?.ogImageSrc ?? undefined,
    imageAlt: `${ogTitle} ? ${config.name}`,
    languages: hreflangAlternates(config, ""),
  });
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
    description: s.summary?.trim() || null,
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
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = await getPublicCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();
  // Layer per-country/-locale copy over the shared i18n bundle (see
  // country-home-copy.ts). Non-overridden markets keep the generic copy.
  const bundle = loadLocaleBundle(lang as LocaleCode);
  const cc = bundle.common;
  const extras = homePageExtras(code, lang);
  const t = overrideHomeBundle(bundle.home, code, lang);
  const tServices = extras?.servicesHeadline
    ? {
        ...bundle.services,
        catalog: { ...bundle.services.catalog, headline: extras.servicesHeadline },
      }
    : bundle.services;
  const bookHref = buildBookHref({ country: slug, lang });
  const doctorsHref = `/${slug}/${lang}/doctors`;

  const [
    { record: rawPage, disabled: pageDisabled },
    countryDoctors,
    allCountryServices,
    totalDoctorsAcrossEurope,
    countryTrust,
    gpLanguages,
  ] =
    await Promise.all([
      getPageContent(code, "HOME", lang as PublicLocale),
      getCountryDoctors(code, lang),
      // One query for every kind, partitioned in memory below — replaces the
      // former three per-kind round-trips (each with its own country check).
      getCountryServices(code, undefined, lang),
      // Count projection, not the full global roster (was fetched only for
      // its `.length`).
      getPublicDoctorsCount(),
      getCountryTrust(code),
      getGpLanguages(code),
    ]);

  const generalServices = allCountryServices.filter((s) => s.kind === "GENERAL");
  const specialistServices = allCountryServices.filter((s) => s.kind === "SPECIALIST");
  const prescriptionServices = allCountryServices.filter((s) => s.kind === "PRESCRIPTION");

  // Country regulator's public verification page (medicalcouncil.ie /
  // ordemdosmedicos.pt) — every doctor card links here so patients can
  // verify the named clinician against the official register.
  const verifyUrl = doctorVerificationUrl(countryTrust) ?? undefined;

  // Null out CMS content when the page entry is disabled or the "pages"
  // feature is toggled off — structural sections still render with defaults.
  const page = pageDisabled ? null : rawPage;

  const prescriptionsHref = `/${slug}/${lang}/prescriptions`;
  const catalogLabels = {
    general: cc.homeCatalog.tagGeneral,
    specialist: cc.homeCatalog.tagSpecialist,
    min: cc.extra.minSuffix,
  };
  const serviceCatalogItems: ServiceCatalogItem[] = [
    ...generalServices.map((s) =>
      mapServiceToCatalogItem(s, {
        detailHref: `/${slug}/${lang}/services/${s.slug}`,
        bookHref: buildBookHref({ country: slug, lang, service: s.slug }),
      }, catalogLabels),
    ),
    ...specialistServices.map((s) =>
      mapServiceToCatalogItem(s, {
        detailHref: `/${slug}/${lang}/services/${s.slug}`,
        bookHref: buildBookHref({ country: slug, lang, service: s.slug }),
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
  ];

  const liveDoctors: LiveDoctorItem[] = countryDoctors
    .slice(0, 4)
    .map((d) => ({
      name: d.fullName,
      role: `${d.title}, ${config.name}`,
      imageSrc: d.imageSrc,
    }));

  // Admin-chosen Clinical Director takes priority. Falls back to the first
  // doctor with bio + image so the section still renders when no featured
  // doctor has been set in the admin panel.
  const featuredDoctor =
    countryDoctors.find((d) => d.isFeatured) ??
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
      title: d.title || (d.specialties.length > 0 ? d.specialties[0] : cc.homeCatalog.doctorFallback),
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
      imageAltText: d.imageAltText,
      imageTitle: d.imageTitle,
      imageCaption: d.imageCaption,
      imageDescription: d.imageDescription,
      imageFocalX: d.imageFocalX,
      imageFocalY: d.imageFocalY,
      imageZoom: d.imageZoom,
      initials: initialsFromName(d.fullName),
      href: `/${slug}/${lang}/doctors/${d.slug}`,
      bookingHref: buildBookHref({ country: slug, lang, doctor: d.slug }),
      ctaLabel: t.team.ctaView,
    };
  });

  // Regulator-specific trust tile when the country has authority data
  // (Ireland → IMC registry; Portugal → ERS provider registration E179287;
  // Brazil → both CFM and CRM registries, joined). Falls back to the
  // generic data-protection-law tile elsewhere.
  const regulatorAbbrev = (() => {
    const abbrevs = Array.from(
      new Set(
        (countryTrust?.authorityLinks ?? [])
          .filter((l) => l.category === "MEDICAL_REGULATOR" || l.category === "DOCTOR_REGISTRY")
          .map((l) => l.abbreviation)
          .filter((a): a is string => Boolean(a)),
      ),
    );
    return abbrevs.length > 0 ? abbrevs.join("/") : null;
  })();
  // Data-protection law name is country-specific (GDPR, LGPD for Brazil, …) —
  // never hardcode "GDPR" here, it must match countryTrust.dataProtectionLawName.
  const dataLawName = countryTrust?.dataProtectionLawName ?? "GDPR";
  const gdprLabel = t.trust.gdpr.replace("{law}", dataLawName);
  const regulatorTile: TrustRibbonItem = countryTrust?.providerRegistration?.number
    ? {
        v: countryTrust.providerRegistration.number,
        l: countryTrust.providerRegistration.label ?? gdprLabel,
        icon: "shield",
      }
    : regulatorAbbrev
      ? { v: regulatorAbbrev, l: gdprLabel, icon: "shield" }
      : { v: dataLawName, l: gdprLabel, icon: "lock" };

  // Cross-market "N European markets" tile replaced with a country-general
  // "consultation languages" tile: it belongs on a single clinic's hub (a
  // visitor booking a local doctor cares which languages they speak, not how
  // many markets exist) and keeps the four-across layout consistent across
  // every country page. Falls back to a GDPR tile only when a market has no
  // languages configured, so the count stays four everywhere.
  const languageTile: TrustRibbonItem =
    gpLanguages.languages.length > 0
      ? { v: String(gpLanguages.languages.length), l: t.trust.languagesSpoken, icon: "globe" }
      : { v: dataLawName, l: gdprLabel, icon: "lock" };
  const trustItems: TrustRibbonItem[] = [
    {
      v:
        countryDoctors.length >= 10
          ? `${Math.floor(countryDoctors.length / 10) * 10}+`
          : String(countryDoctors.length),
      l: countryDoctors.length === 1 ? t.trust.licensedSingular : t.trust.licensedPlural,
      icon: "doctor",
    },
    languageTile,
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

  // Trust marquee — country-specific proof points instead of the old
  // cross-country coverage belt (a visitor in Ireland doesn't care how
  // many doctors Portugal has). Doctify aggregate is optional: only shown
  // when the admin has connected a Doctify clinic and a snapshot exists.
  const reviewConfigResult = await fetchPublicReviewConfig().catch(() => null);
  const doctifyAggregate =
    reviewConfigResult && reviewConfigResult.ok
      ? (reviewConfigResult.data.doctify.aggregate ?? null)
      : null;
  // Marquee shows only 3 of the full (alphabetical) language pool — bias
  // toward major consultation languages so e.g. Portuguese surfaces ahead
  // of a minority language that happens to sort earlier (Bangla < Portuguese).
  // Booking's actual language picker still gets the untouched full list below.
  const gpLanguageNames = [...gpLanguages.languages]
    .sort((a, b) => {
      const ai = MARQUEE_PRIORITY_LANGUAGES.indexOf(a);
      const bi = MARQUEE_PRIORITY_LANGUAGES.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      return (ai === -1 ? MARQUEE_PRIORITY_LANGUAGES.length : ai) -
        (bi === -1 ? MARQUEE_PRIORITY_LANGUAGES.length : bi);
    })
    .slice(0, 3)
    .map((l) => localizedLanguageLabel(l, lang));
  const gpLanguagesSummary =
    gpLanguageNames.length > 0
      ? gpLanguages.languages.length > 3
        ? bundle.common.doctors.languagesMoreTemplate.replace(
            "{languages}",
            gpLanguageNames.join(", "),
          )
        : gpLanguageNames.join(", ")
      : "";
  const trustMarqueeItems: TrustMarqueeItem[] = [
    ...(doctifyAggregate
      ? [
          {
            icon: "star" as const,
            value: `${doctifyAggregate.rating.toFixed(1)}★`,
            label: `${doctifyAggregate.count} Doctify reviews`,
          },
        ]
      : []),
    {
      icon: "doctor" as const,
      value:
        countryDoctors.length >= 10
          ? `${Math.floor(countryDoctors.length / 10) * 10}+`
          : String(countryDoctors.length),
      label:
        countryDoctors.length === 1 ? t.trust.licensedSingular : t.trust.licensedPlural,
    },
    ...(gpLanguages.configured
      ? [
          {
            icon: "bolt" as const,
            value: cc.homeCatalog.trustLive,
            label: t.trust.slots,
          },
        ]
      : []),
    {
      icon: (regulatorAbbrev ? "shield" : "lock") as "shield" | "lock",
      value: regulatorAbbrev ?? dataLawName,
      label: gdprLabel,
    },
    ...(gpLanguageNames.length > 0
      ? [
          {
            icon: "languages" as const,
            value: gpLanguagesSummary,
            label: t.trust.languagesSpoken,
          },
        ]
      : []),
  ];

  // Stats band — four concrete numbers, no marketing puffery. Pulled
  // from real catalogue data so they update as the platform grows.
  const totalServicesAcrossEurope =
    generalServices.length +
    specialistServices.length +
    prescriptionServices.length;
  // Country-scoped stats: this country's registered doctors + bookable
  // services, not the platform-wide totals — a clinic hub should state its
  // own numbers so the count matches the doctors/services actually shown.
  // The cross-market "European markets" card is replaced with a general
  // "consultation languages" card (see the trust ribbon above) so the 2×2
  // grid stays full and consistent across every country page.
  const languageStat: StatBandItem =
    gpLanguages.languages.length > 0
      ? {
          value: String(gpLanguages.languages.length),
          label: t.trust.languagesSpoken,
          caption: gpLanguagesSummary || undefined,
          icon: <Languages className="size-5" strokeWidth={1.5} aria-hidden />,
        }
      : {
          value: dataLawName,
          label: gdprLabel,
          icon: <ShieldCheck className="size-5" strokeWidth={1.5} aria-hidden />,
        };
  const statsItems: StatBandItem[] = [
    {
      value: String(countryDoctors.length),
      label: t.statsBand.stat1Label,
      caption: t.statsBand.stat1Caption,
      icon: <Stethoscope className="size-5" strokeWidth={1.5} aria-hidden />,
    },
    languageStat,
    {
      value: t.statsBand.stat3Value,
      label: t.statsBand.stat3Label,
      caption: t.statsBand.stat3Caption,
      icon: <ShieldCheck className="size-5" strokeWidth={1.5} aria-hidden />,
    },
    {
      value: String(totalServicesAcrossEurope),
      label: t.statsBand.stat4Label,
      caption: t.statsBand.stat4Caption,
      icon: <Activity className="size-5" strokeWidth={1.5} aria-hidden />,
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

      {/* Hero H1/paragraph/bullets: admin CMS wins, then the per-country copy
          override (country-home-copy.ts), then the shared i18n default. Markets
          without an override keep the generic brand headline (t.countryHero). */}
      <HomeHero
        countryCode={config.code}
        countryName={config.name}
        doctorCount={countryDoctors.length}
        languageLabel={languageLabel}
        bookHref={page?.ctaHref ?? bookHref}
        totalDoctorsAcrossEurope={totalDoctorsAcrossEurope}
        liveDoctors={liveDoctors}
        sameDay={{
          countryCode: code,
          countrySlug: slug,
          lang,
          languages: gpLanguages.languages,
          configured: gpLanguages.configured,
        }}
        heroTitle={page?.heroTitle ?? extras?.heroTitle ?? null}
        heroSubtitle={page?.heroSubtitle ?? extras?.heroSubtitle ?? null}
        heroBullets={extras?.heroBullets ?? null}
        heroImageSrc={page?.heroImageSrc ?? null}
        ctaLabel={page?.ctaLabel ?? null}
        i18n={t.countryHero}
      />
      {page?.sections.faq ? <JsonLd data={faqJsonLd(page.faq)} /> : null}
      <TrustMarquee items={trustMarqueeItems} ariaLabel={cc.a11y.whyPatientsTrustUs} />
      {/* Overview intro sits BELOW the trust marquee (marquee hugs the hero). */}
      {page?.sections.intro ? (
        <ServiceIntro body={page.intro!} theme={themeProp(page?.introTheme, "light")} />
      ) : null}
      <TrustRibbon items={trustItems} theme="light" />
      <ServiceCatalog services={serviceCatalogItems} i18n={tServices.catalog} />
      <StatsBand items={statsItems} theme="light" i18n={t.statsBand} />
      <DoctifyReviewsSection
        theme="ivory"
        variant="carousel"
        language={lang}
        eyebrow={t.doctifyReviews.eyebrow}
        headline={t.doctifyReviews.headline}
        headlineAccent={t.doctifyReviews.headlineAccent}
        body={t.doctifyReviews.body}
      />
      {page?.sections.whoFor ? (
        <ChecklistSection
          eyebrow="Who it's for"
          title={page.whoForTitle!}
          intro={page.whoForIntro ?? undefined}
          items={page.whoForItems}
          theme={themeProp(page?.whoForTheme, "light")}
        />
      ) : null}
      {/* ── Team section — featured card + full grid under one heading ── */}
      <section className="relative gh2-section-forest gh-medical-pattern gh-medical-pattern-dark">
        <SectionSeam theme="dark" />
        <div
          className="gh-section mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        >
          {/* Shared heading */}
          <div className="mb-12 md:mb-16">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <span className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.20em] text-[var(--color-brand-accent)]">
                  {t.team.eyebrow}
                </span>
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/42 [font-variant-numeric:tabular-nums]"
              >
                {countryDoctors.length} {countryDoctors.length === 1 ? t.team.registeredSingular : t.team.registeredPlural}
              </span>
            </div>
            <h2
              className="mt-3 max-w-[22ch] text-[length:var(--text-h1)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white/92"
            >
              {t.team.headline}{" "}
              <span className="text-[var(--color-brand-accent)]">{t.team.headlineAccent}</span>
            </h2>
            <p className="mt-5 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed text-white/65">
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
                  imageAltText: featuredDoctor.imageAltText,
                  imageTitle: featuredDoctor.imageTitle,
                  imageCaption: featuredDoctor.imageCaption,
                  imageDescription: featuredDoctor.imageDescription,
                  imageFocalX: featuredDoctor.imageFocalX,
                  imageFocalY: featuredDoctor.imageFocalY,
                  imageZoom: featuredDoctor.imageZoom,
                  href: `/${slug}/${lang}/doctors/${featuredDoctor.slug}`,
                  bookingHref: buildBookHref({ country: slug, lang, doctor: featuredDoctor.slug }),
                  // Call (WhatsApp) + social links — same fields the
                  // DoctorWall cards surface.
                  whatsappNumber: featuredDoctor.whatsappNumber,
                  instagramUrl: featuredDoctor.instagramUrl,
                  facebookUrl: featuredDoctor.facebookUrl,
                  linkedinUrl: featuredDoctor.linkedinUrl,
                  viewProfileLabel: bundle.common.doctors.viewProfile,
                  bookWithLabel: bundle.common.doctors.bookWithTemplate,
                  verifyRegistrationLabel: bundle.common.doctors.verifyRegistrationAria,
                  clinicalDirectorLabel: bundle.common.doctors.clinicalDirectorLabel,
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
              previousLabel: t.team.previousLabel,
              nextLabel: t.team.nextLabel,
            }}
          />
        </div>
      </section>
      {page?.sections.whyChoose ? (
        <WhyChooseSection
          title={page.whyChooseTitle!}
          items={page.whyChooseItems}
          theme={themeProp(page?.whyChooseTheme, "soft")}
        />
      ) : null}
      {countryTrust ? (
        <>
          <VerifiedProfessionals trust={countryTrust} locale={lang} />
          <CountryCertificationLogos trust={countryTrust} locale={lang} />
        </>
      ) : null}
      <HowItWorksNarrative theme="light" i18n={t.howItWorks} />
      {page?.sections.faq ? (
        <FAQSection items={page.faq} theme={themeProp(page?.faqTheme, "dark")} />
      ) : null}
      <FinalCTA primaryHref={bookHref} secondaryHref={doctorsHref} i18n={t.finalCta} />
      <StickyBookingCTA href={bookHref} />
      {page?.sections.disclaimer ? (
        <MedicalDisclaimer
          paragraphs={page.disclaimerParagraphs}
          theme={themeProp(page?.disclaimerTheme, "dark")}
          title={cc.a11y.medicalDisclaimer}
        />
      ) : null}
    </>
  );
}
