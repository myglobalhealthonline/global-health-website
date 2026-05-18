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
import {
  getBookingDoctorSummary,
  getDoctorAvailability,
} from "@/lib/content/get-doctor-availability";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; lang: string };
type SearchParams = Record<string, string | string[] | undefined>;

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
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country: slug, lang } = await params;
  const sp = searchParams ? await searchParams : {};
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();
  if (!isSupportedLocale(lang)) notFound();

  const data = getBookingPageData(lang === "en" ? "en" : lang);
  const rawType = typeof sp.type === "string" ? sp.type.trim() : "";
  const allowedTypes = new Set(data.form.consultationTypeOptions.map((o) => o.value));
  const initialConsultationType = allowedTypes.has(rawType) ? rawType : "";
  const authUser = await getServerAuthUser();
  const signedInPatient =
    authUser && (authUser.role === "PATIENT" || authUser.role === "ADMIN")
      ? {
          fullName: authUser.fullName,
          email: authUser.email,
          phone: authUser.phone,
        }
      : null;

  // `?doctor=<slug>` arrives from the doctor profile + the doctor card
  // links across the site. Load the doctor summary + open slots so the
  // booking form can render the slot picker above the patient fields.
  const doctorSlugParam =
    typeof sp.doctor === "string" ? sp.doctor.trim() : null;
  let doctorPrebook = null as
    | NonNullable<Parameters<typeof BookingFormTemplate>[0]["doctorPrebook"]>
    | null;
  if (doctorSlugParam) {
    const [summary, slots] = await Promise.all([
      getBookingDoctorSummary(code, doctorSlugParam),
      getDoctorAvailability(code, doctorSlugParam, 14),
    ]);
    if (summary) {
      doctorPrebook = {
        slug: summary.slug,
        fullName: summary.fullName,
        title: summary.title,
        countryCode: summary.countryCode,
        slots,
      };
    }
  }

  return (
    <BookingFormTemplate
      {...data}
      signedInPatient={signedInPatient}
      doctorPrebook={doctorPrebook}
      initialConsultationType={initialConsultationType}
    />
  );
}
