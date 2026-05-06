import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { CountrySelector } from "@/components/sections/CountrySelector";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustSignals } from "@/components/sections/TrustSignals";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { resolveHomepageHeroAsset } from "@/lib/content/merge-ireland-home-media";
import { getSiteContext } from "@/lib/content/get-site-context";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Global Health | Medical Clinic | Online Doctor",
  description: "Medical consultations wherever you are. Choose your country and connect with licensed doctors.",
};

export default async function HomePage() {
  const [{ common, activeCountries, navigation }, defaultClinic, assets] = await Promise.all([
    getSiteContext("en"),
    getTemplatePageData("/home", "ie"),
    getPublicAssetsNormalized(),
  ]);
  const homepageHero = resolveHomepageHeroAsset(assets);

  return (
    <>
      <HeroSection
        eyebrow="Global Health Platform"
        title="Online Medical Clinic"
        description="Connect with licensed doctors across Europe through secure video consultations. Choose your country and book online in minutes."
        primaryCta={{ label: common.cta.primaryBooking, href: navigation.headerPrimaryCta.href }}
        secondaryCta={{ label: "Select your country", href: "#countries" }}
        trustBadges={["Licensed clinicians", "Secure & confidential", "Same-day availability"]}
        heroImage={
          homepageHero ?? {
            src: "/images/hero/homepage-hero-ai.svg",
            alt: "Illustration of patients and clinicians using secure online healthcare tools",
          }
        }
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
