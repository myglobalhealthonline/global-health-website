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
import { HowItWorksNarrative } from "@/components/sections/HowItWorksNarrative";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ReviewBadge } from "@/components/sections/ReviewBadge";
import { countries, getCountryByCode } from "@/data/countries";
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
  getCountryServices,
  type CountryDoctorCard,
  type CountryServiceCard,
} from "@/lib/content/get-country-collections";
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
  const config = getCountryByCode(code);
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

export default async function CountryLangHomePage({
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

  const bookHref = `/${slug}/${lang}/book-online`;
  const generalHref = `/${slug}/${lang}/general-consultation`;

  const [page, countryDoctors, generalServices, specialistServices, allDoctors] =
    await Promise.all([
      getPublicPage(code, "HOME", lang as PublicLocale),
      getCountryDoctors(code),
      getCountryServices(code, "GENERAL"),
      getCountryServices(code, "SPECIALIST"),
      getPublicDoctorsNormalized(),
    ]);

  const totalDoctorsAcrossEurope = allDoctors.length;

  const doctorWallItems: DoctorWallItem[] = countryDoctors.map((d) =>
    mapDoctorToWallItem(d, code, `/${slug}/${lang}/doctors/${d.slug}`),
  );

  const serviceCatalogItems: ServiceCatalogItem[] = [
    ...generalServices.map((s) => mapServiceToCatalogItem(s, generalHref)),
    ...specialistServices.map((s) =>
      mapServiceToCatalogItem(s, `/${slug}/${lang}/specialist-consultation`),
    ),
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
    },
    { v: String(countries.length), l: "Countries · EU-registered" },
    { v: "GDPR", l: "Compliant by default" },
  ];

  const languageLabel = localeDisplayName(
    (config.defaultLocale ?? "en") as LocaleCode,
    "english",
  );

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
        bookHref={page?.ctaHref ?? bookHref}
        totalDoctorsAcrossEurope={totalDoctorsAcrossEurope}
        liveDoctors={liveDoctors}
        heroTitle={page?.heroTitle ?? null}
        heroSubtitle={page?.heroSubtitle ?? null}
        heroImageSrc={page?.heroImageSrc ?? null}
        ctaLabel={page?.ctaLabel ?? null}
      />
      <RichBodySection html={page?.body} />
      <TrustRibbon items={trustItems} />
      <ReviewBadge countryName={config.name} />
      <ServiceCatalog services={serviceCatalogItems} />
      <DoctorWall doctors={doctorWallItems} bookHref={bookHref} />
      <HowItWorksNarrative />
      <FinalCTA primaryHref={generalHref} secondaryHref={bookHref} />
    </>
  );
}
