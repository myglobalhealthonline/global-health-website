import { notFound, redirect } from "next/navigation";
import { countries, getCountryByCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";

type Params = { country: string };
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateStaticParams(): Promise<Params[]> {
  return countries.map((c) => ({ country: COUNTRY_CODE_TO_SLUG[c.code] }));
}

/**
 * Country root. Honours `?lang=` from the CountryEntryGate so the visitor's
 * language pick survives the redirect. Falls back to the country's
 * defaultLocale when no query param is present or the requested locale
 * isn't supported by that country.
 */
export default async function CountryHomeRedirect({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { country: slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = getCountryByCode(code);
  if (!config) notFound();

  const requested = typeof sp.lang === "string" ? sp.lang.toLowerCase() : null;
  const requestedSupported =
    requested &&
    config.supportedLocales.some((l) => l.toLowerCase() === requested);
  const lang = requestedSupported
    ? requested
    : (config.defaultLocale ?? "EN").toLowerCase();
  redirect(`/${slug}/${lang}`);
}
