import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { CountrySelector } from "@/components/sections/CountrySelector";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { TrustSignals } from "@/components/sections/TrustSignals";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { BookingCTA } from "@/components/sections/BookingCTA";
import { getSiteContext } from "@/lib/content/get-site-context";

export const metadata: Metadata = {
  title: "Global Health | Medical Clinic | Online Doctor",
  description: "Medical consultations wherever you are. Choose your country and connect with licensed doctors.",
};

export default async function HomePage() {
  const { common, activeCountries, navigation } = await getSiteContext("en");

  return (
    <>
      <HeroSection
        eyebrow="Online Medical Clinic"
        title="Medical Consultations Wherever You Are"
        description="Choose your country and connect with specialized doctors in minutes, fully online and confidential."
        primaryCta={{ label: common.cta.primaryBooking, href: navigation.headerPrimaryCta.href }}
        secondaryCta={{ label: "Select your country", href: "#countries" }}
        trustBadges={["Licensed Doctors", "Secure & Confidential", "Available Across Europe"]}
        heroImage={{
          src: "/images/hero/homepage-hero-placeholder.svg",
          alt: "Global Health homepage hero visual placeholder",
        }}
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
        subtitle="Simple scheduling in 3 steps"
        steps={[
          {
            title: "Choose your location and specialty",
            description: "Select the country where you are located and pick the right medical specialty.",
          },
          {
            title: "Choose the type of consultation",
            description: "Browse consultation options and complete the booking form with your details.",
          },
          {
            title: "Get your confirmation by email",
            description: "Receive your consultation day, time, and access details directly in your inbox.",
          },
        ]}
      />

      <TrustSignals
        title="Trusted by thousands of patients across Europe"
        subtitle="We follow strict European standards for your safety"
        items={[
          {
            title: "4.9/5 average rating",
            description: "Based on 2,000+ patient reviews across supported countries.",
          },
          {
            title: "Licensed doctors",
            description: "All consultations are provided by qualified and registered clinicians.",
          },
          {
            title: "Secure and confidential",
            description: "Your personal data is protected under strict GDPR standards.",
          },
          {
            title: "Fast access",
            description: "Book in minutes and get the care you need without waiting rooms.",
          },
        ]}
      />

      <ServicesGrid
        title="Popular consultations"
        items={[
          {
            title: "General Consultation",
            description: "Speak with a licensed doctor for everyday health concerns and guidance.",
            href: "/general-consultation-ie",
          },
          {
            title: "Specialist Consultation",
            description: "Access specialist doctors for focused evaluation and treatment planning.",
            href: "/specialty-ie",
          },
          {
            title: "Online Prescription",
            description: "Request prescription support quickly through secure online assessment.",
            href: "/online-prescription",
          },
          {
            title: "Home Delivery",
            description: "Get approved medications delivered safely and conveniently to your home.",
            href: "/home-delivery",
          },
          {
            title: "Health Tests",
            description: "Book home health test options and receive guided next steps from doctors.",
            href: "/home-health-test",
          },
          {
            title: "Partner Clinics",
            description: "Explore trusted local clinic partners for additional in-person services.",
            href: "/partner-clinics",
          },
        ]}
      />

      <BookingCTA
        title="Start Your Online Consultation"
        description="Choose your country and connect with a licensed doctor in minutes. 100% online, confidential, and secure."
        ctaLabel="Start consultation"
        ctaHref={navigation.footerCta.href}
      />
    </>
  );
}