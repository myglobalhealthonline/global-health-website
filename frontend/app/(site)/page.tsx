import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { pageMetadata } from "@/lib/seo/page-seo";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";

export const metadata = pageMetadata("/");

export default async function HomePage() {
  // getPublicCountriesMerged also warms the slug↔code registry that the
  // synchronous countryCodeFromSlug helpers downstream depend on — don't
  // remove this call without re-routing those callers.
  const countries = await getPublicCountriesMerged();
  const allDoctors = await getPublicDoctorsNormalized();
  const countryMeta: Record<string, { doctors: number }> = {};
  for (const c of countries) {
    countryMeta[c.code] = {
      doctors: allDoctors.filter((d) => d.countryCode === c.code).length,
    };
  }
  return <CountryEntryGate countries={countries} countryMeta={countryMeta} />;
}
