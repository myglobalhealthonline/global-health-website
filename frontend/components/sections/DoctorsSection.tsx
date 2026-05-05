import { DoctorCard } from "@/components/cards/DoctorCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type DoctorItem = { name: string; title: string; bio: string; href?: string };

type DoctorsSectionProps = {
  title?: string;
  intro?: string;
  doctors: DoctorItem[];
};

export function DoctorsSection({ title = "Medical team", intro, doctors }: DoctorsSectionProps) {
  return (
    <Section className="bg-[var(--color-background-soft)]">
      <Container>
        <div className="max-w-2xl">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
          {intro ? <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{intro}</p> : null}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:gap-6">
          {doctors.map((doctor) => (
            <DoctorCard key={`${doctor.name}-${doctor.title}`} {...doctor} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
