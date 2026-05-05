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
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">{title}</h2>
          {intro ? <p className="mt-3 text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">{intro}</p> : null}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={`${doctor.name}-${doctor.title}`} {...doctor} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
