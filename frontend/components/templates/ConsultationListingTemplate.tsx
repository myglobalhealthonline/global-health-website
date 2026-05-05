import { BookingCTA } from "@/components/sections/BookingCTA";
import { HeroSection } from "@/components/sections/HeroSection";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { SpecialtiesGrid } from "@/components/sections/SpecialtiesGrid";

type ConsultationListingTemplateProps = {
  title: string;
  description: string;
  mode: "general" | "specialist";
  listing: Array<{ title: string; description: string; href: string }>;
  bookingHref: string;
  bookingLabel: string;
};

export function ConsultationListingTemplate({
  title,
  description,
  mode,
  listing,
  bookingHref,
  bookingLabel,
}: ConsultationListingTemplateProps) {
  const isSpecialist = mode === "specialist";

  return (
    <>
      <HeroSection
        title={title}
        description={description}
        primaryCta={{ href: bookingHref, label: bookingLabel }}
      />
      {isSpecialist ? <SpecialtiesGrid items={listing} /> : <ServicesGrid items={listing} />}
      <BookingCTA
        title="Need help choosing?"
        description="Book first and your clinician can guide you to the right care path."
        ctaLabel={bookingLabel}
        ctaHref={bookingHref}
      />
    </>
  );
}
