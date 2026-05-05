import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { HeroSection } from "@/components/sections/HeroSection";

type DoctorTeamTemplateProps = {
  countryName: string;
  doctors: Array<{ name: string; title: string; bio: string; href?: string }>;
  bookingHref: string;
  bookingLabel: string;
};

export function DoctorTeamTemplate({ countryName, doctors, bookingHref, bookingLabel }: DoctorTeamTemplateProps) {
  return (
    <>
      <HeroSection
        title={`${countryName} medical team`}
        description="Meet clinicians supporting online consultations for this clinic hub."
        primaryCta={{ href: bookingHref, label: bookingLabel }}
      />
      <DoctorsSection doctors={doctors} />
    </>
  );
}
