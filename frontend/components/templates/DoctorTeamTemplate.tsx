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
  /**
   * Whether to render a `BookingCTA` after the doctor card grid.
   * Defaults to `false` — the doctor cards already serve as the primary
   * clinician selection UI, so a generic CTA at the end adds repetition.
   * Set to `true` only when the page has no other booking entry points.
   */
  showBottomCta?: boolean;
};

export function DoctorTeamTemplate({
  countryName,
  doctors,
  bookingHref,
  bookingLabel,
  showBottomCta = false,
}: DoctorTeamTemplateProps) {
  // First doctor is featured; remaining fill the grid.
  const featuredDoctor = doctors[0];
  const remainingDoctors = doctors.slice(1);

  return (
    <>
      <TeamHero countryName={countryName} />

      {featuredDoctor && <FeaturedDoctor doctor={featuredDoctor} />}

      <DoctorsSection
        title={`${countryName} medical team`}
        intro="Review clinician specialties, languages, and registration details before choosing a booking route."
        doctors={remainingDoctors}
      />

      {/* Bottom CTA is opt-in — doctor cards above already provide a selection path. */}
      {showBottomCta ? (
        <BookingCTA
          variant="doctor"
          eyebrow={`${countryName} clinician access`}
          title="Book with the right clinician"
          description="Choose a consultation route after reviewing clinician fit, specialty, and availability."
          ctaLabel={bookingLabel}
          ctaHref={bookingHref}
          density="compact"
          showProofPoints={false}
        />
      ) : null}
    </>
  );
}
