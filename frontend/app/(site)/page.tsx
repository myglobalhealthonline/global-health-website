import type { Metadata } from "next";
import { HomeHero } from "@/components/sections/HomeHero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustSignals } from "@/components/sections/TrustSignals";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { getSiteContext } from "@/lib/content/get-site-context";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Global Health | Medical Clinic | Online Doctor",
  description: "Medical consultations wherever you are. Choose your country and connect with licensed doctors.",
};

export default async function HomePage() {
  const [{ activeCountries }, defaultClinic] = await Promise.all([
    getSiteContext("en"),
    getTemplatePageData("/home", "ie"),
  ]);

  return (
    <>
      <HomeHero countries={activeCountries} />

      <HowItWorks
        title="How does it work?"
        subtitle="Simple Scheduling in 3 Steps"
        steps={defaultClinic.countryHome.steps}
      />

      <TrustSignals
        title="Trusted digital care, country by country"
        subtitle="Healthcare-focused, secure, and structured for local compliance expansion"
        items={defaultClinic.countryHome.trust.items}
      />
      <BookingCTA
        title={defaultClinic.countryHome.booking.title}
        description={defaultClinic.countryHome.booking.description}
        ctaLabel={defaultClinic.countryHome.booking.ctaLabel}
        ctaHref={defaultClinic.countryHome.booking.ctaHref}
        asideImage={defaultClinic.countryHome.booking.asideImage}
      />
    </>
  );
}
