import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { TeamHero } from "@/components/sections/TeamHero";
import { FeaturedDoctor } from "@/components/sections/FeaturedDoctor";
import { BookingCTA } from "@/components/sections/BookingCTA";

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Array<{
    name: string;
    title: string;
    imcRegistration?: string;
    medicalRegistrationUrl?: string;
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
        intro="Review clinician specialties, languages, and registration details before choosing a booking route."
        doctors={remainingDoctors}
      />

      <BookingCTA
        variant="doctor"
        eyebrow={`${countryName} clinician access`}
        title="Book with the right clinician"
        description="Choose a consultation route after reviewing clinician fit, specialty, and availability."
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />
    </>
  );
}
