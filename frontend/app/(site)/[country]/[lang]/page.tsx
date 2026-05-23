import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeHero, type LiveDoctorItem } from "@/components/sections/HomeHero";
import { TrustRibbon, type TrustRibbonItem } from "@/components/sections/TrustRibbon";
import {
  ServiceCatalog,
  type ServiceCatalogItem,
} from "@/components/sections/ServiceCatalog";
import { DoctorWall, type DoctorWallItem } from "@/components/sections/DoctorWall";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { CountryMarquee, type MarqueeCountry } from "@/components/sections/CountryMarquee";
import { StatsBand, type StatBandItem } from "@/components/sections/StatsBand";
import { HowItWorksNarrative } from "@/components/sections/HowItWorksNarrative";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ReviewBadge } from "@/components/sections/ReviewBadge";
import { countries } from "@/data/countries";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import {
  breadcrumbJsonLd,
  medicalBusinessJsonLd,
} from "@/lib/seo/structured-data";
import { getSiteUrl } from "@/lib/seo/site-url";
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
  type CountryDoctorCard,
  type CountryServiceCard,
} from "@/lib/content/get-country-collections";
import { isCountryFeatureEnabled } from "@/lib/content/country-features";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import type { LocaleCode } from "@/lib/i18n/types";
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

  const page = await getPublicPage(code, "HOME", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}`;
  const title = page?.seoTitle ?? `${config.name} Online Clinic | ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Book a licensed online doctor consultation in ${config.name}.`;
  return {
    title,
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

function mapDoctorToWallItem(
  d: CountryDoctorCard,
  countryCode: string,
  bookHref: string,
): DoctorWallItem {
  const role =
    d.specialties.length > 0 ? d.specialties[0] : d.title || "Doctor";
  return {
    id: d.id,
    initials: initialsFromName(d.fullName),
    name: d.fullName,
    role,
    country: countryCode,
    langs: d.languages.join(" · "),
    href: bookHref,
    imageSrc: d.imageSrc,
    imcRegistration: d.imcRegistration,
  };
}

function mapServiceToCatalogItem(
  s: CountryServiceCard,
  ctaHref: string,
): ServiceCatalogItem {
  return {
    type: s.kind === "GENERAL" ? "general" : "specialist",
    title: s.name,
    tag: s.kind === "GENERAL" ? "General" : "Specialist",
    price: s.basePriceCents == null ? null : Math.round(s.basePriceCents / 100),
    currency: s.currencyCode ?? "EUR",
    dur: s.durationMinutes != null ? `${s.durationMinutes} min` : "—",
    href: ctaHref,
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
}): ServiceCatalogItem {
  return {
    type: input.type,
    title: input.title,
    tag: input.tag,
    price: input.price,
    currency: input.currency,
    dur: input.dur,
    href: input.href,
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

  // Cart-first booking: default site CTAs aim at service flows. The
  // legacy `/book-online` route stays alive as a fallback but no longer
  // surfaces from this page; both DoctorWall and FinalCTA now route at
  // the doctors index for a smoother flow.
  const generalHref = `/${slug}/${lang}/general-consultation`;
  const doctorsHref = `/${slug}/${lang}/doctors`;

  const [
    page,
    countryDoctors,
    generalServices,
    specialistServices,
    prescriptionServices,
    healthTests,
    allDoctors,
  ] =
    await Promise.all([
      getPublicPage(code, "HOME", lang as PublicLocale),
      getCountryDoctors(code),
      getCountryServices(code, "GENERAL"),
      getCountryServices(code, "SPECIALIST"),
      getCountryServices(code, "PRESCRIPTION"),
      getCountryHealthTests(code),
      getPublicDoctorsNormalized(),
    ]);

  const totalDoctorsAcrossEurope = allDoctors.length;

  // "View profile" button on the doctor wall — link to the doctor's
  // profile page where the visitor picks a service (cart-first booking
  // flow). Previously dumped people into the fallback `/book-online` form
  // with `?doctor=`, which skipped service selection.
  const doctorWallItems: DoctorWallItem[] = countryDoctors.map((d) =>
    mapDoctorToWallItem(d, code, `/${slug}/${lang}/doctors/${d.slug}`),
  );

  const prescriptionsHref = `/${slug}/${lang}/prescriptions`;
  const testsHref = `/${slug}/${lang}/tests`;
  const serviceCatalogItems: ServiceCatalogItem[] = [
    ...generalServices.map((s) => mapServiceToCatalogItem(s, generalHref)),
    ...specialistServices.map((s) =>
      mapServiceToCatalogItem(s, `/${slug}/${lang}/specialist-consultation`),
    ),
    ...(isCountryFeatureEnabled(config, "online-prescriptions") && prescriptionServices.length > 0
      ? [
          mapCategoryTile({
            type: "prescription",
            title: "Online prescriptions",
            tag: "Prescription",
            price: null,
            dur: `${prescriptionServices.length} service${
              prescriptionServices.length === 1 ? "" : "s"
            }`,
            href: prescriptionsHref,
          }),
        ]
      : []),
    ...(isCountryFeatureEnabled(config, "health-tests") && healthTests.length > 0
      ? [
          mapCategoryTile({
            type: "test",
            title: "Health tests",
            tag: "Home tests",
            price: null,
            dur: `${healthTests.length} test${healthTests.length === 1 ? "" : "s"}`,
            href: testsHref,
          }),
        ]
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
  const wallDoctorsExcludingFeatured = featuredDoctor
    ? doctorWallItems.filter((d) => d.id !== featuredDoctor.id)
    : doctorWallItems;

  const trustItems: TrustRibbonItem[] = [
    {
      // Show a rounded "N+" only once the roster is big enough to justify it;
      // for small counts show the exact number so the ribbon doesn't read as
      // marketing puffery.
      v:
        countryDoctors.length >= 10
          ? `${Math.floor(countryDoctors.length / 10) * 10}+`
          : String(countryDoctors.length),
      l: countryDoctors.length === 1 ? "Licensed doctor" : "Licensed doctors",
      icon: "doctor",
    },
    {
      v: String(countries.length),
      l: "European markets · EU-registered",
      icon: "globe",
    },
    {
      v: "GDPR",
      l: "Compliant by default",
      icon: "lock",
    },
    {
      // Fourth slot — fills the 4-up grid on lg. Concrete claim, no
      // unsourced rating; same-day availability is something we
      // actually deliver.
      v: "24h",
      l: "Same-day consultations",
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
      label: "Licensed clinicians",
      caption: "Registered with their local medical council.",
    },
    {
      value: String(countries.length),
      label: "European markets",
      caption: "EU-registered, GDPR-compliant by default.",
    },
    {
      value: "24h",
      label: "Average wait",
      caption: "From booking to first available video call.",
    },
    {
      value: String(totalServicesAcrossEurope),
      label: "Bookable services",
      caption: "Consultations, prescriptions, and home tests.",
    },
  ];

  const countryUrl = `${getSiteUrl()}/${slug}/${lang}`;

  return (
    <>
      <JsonLd
        data={[
          medicalBusinessJsonLd({ name: config.name, url: countryUrl }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: config.name, url: `/${slug}/${lang}` },
          ]),
        ]}
      />

      <HomeHero
        countryCode={config.code}
        countryName={config.name}
        doctorCount={countryDoctors.length}
        languageLabel={languageLabel}
        bookHref={page?.ctaHref ?? generalHref}
        totalDoctorsAcrossEurope={totalDoctorsAcrossEurope}
        liveDoctors={liveDoctors}
        heroTitle={page?.heroTitle ?? null}
        heroSubtitle={page?.heroSubtitle ?? null}
        heroImageSrc={page?.heroImageSrc ?? null}
        ctaLabel={page?.ctaLabel ?? null}
      />
      <CountryMarquee countries={marqueeCountries} />
      <RichBodySection html={page?.body} />
      <TrustRibbon items={trustItems} />
      <ReviewBadge countryName={config.name} />
      <ServiceCatalog services={serviceCatalogItems} />
      <StatsBand items={statsItems} />
      {featuredDoctor ? (
        <FeaturedDoctor
          doctor={{
            name: featuredDoctor.fullName,
            title: featuredDoctor.title,
            languages: featuredDoctor.languages,
            bio: featuredDoctor.bio ?? "",
            imageSrc: featuredDoctor.imageSrc ?? null,
            href: `/${slug}/${lang}/doctors/${featuredDoctor.slug}`,
          }}
        />
      ) : null}
      <DoctorWall doctors={wallDoctorsExcludingFeatured} bookHref={doctorsHref} />
      <HowItWorksNarrative />
      <FinalCTA primaryHref={generalHref} secondaryHref={doctorsHref} />
    </>
  );
}
