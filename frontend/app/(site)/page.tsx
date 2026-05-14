import type { Metadata } from "next";
import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { countries } from "@/data/countries";

export const metadata: Metadata = {
  title: "Global Health | Medicine without borders",
  description:
    "Choose your country and language to enter your local Global Health clinic. Online consultations with licensed clinicians across Ireland, Czechia, Portugal, Spain, and Romania.",
};

export default function HomePage() {
  return <CountryEntryGate countries={countries} />;
}
