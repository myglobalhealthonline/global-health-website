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
    <Section>
      <Container>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
          {intro ? <p className="mt-3 text-base text-slate-600 sm:text-lg">{intro}</p> : null}
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
