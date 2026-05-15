import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingFormTemplate } from "@/components/templates/BookingFormTemplate";
import { getBookingPageData } from "@/lib/content/booking-page-data";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { countries, getCountryByCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { isSupportedLocale } from "@/lib/content/get-public-page";
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

  const url = `${getSiteUrl()}/${country}/${lang}/book-online`;
  const title = `Book a consultation in ${config.name} · ${SITE_NAME}`;
  const description = `Request an online consultation with a licensed doctor in ${config.name}.`;
  return {
    title,
    description,
    alternates: { canonical: url, languages: hreflangAlternates(config, "/book-online") },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryLangBookOnlinePage({
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

  const data = getBookingPageData(lang === "en" ? "en" : lang);
  const authUser = await getServerAuthUser();
  const signedInPatient =
    authUser && (authUser.role === "PATIENT" || authUser.role === "ADMIN")
      ? {
          fullName: authUser.fullName,
          email: authUser.email,
          phone: authUser.phone,
        }
      : null;
  return <BookingFormTemplate {...data} signedInPatient={signedInPatient} />;
}
