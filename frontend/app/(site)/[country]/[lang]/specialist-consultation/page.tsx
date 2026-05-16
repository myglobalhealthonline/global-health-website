import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { SpecialtiesGrid } from "@/components/sections/SpecialtiesGrid";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { ReviewBadge } from "@/components/sections/ReviewBadge";
import { countries, getCountryByCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
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
  getCountrySpecialties,
} from "@/lib/content/get-country-collections";
import { SITE_NAME } from "@/lib/constants";

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

  const page = await getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale);
  const url = `${getSiteUrl()}/${country}/${lang}/specialist-consultation`;
  const title = page?.seoTitle ?? `Specialist consultation in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Online specialist consultation in ${config.name}. Cardiology, dermatology, nutrition, and more.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/specialist-consultation") },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

function formatPrice(cents: number | null, currency: string | null): string | undefined {
  if (cents == null) return undefined;
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : (currency ?? "");
  const amount = (cents / 100).toLocaleString("en-IE", { maximumFractionDigits: 0 });
  return `${symbol}${amount}`;
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

  const [page, specialties, services, doctors] = await Promise.all([
    getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale),
    getCountrySpecialties(code),
    getCountryServices(code, "SPECIALIST"),
    getCountryDoctors(code),
  ]);

  const heroTitle = page?.heroTitle ?? "Specialist consultation";
  const heroSubtitle =
    page?.heroSubtitle ?? `Connect with specialists licensed in ${config.name}.`;
  const ctaLabel = page?.ctaLabel ?? "Book specialist consultation";
  const ctaHref = page?.ctaHref ?? `/${slug}/${lang}/book-online?type=specialist`;

  // Specialty cards — auto from Specialty rows for this country.
  const specialtyItems = specialties.map((s) => ({
    title: s.name,
    description: s.cardSummary ?? "",
    href: ctaHref,
  }));

  // Specialist service cards — auto from Service rows where kind=SPECIALIST.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    href: ctaHref,
    serviceType: "specialist" as const,
    audience: s.specialtyName ?? undefined,
    duration: formatDuration(s.durationMinutes),
    startingPrice: formatPrice(s.basePriceCents, s.currencyCode),
    imageSrc: s.imageSrc ?? null,
  }));

  // Doctor cards filtered to those with at least one specialty link.
  const doctorItems = doctors
    .filter((d) => d.specialties.length > 0)
    .slice(0, 12)
    .map((d) => ({
      name: d.fullName,
      title: d.title,
      bio: d.bio ?? "",
      languages: d.languages,
      country: config.name,
      imageSrc: d.imageSrc ?? null,
      href: `/${slug}/${lang}/doctors/${d.slug}`,
      ctaLabel: "View profile",
    }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Specialist consultation", url: `/${slug}/${lang}/specialist-consultation` },
        ])}
      />
      <JsonLd
        data={medicalProcedureJsonLd({
          name: `Specialist medical consultation in ${config.name}`,
          description: `Online specialist consultation (cardiology, dermatology, psychiatry, nutrition, and more) with clinicians licensed in ${config.name}.`,
          countryName: config.name,
          url: `/${slug}/${lang}/specialist-consultation`,
          bookingUrl: ctaHref,
        })}
      />

      {/* Hero — admin-editable copy + optional uploaded image from ContentPage */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          {config.name} · Specialist Consultation
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900 sm:text-5xl">{heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{heroSubtitle}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-md bg-emerald-700 px-6 py-3 text-white shadow-sm hover:bg-emerald-800"
          >
            {ctaLabel}
          </Link>
        </div>
        {page?.heroImageSrc ? (
          <div className="mx-auto mt-10 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.heroImageSrc}
              alt={heroTitle}
              className="block w-full"
              style={{ maxHeight: 440, objectFit: "cover" }}
            />
          </div>
        ) : null}
      </section>

      <RichBodySection html={page?.body} />

      <ReviewBadge countryName={config.name} />

      <TrustRibbon />

      {/* Specialty cards — auto from Specialty rows for this country */}
      {specialtyItems.length > 0 ? (
        <SpecialtiesGrid title={`Specialties in ${config.name}`} items={specialtyItems} />
      ) : null}

      {/* Specialist service cards — auto from Service rows kind=SPECIALIST */}
      {serviceItems.length > 0 ? (
        <ServicesGrid
          eyebrow="What you can book"
          title="Specialist consultations available"
          intro="Cards update as the team adds or retires specialist services."
          items={serviceItems}
        />
      ) : null}

      {/* Doctor cards — only specialists shown here */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={`Specialist doctors in ${config.name}`}
          intro="Licensed specialists available for online consultations."
          doctors={doctorItems}
        />
      ) : null}

      <FinalCTA primaryHref={ctaHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
