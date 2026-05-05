import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { HeroSection } from "@/components/sections/HeroSection";

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Array<{
    name: string;
    title: string;
    country?: string;
    languages?: string[];
    bio: string;
    imageLabel?: string;
    href?: string;
    ctaLabel?: string;
  }>;
  bookingHref: string;
  bookingLabel: string;
};

export function DoctorTeamTemplate({ countryName, doctors, bookingHref, bookingLabel }: DoctorTeamTemplateProps) {
  return (
    <>
      <HeroSection
        eyebrow="Meet your clinicians"
        title={`${countryName} medical team`}
        description="Meet the clinicians supporting patient consultations and follow-up care in this clinic hub."
        primaryCta={{ href: bookingHref, label: bookingLabel }}
        secondaryCta={{ href: "/book-online", label: "Contact clinic" }}
        trustBadges={["Licensed professionals", "Country-specific care", "Clear next steps"]}
      />
      <DoctorsSection
        title={`${countryName} medical team`}
        intro="Clinician profiles and specialties are country-managed through content adapters and future admin data."
        doctors={doctors}
      />
    </>
  );
}
