import { DoctorCard } from "@/components/cards/DoctorCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type DoctorItem = {
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
};

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
};

export function DoctorsSection({ title, intro, doctors }: DoctorsSectionProps) {
  return (
    <Section variant="white">
      <Container>
        {(title || intro) && (
          <div className="mb-12 lg:mb-14">
            {title && (
              <span className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                Our Team
              </span>
            )}
            {title && <h2 className="gh-h2 mt-3 text-[var(--color-text-primary)]">{title}</h2>}
            {intro ? <p className="gh-body-lg mt-3 max-w-2xl text-[var(--color-text-muted)]">{intro}</p> : null}
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.href ?? `${doctor.name}-${doctor.title}`} {...doctor} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
