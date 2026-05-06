import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { TeamHero } from "@/components/sections/TeamHero";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { TrustBar } from "@/components/sections/TrustBar";
import { SocialProof } from "@/components/sections/SocialProof";
import { CountryLinks } from "@/components/sections/CountryLinks";
import { BookingCTA } from "@/components/sections/BookingCTA";

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Array<{
    name: string;
    title: string;
    imcRegistration?: string;
    country?: string;
    languages?: string[];
    whatsappNumber?: string;
    bio: string;
    imageSrc?: string | null;
    href?: string;
    ctaLabel?: string;
  }>;
  bookingHref: string;
  bookingLabel: string;
};

export function DoctorTeamTemplate({ countryName, doctors, bookingHref, bookingLabel }: DoctorTeamTemplateProps) {
  // First doctor is featured
  const featuredDoctor = doctors[0];
  const remainingDoctors = doctors.slice(1);

  return (
    <>
      <TeamHero countryName={countryName} />
      
      {featuredDoctor && (
        <FeaturedDoctor doctor={featuredDoctor} />
      )}
      
      <DoctorsSection
        title={`${countryName} medical team`}
        intro="Clinician profiles and specialties are country-managed through content adapters and future admin data."
        doctors={remainingDoctors}
      />
      
      <TrustBar />
      
      <BookingCTA
        title="Start Your Online Consultation"
        description="Choose your country and connect with a licensed doctor in minutes. 100% online, no waiting rooms, confidential."
        ctaLabel="Start Consultation"
        ctaHref={bookingHref}
      />
      
      <SocialProof />
      
      <CountryLinks />
    </>
  );
}
