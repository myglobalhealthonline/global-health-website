import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { countries } from "@/data/countries";
import { pageMetadata } from "@/lib/seo/page-seo";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";

export const metadata = pageMetadata("/");

export default async function HomePage() {
  // Compute per-country doctor counts from the DB so the entry gate's "N doctors"
  // line reflects reality (instead of a hand-maintained constant).
  const allDoctors = await getPublicDoctorsNormalized();
  const countryMeta: Record<string, { doctors: number }> = {};
  for (const c of countries) {
    countryMeta[c.code] = {
      doctors: allDoctors.filter((d) => d.countryCode === c.code).length,
    };
  }
  return <CountryEntryGate countries={countries} countryMeta={countryMeta} />;
}
