import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
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

  const page = await getPublicPage(code, "SPECIALIST_CONSULTATION", lang as PublicLocale);
  const heroTitle = page?.heroTitle ?? "Specialist consultation";
  const heroSubtitle =
    page?.heroSubtitle ?? `Connect with specialists licensed in ${config.name}.`;
  const ctaLabel = page?.ctaLabel ?? "Book specialist consultation";
  const ctaHref = page?.ctaHref ?? `/${slug}/${lang}/book-online?type=specialist`;
  const body =
    page?.body ??
    `<p>A specialist consultation is for in-depth review by a clinician trained in a specific medical area.</p>`;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: config.name, url: `/${slug}/${lang}` },
          { name: "Specialist consultation", url: `/${slug}/${lang}/specialist-consultation` },
        ])}
      />
      <section className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          {config.name} · Specialist Consultation
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">{heroTitle}</h1>
        <p className="mt-4 text-lg text-slate-600">{heroSubtitle}</p>
        <div className="mt-6">
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-md bg-emerald-700 px-5 py-3 text-white shadow-sm hover:bg-emerald-800"
          >
            {ctaLabel}
          </Link>
        </div>
        <article
          className="prose prose-slate mt-10 max-w-none"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </section>
    </>
  );
}
