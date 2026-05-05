import { BookingCTA } from "@/components/sections/BookingCTA";
import { DoctorsSection } from "@/components/sections/DoctorsSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { TrustSignals } from "@/components/sections/TrustSignals";

type CountryHomeTemplateProps = {
  countryName: string;
  hero: { eyebrow?: string; title: string; description: string };
  primaryBooking: { label: string; href: string };
  services: Array<{ title: string; description: string; href: string }>;
  doctors: Array<{ name: string; title: string; bio: string; href?: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export function CountryHomeTemplate({
  countryName,
  hero,
  primaryBooking,
  services,
  doctors,
  faqs,
}: CountryHomeTemplateProps) {
  return (
    <>
      <HeroSection
        eyebrow={hero.eyebrow}
        title={hero.title}
        description={hero.description}
        primaryCta={primaryBooking}
        secondaryCta={{ label: "Meet the team", href: "#team" }}
      />
      <TrustSignals items={["Licensed clinicians", "Secure digital consultations", `Country hub: ${countryName}`]} />
      <HowItWorks steps={["Select service", "Choose consultation format", "Connect with a licensed clinician"]} />
      <ServicesGrid items={services} />
      <section id="team">
        <DoctorsSection doctors={doctors} />
      </section>
      <FAQSection items={faqs} />
      <BookingCTA
        title="Ready to get started?"
        description="Book an online consultation with your local clinic team."
        ctaLabel={primaryBooking.label}
        ctaHref={primaryBooking.href}
      />
    </>
  );
}
