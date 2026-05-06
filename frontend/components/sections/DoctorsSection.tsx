import { DoctorCard } from "@/components/cards/DoctorCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type DoctorItem = {
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
};

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
};

export function DoctorsSection({ title = "Medical team", intro, doctors }: DoctorsSectionProps) {
  return (
    <Section className="bg-[var(--color-background-soft)]">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-primary)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">
            Our Team
          </span>
          <h2 className="gh-h2 mt-4 text-[var(--color-text-primary)]">{title}</h2>
          {intro ? <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{intro}</p> : null}
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.href ?? `${doctor.name}-${doctor.title}`} {...doctor} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
