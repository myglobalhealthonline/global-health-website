import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { CountrySelector } from "@/components/sections/CountrySelector";
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
  const { common, activeCountries, navigation } = await getSiteContext("en");
  const defaultClinic = await getTemplatePageData("/home", "ie");

  return (
    <>
      <HeroSection
        eyebrow="Global Health Platform"
        title={defaultClinic.countryHome.hero.title}
        description="Choose your country clinic to access local doctors, consultation types, and secure booking routes."
        primaryCta={{ label: common.cta.primaryBooking, href: navigation.headerPrimaryCta.href }}
        secondaryCta={{ label: "Select your country", href: "#countries" }}
        trustBadges={defaultClinic.countryHome.hero.trustBadges}
        heroImage={defaultClinic.countryHome.hero.heroImage}
      />

      <CountrySelector
        countries={activeCountries}
        copy={{
          title: "Select Your Country",
          description: "Choose your location to access local doctors, consultations, and services.",
          enterClinic: "Enter clinic",
        }}
      />

      <HowItWorks
        title="How does it work?"
        subtitle="Same booking journey across all countries"
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
        ctaHref={navigation.footerCta.href}
      />
    </>
  );
}
