import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { countries } from "@/data/countries";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/");

export default function HomePage() {
  return <CountryEntryGate countries={countries} />;
}
