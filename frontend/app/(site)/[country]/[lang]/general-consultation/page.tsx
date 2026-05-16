import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { TrustRibbon } from "@/components/sections/TrustRibbon";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { RichBodySection } from "@/components/sections/RichBodySection";
import { countries, getCountryByCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
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
  const url = `${getSiteUrl()}/${country}/${lang}/general-consultation`;
  const title = page?.seoTitle ?? `General consultation in ${config.name} · ${SITE_NAME}`;
  const description =
    page?.seoDescription ??
    `Online general medical consultation with a licensed doctor in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/general-consultation") },
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

  const [page, services, doctors] = await Promise.all([
    getPublicPage(code, "GENERAL_CONSULTATION", lang as PublicLocale),
    getCountryServices(code, "GENERAL"),
    getCountryDoctors(code),
  ]);

  const heroTitle = page?.heroTitle ?? "General medical consultation";
  const heroSubtitle =
    page?.heroSubtitle ?? `Speak to a licensed doctor in ${config.name} about everyday health concerns.`;
  const ctaLabel = page?.ctaLabel ?? "Book general consultation";
  const ctaHref = page?.ctaHref ?? `/${slug}/${lang}/book-online?type=general`;

  // Map Service rows to the ServicesGrid card shape. Cards auto-appear when
  // admin adds a Service row of kind=GENERAL for this country.
  const serviceItems = services.map((s) => ({
    title: s.name,
    description: s.summary,
    href: ctaHref,
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
    ctaLabel: "View profile",
  }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "General consultation", url: `/${slug}/${lang}/general-consultation` },
        ])}
      />

      {/* Hero — admin-editable copy + optional uploaded image from ContentPage */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          {config.name} · General Consultation
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

      <TrustRibbon />

      {/* Service cards — auto from Service rows where kind=GENERAL, country=X */}
      {serviceItems.length > 0 ? (
        <ServicesGrid
          eyebrow="What you can book"
          title="General consultations available"
          intro={`${serviceItems.length} ${serviceItems.length === 1 ? "service" : "services"} currently offered in ${config.name}. Cards update as the team adds or retires services.`}
          items={serviceItems}
        />
      ) : null}

      {/* Doctor cards — auto from Doctor rows for this country */}
      {doctorItems.length > 0 ? (
        <DoctorsSection
          title={`Doctors in ${config.name}`}
          intro="Licensed clinicians available for general consultations. Each profile lists qualifications, languages, and registration."
          doctors={doctorItems}
        />
      ) : null}

      <FinalCTA primaryHref={ctaHref} secondaryHref={`/${slug}/${lang}/doctors`} />
    </>
  );
}
