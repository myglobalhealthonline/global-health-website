import { notFound, redirect } from "next/navigation";
import { countries } from "@/data/countries";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { countryCodeFromSlug, countrySlug } from "@/lib/routing/country-slug";

type Params = { country: string };
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateStaticParams(): Promise<Params[]> {
  // Build-time only sees the seeded markets — admin-added countries fall
  // through to dynamic rendering, which is what we want for them anyway.
  return countries.map((c) => ({ country: c.slug }));
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
  // Warm the slug→code registry from live data so admin-added countries
  // are routable even if they aren't in `data/countries.ts`.
  const allCountries = await getPublicCountriesMerged();
  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  const config = allCountries.find((c) => c.code === code);
  if (!config) notFound();
  // Re-derive the canonical slug from the resolved config so the redirect
  // lands on the right URL even if the visitor typed the code (`uk`) when
  // the admin set a friendlier slug (`united-kingdom`).
  const canonicalSlug = config.slug || countrySlug(config.code);

  const requested = typeof sp.lang === "string" ? sp.lang.toLowerCase() : null;
  const requestedSupported =
    requested &&
    config.supportedLocales.some((l) => l.toLowerCase() === requested);
  const lang = requestedSupported
    ? requested
    : (config.defaultLocale ?? "EN").toLowerCase();
  redirect(`/${canonicalSlug}/${lang}`);
}
